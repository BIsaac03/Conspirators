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

let currentID = undefined;
const ongoingGames = [];

/////////// SERVER EVENTS
io.on("connection", (socket) => {
    const myGame = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == currentID));
    if (myGame) {
        const existingPlayer = myGame.getPlayers().find((player) => player.playerID == currentID);
        socket.emit("reconnection", existingPlayer, myGame.getPlayers(), myGame.getGameDetails().shop, myGame.getGameDetails().isGameInProgress, myGame.getGameDetails().roomCode);
        socket.emit("displayExistingPlayers", myGame.getPlayers());
    }
    else{
        socket.emit("sendToMainMenu");
    }

    socket.on("setUpTutorial", (myID) => {
        const shop = createShop("basic");
        const tutorialGame = makeGame("tutorial", shop)
        ongoingGames.push(tutorialGame);

        const BA1 = allActions.find((action) => action.name == "Cooperate");
        const BA2 = allActions.find((action) => action.name == "Prepare");
        
        const me = new Player(myID, "Me", ['#00eeff', false], 0);
        me.createStartingHand([BA1, BA2]);
        tutorialGame.addPlayer(me);
        const opp1 = new Player("testID2", "Opp1", ['#ff0000', false], 1);
        opp1.createStartingHand([BA1, BA2]);
        tutorialGame.addPlayer(opp1)
        const opp2 = new Player("testID3", "Opp2", ['#ff0000', false], 2);
        opp2.createStartingHand([BA1, BA2]);
        tutorialGame.addPlayer(opp2);
        tutorialGame.startGame();
        roundStart(tutorialGame.getPlayers());
        socket.emit("startTutorial", tutorialGame.getPlayers());
    })
    socket.on("leaveTutorial", (ID) => {
        const indexToRemove = ongoingGames.findIndex((game) => game.getPlayers().find((player) => player.playerID == ID));
        ongoingGames.splice(indexToRemove, 1);
    })
    socket.on("createNewLobby", (roomCode) => {
        const shop = createShop("basic");
        const newGame = makeGame(roomCode, shop)
        ongoingGames.push(newGame);
    })
    socket.on("attemptEnterRoom", (roomCode) => {
        const gameToFind = ongoingGames.find((game) => game.getGameDetails().roomCode == roomCode);
        if (gameToFind){
            socket.emit("newPlayer", gameToFind.getGameDetails().isGameInProgress, roomCode);
            socket.emit("displayExistingPlayers", gameToFind.getPlayers());
        }
        else{
            // !! add client listener
            socket.emit("InvalidRoomCode");
        }
    })
    socket.on("playerJoinedLobby", (playerID, playerName, playerColor, roomCode) => {
        const myLobby = ongoingGames.find((game) => game.getGameDetails().roomCode == roomCode);
        if (myLobby.getGameDetails().isGameInProgress){
            socket.emit("gameInProgress");
        }
        else{
            let colorSpecs = [playerColor, false];
            const existingName = myLobby.getPlayers().find((player) => player.playerName == playerName);
            const existingPlayer = myLobby.getPlayers().find((player) => player.playerID == playerID);
    
            if (existingName != undefined && existingName.playerID != playerID){
                socket.emit("nameTakenError", playerName);
            }
            else if (existingPlayer == undefined){
                const newPlayer = new Player(playerID, playerName, colorSpecs, myLobby.getPlayers().length);
                /* random BAs
                let variableBAs = allActions.filter((action) => action.isSecondaryBA == "true");
                for (let i = 0; i < 2; i++){
                    const addedBA = variableBAs.splice(Math.floor(Math.random()*variableBAs.length), 1)[0];
                    this.hand.push([addedBA, 1]);
                }*/
                const BA1 = allActions.find((action) => action.name == "Cooperate");
                const BA2 = allActions.find((action) => action.name == "Prepare");
                newPlayer.createStartingHand([BA1, BA2]);
                myLobby.addPlayer(newPlayer);
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
        const myLobby = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == playerID));
        const indexToRemove = myLobby.getPlayers().findIndex((player) => player.playerID == playerID);
        myLobby.getPlayers().splice(indexToRemove, 1);
        io.emit("playerKicked", playerID);
    })

    socket.on("tutorialRequest", (what, data) => {
        const myLobby = ongoingGames.find((game) => game.getGameDetails().roomCode == "tutorial");
        if (what == "setWaitingOn"){
            myLobby.getPlayers()[0].waitingOn = data;
        }
        if (what == "confirmCard"){
            const action = allActions.find((action) => action.name == "Work");
            myLobby.getPlayers()[0].confirmAction(action, 0, true);
        }
        if (what == "discardCard"){
            myLobby.getPlayers()[0].discardPlayedCard();
        }
    })

    socket.on("startGame", (roomCode) => {
        const myLobby = ongoingGames.find((game) => game.getGameDetails().roomCode == roomCode);
        if (!myLobby.getGameDetails().isGameInProgress){
            myLobby.getPlayers().forEach((player) => {
                player.isInGame = true;
                player.waitingOn = "selectAction";
            })

            myLobby.getGameDetails().isGameInProgress = true;
            roundStart(myLobby.getPlayers());
            io.emit("createGameSpace", myLobby.getPlayers(), myLobby.getGameDetails().shop);
            io.emit("selectAction", myLobby.getPlayers());
        }
    })

    socket.on("chosenAction", (playerNum, action, target, isFinal, myID) => {
        const myGame = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == myID));
        const players = myGame.getPlayers();
        players[playerNum].confirmAction(action, target, isFinal);
        players[playerNum].isReady = true;

        socket.emit("updateCards", players, [], "hand", false);
        socket.broadcast.emit("opponentActionChosen", playerNum);

        const keepWaiting = players.find((player) => !player.isReady)
        if (keepWaiting == undefined){
            if (players[0].waitingOn == "selectAction"){
                updatePlayerWaitingOn(players, "useCardSwap");
                io.emit("cardSwapPhase", players);
            }
            else if (players[0].waitingOn == "useCardSwap"){
                io.emit("revealActions", players);
                setTimeout(() => {
                    resolveOrderedActions(players);
                }, 2000)
            }
            
        }
    })

    socket.on("returnCardsToHand", (playerNum, retrievedCards, myID) => {
        const myGame = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == myID));
        const players = myGame.getPlayers();
        players[playerNum].retrieveSelectedCards(retrievedCards);
        players[playerNum].isReady = true;
        checkEndOfRound(players, myGame.getGameDetails().shop);
    })

    socket.on("gaveDonation", (giver, receiver, coins) => {
        giver.numCoins -= coins;
        receiver.numCoins += coins;
        io.emit("notification", receiver.playerNum, giver.playerName+" gave you "+coins+" coins!");
    })

    socket.on("getUpdatedCards", (where, shouldDisplay, myID) => {
        const myGame = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == myID));
        let isTutorial = false;
        if (myGame.getGameDetails().roomCode == "tutorial"){
            isTutorial = true;
        };
        socket.emit("updateCards", myGame.getPlayers(), myGame.getGameDetails().shop, where, shouldDisplay, isTutorial);
    })
})

httpServer.listen(port, function () {
    var host = httpServer.address().address
    var port = httpServer.address().port
    console.log('App listening at https://%s:%s', host, port)
});


function createShop(type){
    const forSale = [];

    if (type == "basic"){
        // recommended set for first play-through
        const ransack = allActions.find((action) => action.name == "Ransack");
        const bewitch = allActions.find((action) => action.name == "Bewitch!");
        const communalize = allActions.find((action) => action.name == "Communalize");
        const curse = allActions.find((action) => action.name == "Curse");
        const hijack = allActions.find((action) => action.name == "Hijack");
        const honor = allActions.find((action) => action.name == "Honor");
        const impersonate = allActions.find((action) => action.name == "Impersonate");
        const pillage = allActions.find((action) => action.name == "Pillage!");
        const recruit = allActions.find((action) => action.name == "Recruit");
        const sabotage = allActions.find((action) => action.name == "Sabotage!");
        const unionize = allActions.find((action) => action.name == "Unionize");
        const whistle = allActions.find((action) => action.name == "Whistle");

        forSale.push([ransack, 4]);
        forSale.push([honor, 4]);
        forSale.push([hijack, 4]);
        forSale.push([recruit, 4]);
        forSale.push([impersonate, 4]);
        forSale.push([unionize, 4]);
        forSale.push([whistle, 4]);
        forSale.push([communalize, 4]);
        forSale.push([curse, 4]);
        forSale.push([bewitch, 4]);
        forSale.push([sabotage, 4]);
        forSale.push([pillage, 4]);
    }

    else if (type == "random"){
        const purchasablePermanentActions = allActions.filter(action => (!action.isBasicAction && !action.isOneShot));
        const oneShots = allActions.filter(action => action.isOneShot)
        for (let i = 0; i < 3; i++){
            const uniqueCard = oneShots.splice(Math.floor(Math.random()*oneShots.length), 1)[0];
            forSale.push([uniqueCard[i], 4]);
        }
        for (let i = 0; i < 9; i++){
            const uniqueCard = purchasablePermanentActions.splice(Math.floor(Math.random()*purchasablePermanentActions.length), 1)[0];
            forSale.push([uniqueCard[i], 4]);
        }
    }
    const costOrderedSale = forSale.sort((a, b) => a[0].cost - b[0].cost);
    const finalOrderedSale = costOrderedSale.sort((a, b) => b[0].isOneShot - a[0].isOneShot)

    return finalOrderedSale;
}

function makeGame(code, actionShop){
    const roomCode = code;
    const shop = actionShop;
    let gameHasStarted = false;
    let players = [];

    const getPlayers = () => {
        return players;
    }
    const getGameDetails = () => {
        return {
            roomCode,
            gameHasStarted,
            shop
        }
    };
    const addPlayer = (player) => {
        players.push(player);
    }
    const startGame = () => {
        gameHasStarted = true;
    }

    return {getPlayers, getGameDetails, addPlayer, startGame}
}

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
    for (let i = 1; i < 8; i++){
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
    checkEndOfRound(players)
}

function roundStart(players){
    players.forEach((player) => {
        player.numCoins += 2;
    })
}

function checkEndOfRound(players){
    const waitingOn = players.find((player) => !player.isReady);
    if (!waitingOn){
        roundEndCleanup(players);
        io.emit("updateStats", players);
        io.emit("updateCards", players, [], "hand", false);
        io.emit("updateCards", players, [], "discard", false);
        io.emit("updateCards", players, shop, "shop", false);

        if (!checkGameEnd()){
            players.forEach((player) => {
                player.isReady = false;
                player.waitingOn = "selectAction";
            })
            roundStart(players);
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
    worker.numCoins += Math.max(0, (workValue + modification));
}

function steal(stealer, stealFrom, modification, players){
    const stealValue = establishStealValue(stealFrom, players);
    const coinsToSteal = Math.min(stealValue + modification, stealFrom.numCoins); // !!! should vary based on number of steals
    stealer.numCoins += coinsToSteal;
    stealFrom.numCoins -= coinsToSteal;
}

function donate(giver, receiver, maxCoins, context){
    console.log("donation");
    const realMaxCoins = Math.min(maxCoins, giver.numCoins);
    io.emit("donate", giver, receiver, realMaxCoins, context)
}

function updatePlayerWaitingOn(players, newWaitingOn){
    players.forEach((player) => {
        player.waitingOn = newWaitingOn;
        player.isReady = false;
    })
}

function roundEndCleanup(players){
    players.forEach(player => {
        player.discardPlayedCard();
    })
}