import {allActions} from "./static/actions.js";
import { Player } from "./static/player.js"

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { gameInProgressError, modifyPlayerList } from "./static/lobby.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/////// SOCKETIO SETUP
const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000 ;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/client.js');
});
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/styles.css');
});

app.use("/static", express.static('./static/'));

const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5500",
}
});

io.use((socket, next) => {
    currentID = socket.handshake.auth.token;
    next();
});

let isGameInProgress = false;
let currentID = undefined;
let currentRoomCode = undefined
const players = [];

/////////// SERVER EVENTS
io.on("connection", (socket) => {
    const existingPlayer = players.find((player) => player.playerID == currentID);
    if (existingPlayer != undefined) {
        socket.emit("reconnection", existingPlayer, players, isGameInProgress, currentRoomCode);
    }
    else{
        socket.emit("sendToMainMenu");
    }

    socket.emit("displayExistingPlayers", players);

    socket.on("createNewLobby", (roomCode) => {
        currentRoomCode = roomCode;
    })
    socket.on("attemptEnterRoom", (roomCode) => {
        if (roomCode == currentRoomCode){
            socket.emit("newPlayer", isGameInProgress, roomCode);
        }
        else{
            // !! add client listener
            socket.emit("InvalidRoomCode");
        }
    })
    socket.on("playerJoinedLobby", (playerID, playerName, playerColor) => {
        if (isGameInProgress){
            socket.emit("gameInProgress");
        }
        else{
            let colorSpecs = [playerColor, false];
            const existingName = players.find((player) => player.playerName == playerName);
            const existingPlayer = players.find((player) => player.playerID == playerID);
    
            if (existingName != undefined && existingName.playerID != playerID){
                socket.emit("nameTakenError", playerName);
            }
            else if (existingPlayer == undefined){
                const newPlayer = new Player(playerID, playerName, colorSpecs, players.length);
                newPlayer.createStartingHand();
                players.push(newPlayer);
                io.emit("modifyPlayerList", playerID, playerName, colorSpecs);
            }
            else{
                existingPlayer.playerName = playerName;
                existingPlayer.playerColor = colorSpecs;
                io.emit("modifyPlayerList", playerID, playerName, colorSpecs);
            } 
        }
    });

    socket.on("leftLobby", (playerID) => {
        const indexToRemove = players.findIndex((player) => player.playerID == playerID);
        players.splice(indexToRemove, 1);
        io.emit("playerKicked", playerID);
    })

    socket.on("startGame", () => {
        const alreadyStarted = players.find((player) => player.isInGame);
        if (alreadyStarted == undefined){
            for (let i = 0; i < players.length; i++){
                players[i].isInGame = true;
                players[i].waitingOn = "selectAction";
            }
            isGameInProgress = true;
            io.emit("createGameSpace", players);
            io.emit("selectAction", players);
        }
    })

    socket.on("chosenAction", (playerNum, action, target) => {
        players[playerNum].confirmAction();
        players[playerNum].isReady = true;

        socket.emit("updateCards", players, true, false);
        socket.broadcast.emit("opponentActionChosen", playerNum);

        const keepWaiting = players.find((player) => player.isReady == false)
        if (keepWaiting == undefined){
            console.log("reveal");
            io.emit("revealActions", players);
            setTimeout(() => {
                resolveOrderedActions(players);
            }, 2000)
        }
    })

    socket.on("returnCardsToHand", (playerNum, retrievedCards) => {
        console.log(retrievedCards);
        players[playerNum].retrieveSelectedCards(retrievedCards);
        players[playerNum].isReady = true;
        checkEndOfRound();
    })

    socket.on("gaveDonation", (giver, receiver, coins) => {
        giver.numCoins -= coins;
        receiver.numCoins += coins;
        io.emit("notification", receiver.playerNum, giver.playerName+" gave you "+coins+" coins!");
    })

    socket.on("getUpdatedCards", (isHand, shouldDisplay) => {
        socket.emit("updateCards", players, isHand, shouldDisplay);
    })
})

httpServer.listen(port, function () {
    var host = httpServer.address().address
    var port = httpServer.address().port
    console.log('App listening at https://%s:%s', host, port)
});

/*
function makeForSale(presetCards){
    const forSale = [];

    if (presetCards != undefined){
        for (let i = 0; i < presetCards.length; i++){
            forSale.push([presetCards[i], 4]);
        }
    }

    else{
        const purchasableActions = allActions.filter(action => action.isBasicAction == "false");
        for (let i = forSale.length; i < 12; i++){
            const uniqueCard = purchasableActions.splice(Math.floor(Math.random()*purchasableActions.length), 1)[0];
            forSale.push([uniqueCard[i], 4]);
        }
    }

    return forSale;
}
*/

function establishWorkValue(players){
    // workers earn 5 coins -1 per other worker
    let workValue = 6;
    for (let i = 0; i < players.length; i++){
        if (players[i].playedCard.isWork){
            workValue--;
        }
    }
    return workValue;
}

function establishStealValue(target, players){
    // thieves steal 4 coins -1 per other thief with the same target
    let stealValue = 5;
    for (let i = 0; i < players.length; i++){
        if (players[i].currentTarget == target && players[i].playedCard.isSteal){
            stealvalue--;
        }
    }
    return stealValue;
}

function resolveOrderedActions(players){
    const workValue = establishWorkValue(players);

    // !! adjust iterations to equal number of IN-GAME ordered cards-1
    for (let i = 1; i < 5; i++){
        players.forEach((player) => {
            if (player.playedCard.priority == i) {
                eval(player.playedCard.effect);
            }
        })
    }
    resolveUnorderedActions(players, workValue);
}

function resolveUnorderedActions(players, workValue){
    players.forEach((player) => {
        if (player.playedCard.priority == 0) {
            eval(player.playedCard.effect);
        }
    })
    checkEndOfRound()
}

function checkEndOfRound(){
    const waitingOn = players.find((player) => player.isReady === false);
    if (!waitingOn){
        roundEndCleanup();
        io.emit("updateStats", players);
        io.emit("updateCards", players, true, false);
        io.emit("updateCards", players, false, false);

        if (!checkGameEnd()){
            players.forEach((player) => {
                player.isReady = false;
                player.waitingOn = "selectAction";
            })
            console.log("nextRound")
            io.emit("resetGameDisplay");
            io.emit("selectAction", players);
        }
        else{
            // !! add end of game functionality & scoring
        }
    }
}

function checkGameEnd(){
    // !!! should check if end condition met
    return false
}

function work(worker, workValue, modification){
    worker.setCoins(workValue + modification);
}

function steal(stealer, stealFrom, modification, players){
    const stealValue = establishStealValue(stealFrom, players);
    const coinsToSteal = Math.min(stealValue + modification, stealFrom.items.numCoins); // !!! should vary based on number of steals
    stealer.setCoins(coinsToSteal, false);
    stealFrom.setCoins(coinsToSteal * -1, false);
}

function donate(giver, receiver, maxCoins, context){
    const realMaxCoins = Math.min(maxCoins, giver.items.numCoins);
    io.emit("donate", giver, receiver, realMaxCoins, context)
}

function roundEndCleanup(){
    players.forEach(player => {
        player.discardPlayedCard();
    })
}