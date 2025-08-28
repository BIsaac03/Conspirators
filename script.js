import {allActions} from "./static/actions.js";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { gameInProgressError } from "./static/lobby.js";

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
        origin: "http://127.0.0.1:5500",
}
});

io.use((socket, next) => {
    currentID = socket.handshake.auth.token;
    next();
});

let isGameInProgress = false;
let currentID = undefined;
const players = [];

/////////// SERVER EVENTS
io.on("connection", (socket) => {
    const existingPlayer = players.find(player => player.playerID == currentID);
    if (existingPlayer != undefined) {
        socket.emit("reconnection", existingPlayer, players, isGameInProgress);
    }
    else{socket.emit("newPlayer", isGameInProgress);}

    socket.emit("displayExistingPlayers", players);

    socket.on("playerJoinedLobby", (playerID, playerName, playerColor) => {
        if (isGameInProgress){
            socket.emit("gameInProgress");
        }
        else{
            let colorSpecs = [playerColor, false];
            const existingName = players.find(player => player.playerName == playerName);
            const existingPlayer = players.find(player => player.playerID == playerID);
    
            if (existingName != undefined && existingName.playerID != playerID){
                socket.emit("nameTakenError", playerName);
            }
            else if (existingPlayer == undefined){
                const newPlayer = makePlayer([], playerID, playerName, colorSpecs);
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
        const indexToRemove = players.findIndex(player => player.playerID == playerID);
        players.splice(indexToRemove, 1);
        io.emit("playerKicked", playerID);
    })

    socket.on("startGame", () => {
        const alreadyStarted = players.find(player => player.isInGame);
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
        players[playerNum].playedCard = [action, target];
        players[playerNum].isReady = true;

        // remove played card from hand    
        // !!! rests should not be discarded 
        const indexOfSelectedAction = players[playerNum].hand.findIndex(entry => entry[0].name == action.name);
        if (players[playerNum].hand[indexOfSelectedAction][1] == 1){
            players[playerNum].hand.splice(indexOfSelectedAction, 1);
        }
        else{
            players[playerNum].hand[indexOfSelectedAction][1] -= 1;
        }
        socket.emit("updateCards", players, true);
        socket.broadcast.emit("opponentActionChosen", playerNum);

        const keepWaiting = players.find(player => player.isReady == false)
        if (keepWaiting == undefined){
            console.log("reveal");
            io.emit("revealActions", players);
            // ??? make players wait?
            resolveOrderedActions(players);
        }
    })

    socket.on("returnCardsToHand", (playerNum, retrievedCards) => {
        retrievedCards.forEach(card => {
            const discardEntry = players[playerNum].discard.find(entry => entry[0].name == card.name);
            const handEntry = players[playerNum].hand.find(entry => entry[0].name == card.name);

            if (discardEntry[1] == 1){
                const indexToRemove = players[playerNum].discard.findIndex(discardEntry);
                players[playerNum].discard.splice(indexToRemove, 1);
            }
            else{
                discardEntry[1] -= 1;
            }
            
            if (handEntry == undefined){
                players[playerNum].hand.push([card, 1]);
            }
            else{
                handEntry[1] += 1;
            }
        })
        players[playerNum].isReady = true;
        checkEndOfRound();
    })

    socket.on("gaveDonation", (giver, receiver, coins) => {
        giver.numCoins -= coins;
        receiver.numCoins += coins;
        io.emit("notification", receiver.playerNum, giver.playerName+" gave you "+coins+" coins!");
    })

    socket.on("getUpdatedCards", (isHand) => {
        socket.emit("updateCards", players, isHand);
    })
})

httpServer.listen(port, function () {
    var host = httpServer.address().address
    var port = httpServer.address().port
    console.log('App listening at https://%s:%s', host, port)
});

function makePlayer(selectedBAs, ID, name, color){
    const createStartingHand = (selectedBAs) => {
        const steal = allActions.find(action => action.name == "Steal");
        const work = allActions.find(action => action.name == "Work");
        const defend = allActions.find(action => action.name == "Defend");
        const reciprocate = allActions.find(action => action.name == "Reciprocate");
        const rest = allActions.find(action => action.name == "Rest");

        let BA1 = undefined;
        let BA2 = undefined;
        if (selectedBAs.length == 0){
            let variableBAs = allActions.filter(action => action.isVariableBasicAction == "true");
            for (let i = 0; i < 2; i++){
                BA2 = variableBAs.splice(Math.floor(Math.random()*variableBAs.length), 1)[0];
            }
        }
        else{
            BA1 = selectedBAs[0];
            BA2 = selectedBAs[1];
        }
        return [[steal, 3], [work, 3], [defend, 1], [reciprocate, 1], [rest, 1]];
    }

    const hand = createStartingHand(selectedBAs);
    const discard = [];
    let playedCard = undefined;
    let numCardSwaps
    let numCoins = 0;
    let numCoinsInVault = 0;
    let stealResistance = 0;
    const playerNum = players.length;
    const playerID = ID;
    const playerName = name
    const playerColor = color
    let isReady = false;
    let isInGame = false;
    let waitingOn = undefined;

    return {hand, discard, playedCard, numCardSwaps, numCoins, numCoinsInVault, stealResistance, playerNum, playerID, playerName, playerColor, isInGame, isReady, waitingOn}
}

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

function establishWorkValue(playedCards){
    let numWorkers = 0;
    for (let i = 0; i < playedCards.length; i++){
        if (playedCards[0].isWork == true){
            numWorkers++;
        }
    }

    let workValue = playedCards.length - numWorkers + Math.min(1, numWorkers - 1);
    return workValue;
}

function resolveOrderedActions(players){
    //const workValue = establishWorkValue(playedCard);
    // adjust iterations to equal number of IN-GAME ordered cards-1
    for (let i = 1; i < 5; i++){
        players.forEach((player) => {if (player.playedCard[0].priority == i) {
            eval(player.playedCard[0].effect);
        }})
    }
    resolveUnorderedActions(players);
}

function resolveUnorderedActions(players){
    players.forEach((player) => {if (player.playedCard[0].priority == 0) {
        eval(player.playedCard[0].effect);
    }})
    checkEndOfRound()
}

function checkEndOfRound(){
    const waitingOn = players.find(player => player.isReady == false);
    if (waitingOn == undefined){
        roundEndCleanup();
        io.emit("updateStats", players);
        io.emit("updateCards", players, true);
        io.emit("updateCards", players, false);

        if (checkGameEnd() == false){
            players.forEach(player => {
                player.isReady = false;
                player.waitingOn = "selectAction"
            })
            console.log("nextRound")
            io.emit("resetGameDisplay");
            io.emit("selectAction", players);
        }
        else{
        }
    }
}

function checkGameEnd(){
    // !!! should check if end condition met
    return false
}
function work(worker, modification){
    worker.numCoins += (4 + modification); // !!! should vary based on number of workers
}

function steal(stealer, stealFrom, modification){
    const coinsToSteal = Math.min(4 + modification, stealFrom.numCoins); // !!! should vary based on number of steals
    stealer.numCoins += coinsToSteal;
    stealFrom.numCoins -= coinsToSteal;
}

function rest(player, override){
    let numActionsToReturn = Math.ceil(countTotalCards(player.discard)/2);
    if (override != undefined){
        numActionsToReturn = override;
    }
    player.isReady = false;  
    player.waitingOn = "retrieveCards"
    io.emit("retrieveCards", player, numActionsToReturn);
}

function donate(giver, receiver, maxCoins, context){
    const realMaxCoins = Math.min(maxCoins, giver.numCoins);
    io.emit("donate", giver, receiver, realMaxCoins, context)
}

function roundEndCleanup(){
    players.forEach(player => {
        const duplicateActions = player.discard.find(entry => entry[0].name == player.playedCard[0].name)
        if (duplicateActions == undefined){
            player.discard.push([player.playedCard[0], 1]);
        }
        else{
            duplicateActions[1] += 1;
        }
    })
}

function countTotalCards(cards){
    let totalCards = 0;
    cards.forEach(entry => {
        totalCards += entry[1];
    })
    return totalCards;
}