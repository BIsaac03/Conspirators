import {allActions} from "./static/actions.js";

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
const currentRoomCode = (Math.random().toString(36).slice(2, 6)).toUpperCase();
console.log(`Room code: ${currentRoomCode}`);
const players = [];

/////////// SERVER EVENTS
io.on("connection", (socket) => {
    const existingPlayer = players.find((player) => player.getPlayerDetails().playerID == currentID);
    if (existingPlayer != undefined) {
        //console.log(existingPlayer.getPlayerDetails().playerName)
        socket.emit("reconnection", existingPlayer.getPlayerDetails(), existingPlayer.getCards("hand"), existingPlayer.getCurrentAction(), existingPlayer.getPlayerStatus(), players, isGameInProgress);
    }
    else{
        socket.emit("sendToMainMenu");
    }

    socket.emit("displayExistingPlayers", players);

    socket.on("attemptEnterRoom", (roomCode) => {
        if (roomCode == currentRoomCode){
            socket.emit("newPlayer", isGameInProgress);
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
            const existingName = players.find((player) => player.getPlayerDetails().playerName == playerName);
            const existingPlayer = players.find((player) => player.getPlayerDetails().playerID == playerID);
    
            if (existingName != undefined && existingName.playerID != playerID){
                socket.emit("nameTakenError", playerName);
            }
            else if (existingPlayer == undefined){
                const newPlayer = makePlayer(playerID, playerName, colorSpecs);
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
        const indexToRemove = players.findIndex((player) => player.getPlayerDetails().playerID == playerID);
        players.splice(indexToRemove, 1);
        io.emit("playerKicked", playerID);
    })

    socket.on("startGame", () => {
        const alreadyStarted = players.find((player) => player.getPlayerStatus().isInGame);
        if (alreadyStarted == undefined){
            for (let i = 0; i < players.length; i++){
                players[i].isInGame = true;
                players[i].unreadyPlayer("selectAction");
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

        const keepWaiting = players.find((player) => player.getPlayerStatus().isReady == false)
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

function makePlayer(ID, name, color){
    const playerNum = players.length;
    const playerID = ID;
    const playerName = name
    const playerColor = color
    const hand = [];
    const discard = [];
    let playedCard = undefined;
    let currentTarget = undefined;
    let numCardSwaps = 0;
    let numRedirects = 0;
    let numCoins = 0;
    let numCoinsInVault = 0;
    let stealResistance = 0;
    let isInGame = false;
    let isReady = false;
    let waitingOn = undefined;

    const createStartingHand = (selectedBAs) => {
        const steal = allActions.find((action) => action.name == "Steal");
        const work = allActions.find((action) => action.name == "Work");
        const defend = allActions.find((action) => action.name == "Defend");
        const reciprocate = allActions.find((action) => action.name == "Reciprocate");
        const rest = allActions.find((action) => action.name == "Rest");

        hand.push([steal, 3]);
        hand.push([work, 3]);
        hand.push([defend, 2]);
        hand.push([reciprocate, 1]);
        hand.push([rest, 1]);

        if (!selectedBAs){
            let variableBAs = allActions.filter(action => action.isVariableBasicAction == "true");
            for (let i = 0; i < 2; i++){
                const addedBA = variableBAs.splice(Math.floor(Math.random()*variableBAs.length), 1)[0];
                hand.push([addedBA, 1]);
            }
        }
        else{
            hand.push([selectedBAs[0], 1]);
            hand.push([selectedBAs[1], 1]);
        }

    }

    const confirmAction = (card, target) => {
        playedCard = card;
        currentTarget = target;

        const indexOfSelectedAction = hand.findIndex((entry) => entry[0].name == card.name);
        if (hand[indexOfSelectedAction][1] === 1){
            hand.splice(indexOfSelectedAction, 1);
        }
        else{
            hand[indexOfSelectedAction][1]--;
        }
    }
    const discardPlayedCard = () => {
        // return Rest to hand
        if (playedCard.name === "Rest"){
            hand.push([playedCard, 1]);
        }
        // discard other played cards
        else{
            const actionInDiscard = discard.find((action) => action.name === playedCard.name);
            if (!actionInDiscard){
                discard.push([playedCard, 1])
            }
            else{
                actionInDiscard[1]++;
            }
        }
    }

    const prepareToRetrieveCards = (numCardsToRetrieve) => {
        unreadyPlayer("retrieveCards");
        io.emit("retrieveCards", ID, numCardsToRetrieve);
    }
    const retrieveSelectedCards = (cards) => {
        cards.forEach((entry) => {
            const actionInDiscard = discard.find((action) => action.name === entry[0]);
            const actionInHand = hand.find((action) => action.name == entry[0]);
            // remove card from discard
            if (actionInDiscard[1] === entry[1]){
                const index = discard.indexOf(actionInDiscard);
                discard.splice(index, 1);
            }
            else{
                actionInDiscard[1] -= entry[1];
            }
            // add card to hand
            if (!actionInHand){
                hand.push([entry])
            }
            else{
                actionInHand[1] += entry[1];
            }
        })
    }

    const setCoins = (modification, isInVault) => {
        if (isInVault){
            numCoinsInVault += modification;
        }
        else{
            numCoins += modification;
        }
    }
    const setCardSwaps = (modification) => {
        numCardSwaps += modification;
    }
    const setRedirects = (modification) => {
        numRedirects += modification;
    }

    const readyPlayer = () => {
        isReady = true;
    }
    const unreadyPlayer = (ToDo) => {
        isReady = false;
        waitingOn = ToDo;
    }

    const getPlayerDetails = () => {
        return {
            playerNum,
            playerID,
            playerName,
            playerColor
        }
    }
    const getNumCards = (where) => {
        let totalCards = 0;
        if (where === "hand"){
            hand.forEach((entry) => {
                totalCards += entry[1];
            })
        }
        else if (where === "discard"){
            discard.forEach((entry) => {
                totalCards += entry[1];
            })

        }
        return totalCards;
    }
    const getCards = (where) => {
        if (where === "hand"){
            return hand;
        }
        else if (where == "discard"){
            return discard;
        }
    }
    const getItems = () => {
        return{
            numCardSwaps,
            numRedirects,
            numCoins,
            numCoinsInVault
        }
    }
    const getCurrentAction = () => {
        return {
            card: playedCard,
            target: currentTarget
        }
    }
    const getRoundEffects = () => {
        return {
            stealResistance
        }
    }
    const getPlayerStatus = () => {
        return {
            isInGame,
            isReady,
            waitingOn
        }
    }

    return {createStartingHand, confirmAction, discardPlayedCard, prepareToRetrieveCards, retrieveSelectedCards, setCoins, setCardSwaps, setRedirects, readyPlayer, unreadyPlayer, getPlayerDetails, getNumCards, getCards, getItems, getCurrentAction, getRoundEffects, getPlayerStatus}
}

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
        if (players[i].getCurrentAction().card.isWork){
            workValue--;
        }
    }
    return workValue;
}

function establishStealValue(target, players){
    // thieves steal 4 coins -1 per other thief with the same target
    let stealValue = 5;
    for (let i = 0; i < players.length; i++){
        if (players[i].getCurrentAction().target == target && players[i].getCurrentAction().card.isSteal){
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
            if (player.getCurrentAction().card.priority == i) {
                eval(player.getCurrentAction().card.effect);
            }
        })
    }
    resolveUnorderedActions(players, workValue);
}

function resolveUnorderedActions(players, workValue){
    players.forEach((player) => {
        if (player.getCurrentAction().card.priority == 0) {
            eval(player.getCurrentAction().card.effect);
        }
    })
    checkEndOfRound()
}

function checkEndOfRound(){
    const waitingOn = players.find((player) => player.getPlayerStatus().isReady === false);
    if (!waitingOn){
        roundEndCleanup();
        io.emit("updateStats", players);
        io.emit("updateCards", players, true, false);
        io.emit("updateCards", players, false, false);

        if (!checkGameEnd()){
            players.forEach((player) => {
                player.unreadyPlayer("selectAction");
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
    const coinsToSteal = Math.min(stealValue + modification, stealFrom.getItems().numCoins); // !!! should vary based on number of steals
    stealer.setCoins(coinsToSteal, false);
    stealFrom.setCoins(coinsToSteal * -1, false);
}

function donate(giver, receiver, maxCoins, context){
    const realMaxCoins = Math.min(maxCoins, giver.getItems().numCoins);
    io.emit("donate", giver, receiver, realMaxCoins, context)
}

function roundEndCleanup(){
    players.forEach(player => {
        player.discardPlayedCard();
    })
}