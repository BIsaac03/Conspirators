import {allActions} from "./static/actions.js";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

let currentID = undefined;
const players = [];

/////////// SERVER EVENTS
io.on("connection", (socket) => {
    socket.on("joinGame", (playerName, playerColor) => {
        const newPlayer = makePlayer([], playerName, playerColor);
        players.push(newPlayer);
    });

    socket.on("chosenAction", (playerNum, action, target) => {
        players[playerNum].playedCard = [action, target];
        players[playerNum].isReady = true;
    })
})

httpServer.listen(port, function () {
    var host = httpServer.address().address
    var port = httpServer.address().port
    console.log('App listening at https://%s:%s', host, port)
});

function makePlayer(selectedBAs, name, color){
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

        return [[steal, 3], [work, 3], [defend, 1], [reciprocate, 1], [rest, 1], [BA1, 1], [BA2, 1]];
    }

    const hand = createStartingHand(selectedBAs);
    const discard = [];
    let playedCard = undefined;
    let numCardSwaps
    let numCoins = 0;
    let investedCoins = 0;
    let stealResistance = 0;
    const playerNum = players.length;
    let isReady = true;
    const playerName = name
    const playerColor = color

    return {hand, discard, playedCard, numCardSwaps, numCoins, investedCoins, stealResistance, playerNum, playerName, playerColor, isReady}
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
        for (let j = 0; j < players.length; j++)
        if (players[j].playedCards[0].priority == i){
            // !!!! resolve card effects
        }
    }
}

function resolveUnorderedActions(players){
    for (let i = 0; i < players.length; i++){
        const player = players.find(player => player.playerNum == i);
        eval(players[i].effect)
    }
}

function work(worker, modification){
    worker.numCoins += (workValue + modification);
}

function steal(stealer, stealFrom, modification){
    const coinsToSteal = Math.min(4 + modification, stealFrom.numCoins); // should vary based on number of steals
    stealer.numCoins += coinsToSteal;
    stealFrom.numCoins -= coinsToSteal;
}

function rest(player, modification){
    let numActionsToReturn = Math.ceil(player.discard.length/2);
    if (modification == undefined){
        numActionsToReturn = modification;
    }
    // allow player to return up to numActionsToReturn
}

function donate(giver, receiver, maxCoins){

}