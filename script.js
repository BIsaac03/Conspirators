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
            socket.emit("chooseAction", players)
        }
    })

    socket.on("chosenAction", (playerNum, action, target) => {
        players[playerNum].playedCard = [action, target];
        players[playerNum].isReady = true;

        if (!players.some(player => player.isReady == false)){
            io.emit("revealActions", players);
            players.forEach((player) => {player.waitingOn = "actionExecution"; player.isReady = false});
            resolveOrderedActions(players);
        }
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
    let investedCoins = 0;
    let stealResistance = 0;
    const playerNum = players.length;
    const playerID = ID;
    const playerName = name
    const playerColor = color
    let isReady = true;
    let isInGame = false;
    let waitingOn = undefined;

    return {hand, discard, playedCard, numCardSwaps, numCoins, investedCoins, stealResistance, playerNum, playerID, playerName, playerColor, isInGame, isReady, waitingOn}
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
    const workValue = establishWorkValue(playedCard);
    // adjust iterations to equal number of IN-GAME ordered cards-1
    for (let i = 1; i < 5; i++){
        players.forEach((player) => {if (player.playedCard[0].priority == i) {
            eval(player.playedCard[0].effect);
        }})
    }
    resolveUnorderedActions(players);
}

function resolveUnorderedActions(players){
    players.forEach((player) => eval(player.playerdCard[0].effect));
    players.forEach((player) => eval(player.playerdCard[0].effect));
}

function work(worker, modification){
    worker.numCoins += (4 + modification); // !!!!!!!!! should vary based on number of workers
}

function steal(stealer, stealFrom, modification){
    const coinsToSteal = Math.min(4 + modification, stealFrom.numCoins); // !!!!!!!!!!!!!! should vary based on number of steals
    stealer.numCoins += coinsToSteal;
    stealFrom.numCoins -= coinsToSteal;
}

function rest(player, modification){
    let numActionsToReturn = Math.ceil(player.discard.length/2);
    if (modification != undefined){
        numActionsToReturn = modification;
    }
    // allow player to return up to numActionsToReturn
}

function donate(giver, receiver, maxCoins){

}