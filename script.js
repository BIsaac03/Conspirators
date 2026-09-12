import {allActions} from "./static/actions.js";
import { Player } from "./static/player.js"

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { gameInProgressError, modifyPlayerList } from "./static/lobby.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/////// SOCKETIO SETUP
const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000 ;

app.use(express.static(__dirname));

app.use("/static", express.static(join(__dirname, 'static')));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

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
        socket.join(`${myGame.getGameDetails().roomCode}`);
        const existingPlayer = myGame.getPlayers().find((player) => player.playerID == currentID);
        socket.emit("reconnection", existingPlayer, myGame.getPlayers(), myGame.getGameDetails().shop, myGame.getGameDetails().gamePhase, myGame.getGameDetails().startPlayer, myGame.getGameDetails().isGameInProgress, myGame.getGameDetails().roomCode);
        socket.emit("displayExistingPlayers", myGame.getPlayers());
    }
    else{
        socket.emit("outsideLobby");
    }

    socket.on("setUpTutorial", (myID) => {
        const shop = createShop("basic");
        const tutorialGame = makeGame("tutorial", shop)
        ongoingGames.push(tutorialGame);

        const BA1 = allActions.find((action) => action.name == "Cooperate");
        const BA2 = allActions.find((action) => action.name == "Prepare");
        
        const me = new Player(myID, "Me", ['#00eeff', false], 0);
        me.createStartingHand([BA1, BA2]);
        me.numCoins += 2;
        tutorialGame.addPlayer(me);
        const opp1 = new Player("testID2", "Grudgie", ['#ff0000', false], 1);
        opp1.createStartingHand([BA1, BA2]);
        opp1.numCoins += 2;
        tutorialGame.addPlayer(opp1)
        const opp2 = new Player("testID3", "Pudgie", ['#ff0000', false], 2);
        opp2.createStartingHand([BA1, BA2]);
        opp2.numCoins += 2;
        tutorialGame.addPlayer(opp2);
        tutorialGame.startGame();
        socket.join("tutorial");
        socket.emit("startTutorial", tutorialGame.getPlayers());
    })
    socket.on("leaveTutorial", (ID) => {
        const indexToRemove = ongoingGames.findIndex((game) => game.getPlayers().find((player) => player.playerID == ID));
        ongoingGames.splice(indexToRemove, 1);
    })
    socket.on("connectToNewLobby", (roomCode) => {
        const existingLobby = ongoingGames.find((game) => game.getGameDetails().roomCode == roomCode);
        if (!existingLobby){
            const shop = createShop("basic");
            const newGame = makeGame(roomCode, shop)
            ongoingGames.push(newGame);
        }
        else{
            if (existingLobby.getGameDetails().isGameInProgress){
                socket.emit("gameInProgress");
            }
            else{
                socket.emit("displayExistingPlayers", existingLobby.getPlayers());
            }     
        }  
    })
    socket.on("playerJoinedLobby", (playerID, playerName, playerColor, roomCode) => {
        const myLobby = ongoingGames.find((game) => game.getGameDetails().roomCode == roomCode);
        if (myLobby.getGameDetails().isGameInProgress){
            socket.emit("gameInProgress");
        }
        else{
            socket.join(`${roomCode}`);
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
                io.to(`${myLobby.getGameDetails().roomCode}`).emit("modifyPlayerList", playerID, playerName, colorSpecs);
            }
            else{
                existingPlayer.playerName = playerName;
                existingPlayer.playerColor = colorSpecs;
                io.to(`${myLobby.getGameDetails().roomCode}`).emit("modifyPlayerList", playerID, playerName, colorSpecs);
            } 
        }
    });

    socket.on("leftLobby", (playerID) => {
        const myLobby = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == playerID));
        const indexToRemove = myLobby.getPlayers().findIndex((player) => player.playerID == playerID);
        myLobby.getPlayers().splice(indexToRemove, 1);
        io.to(`${myLobby.getGameDetails().roomCode}`).emit("playerKicked", playerID);
    })

    socket.on("tutorialRequest", (what, data, ID) => {
        const myLobby = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == ID));
        if (what == "save"){
            myLobby.getPlayers()[0].tutorialPhase = data;
        }
        if (what == "setWaitingOn"){
            myLobby.getPlayers()[0].waitingOn = data;
        }
        if (what == "confirmCard"){
            const action = allActions.find((action) => action.name == data[0]);
            myLobby.getPlayers()[0].confirmAction(action, data[1], data[2]);
        }
        if (what == "setCoins"){
            myLobby.getPlayers()[0].numCoins = data;
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
            })
            myLobby.getGameDetails().isGameInProgress = true;
            roundStart(myLobby);
            io.to(`${roomCode}`).emit("sendToGame");
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
            if (myGame.getGameDetails().gamePhase == "actionSelection"){
                myGame.changeGamePhase("cardSwaps");
                updatePlayerWaitingOn(players, "useCardSwap");
                io.to(`${myGame.getGameDetails().roomCode}`).emit("cardSwapPhase", players);
            }
            else if (myGame.getGameDetails().gamePhase == "cardSwaps"){
                players.forEach(player => {
                    player.isBewitched = false;
                })

                myGame.changeGamePhase("actionResolution");
                io.to(`${myGame.getGameDetails().roomCode}`).emit("revealActions", players);
                setTimeout(() => {
                    determineResolutionOrder(players, myGame.getGameDetails().startPlayer);
                }, 2000)
            }
            
        }
    })

    socket.on("logAttemptedPurchase", (cardsToBuy, myID) => {
        const myGame = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == myID));
        const buyer = myGame.getPlayers().find((player) => player.playerID == myID);
        buyer.cardsToBuy = cardsToBuy;
        buyer.isReady = true;

        attemptPurchase(myGame.getPlayers(), myGame.getGameDetails().startPlayer, myGame.getGameDetails().shop)
    })

    socket.on("returnCardsToHand", (playerNum, retrievedCards, myID) => {
        const myGame = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == myID));
        const players = myGame.getPlayers();
        players[playerNum].retrieveSelectedCards(retrievedCards);
        players[playerNum].isReady = true;

        const me = myGame.getPlayers().find((player) => player.playerID == myID);
        determineResolutionOrder(players, myGame.getGameDetails().startPlayer, me.playerNum);
    })
    socket.on("returnedCooperation", (targetID, cooperatorID, coins) => {
        const myGame = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == targetID));
        const target = myGame.getPlayers().find((player) => player.playerID == targetID);
        const cooperator = myGame.getPlayers().find((player) => player.playerID == cooperatorID);

        target.isReady = true;
        target.numCoins -= coins;
        cooperator.numCoins += coins;
        io.to(`${myGame.getGameDetails().roomCode}`).emit("notification", cooperator.playerNum, target.playerName+" gave you "+coins+" coins!");
        
        determineResolutionOrder(myGame.getPlayers(), myGame.getGameDetails().startPlayer, cooperator.playerNum);
    })

    socket.on("honored", (giverID, receiverID, coins) => {
        const myGame = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == giverID));
        const giver = myGame.getPlayers().find((player) => player.playerID == giverID);
        const receiver = myGame.getPlayers().find((player) => player.playerID == receiverID);
        const honoredCoins = (4 - coins) * 3;

        giver.isReady = true;
        giver.numCoins += coins;
        receiver.numCoins += honoredCoins
        io.to(`${myGame.getGameDetails().roomCode}`).emit("notification", receiver.playerNum, giver.playerName+" gave you "+honoredCoins+" coins!");
    
        determineResolutionOrder(myGame.getPlayers(), myGame.getGameDetails().startPlayer, giver.playerNum);
    })

    socket.on("impersonated", (actionName, myID) => {
        const myGame = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == myID));
        const impersonator = myGame.find((player) => player.playerID == myID);
        const action = allActions.find((action) => action.name == actionName);
        impersonator.playedCard = action;
        impersonator.isImpersonating = true;
        impersonator.isReady = true;

        determineResolutionOrder(myGame.getPlayers(), myGame.getGameDetails().startPlayer, impersonator.playerNum);
    })

    socket.on("finishedRedirecting", (newTargets, myID) => {
        const myGame = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == myID));
        for (let i = 0; i < myGame.getPlayers().length; i++){
            myGame.getPlayers()[i].currentTarget = newTargets[i];
        }

        const me = myGame.getPlayers().find((player) => player.playerID == myID);
        determineResolutionOrder(myGame.getPlayers(), myGame.getGameDetails().startPlayer, me.playerNum);
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
        const bewitch = allActions.find((action) => action.name == "Bewitch");
        const communalize = allActions.find((action) => action.name == "Communalize");
        const curse = allActions.find((action) => action.name == "Curse");
        const hijack = allActions.find((action) => action.name == "Hijack");
        const honor = allActions.find((action) => action.name == "Honor");
        const impersonate = allActions.find((action) => action.name == "Impersonate");
        const pillage = allActions.find((action) => action.name == "Pillage");
        const recruit = allActions.find((action) => action.name == "Recruit");
        const sabotage = allActions.find((action) => action.name == "Sabotage");
        const unionize = allActions.find((action) => action.name == "Unionize");
        const whistle = allActions.find((action) => action.name == "Whistle");
        const sacrifice = allActions.find((action) => action.name == "Sacrifice");
        const accuse = allActions.find((action) => action.name == "Accuse");
        const abduct = allActions.find((action) => action.name == "Abduct");
        const proselytize = allActions.find((action) => action.name == "Proselytize");

        // !! reduced for testing, should start with 4 copies of each
        forSale.push([ransack, 1]);
        forSale.push([honor, 1]);
        forSale.push([hijack, 1]);
        forSale.push([recruit, 1]);
        forSale.push([impersonate, 1]);
        forSale.push([unionize, 1]);
        forSale.push([whistle, 4]);
        forSale.push([communalize, 4]);
        forSale.push([curse, 4]);
        forSale.push([bewitch, 4]);
        forSale.push([sabotage, 4]);
        forSale.push([pillage, 4]);
        forSale.push([sacrifice, 4]);
        forSale.push([accuse, 4]);
        forSale.push([abduct, 4]);
        forSale.push([proselytize, 4]);
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
    const nameOrderedSale = forSale.sort((a, b) => a[0].name.localeCompare(b[0].name));
    const costOrderedSale = nameOrderedSale.sort((a, b) => a[0].cost - b[0].cost);
    const finalOrderedSale = costOrderedSale.sort((a, b) => a[0].isOneShot - b[0].isOneShot)

    return finalOrderedSale;
}

function makeGame(code, actionShop){
    const roomCode = code;
    let gameHasStarted = false;
    const shop = actionShop;
    let gamePhase = undefined;
    let startPlayer = -1;
    let players = [];

    const getPlayers = () => {
        return players;
    }
    const getGameDetails = () => {
        return {
            roomCode,
            gameHasStarted,
            gamePhase,
            startPlayer,
            shop
        }
    };
    const addPlayer = (player) => {
        players.push(player);
    }
    const startGame = () => {
        gameHasStarted = true;
    }
    const changeGamePhase = (newPhase) => {
        gamePhase = newPhase;
    }
    const rotateStartPlayer = (numPlayers) => {
        startPlayer = (startPlayer + 1) % numPlayers;
    }

    return {getPlayers, getGameDetails, addPlayer, startGame, changeGamePhase, rotateStartPlayer}
}

function establishWorkValue(players){
    let workValue = 0;
    let numWorkers = 0;
    players.forEach((player) => {
        if (player.playedCard.isWork){
            numWorkers++;
        }
    })
    switch (numWorkers){
        case 0:
            workValue = 0;
            break;
        case 1: 
            workValue = Math.min(7, players.length + 3);
            break;
        case 2:
            workValue = Math.min(5, players.length + 1);
            break;
        default:
            workValue = players.length + 2 - numWorkers;
    }
    return workValue;
}

function establishStealValue(target, players){
    // thieves steal 4 coins -1 per other thief with the same target (min 2)
    let stealValue = 5;
    for (let i = 0; i < players.length; i++){
        if (players[i].currentTarget == target && players[i].playedCard.isSteal && stealValue > 2){
            stealvalue--;
        }
    }
    return stealValue;
}

function determineResolutionOrder(players, startPlayer, playerNumResolved){
    const turnOrder = players.toSorted((a, b) => {
        if (a.playerNum >= startPlayer && b.playerNum < startPlayer) return -1;
        if (a.playerNum < startPlayer && b.playerNum >= startPlayer) return 1;
        return a - b;
    });
    const priorityOrder = turnOrder.toSorted((a, b) => {
        if (a.playedCard && !b.playedCard) return -1;
        if (!b.playedCard && a.playedCard) return 1;
        return a.playedCard.priority - b.playedCard.priority;
    });
    const playerOrder = priorityOrder.map((player) => player.playerNum);
    console.log(playerOrder);
    resolveActions(players, playerOrder, playerNumResolved, startPlayer);
}

function resolveActions(players, playerOrder, playerNumResolved, startPlayer){
    const myGame = ongoingGames.find((game) => game.getPlayers()[0] == players[0]);
    const workValue = establishWorkValue(players);

    let numToResolve = 0
    // determine how far already progressed in playerOrder 
    if (playerNumResolved != undefined){
        const numResolved = playerOrder.indexOf(playerNumResolved);
        numToResolve = numResolved + 1;
    }
    // resolve actions until player input is required or all actions have been resolved
    while (!players.find((player) => !player.isReady) && numToResolve < playerOrder.length){
        const player = players[playerOrder[numToResolve]];
        if (player.playedCard){
            eval(player.playedCard.effect);
            io.to(`${myGame.getGameDetails().roomCode}`).emit("updateStats", players, startPlayer);
        }
        numToResolve++;
    }
    checkShopPhase(players)
}

function checkShopPhase(players){
    const waitingOn = players.find((player) => !player.isReady);
    if (!waitingOn){
        const myGame = ongoingGames.find((game) => game.getPlayers()[0] == players[0]);
        myGame.changeGamePhase("buyCards");
        updatePlayerWaitingOn(players, "buyCards");
        io.to(`${myGame.getGameDetails().roomCode}`).emit("allowShopPurchases", myGame.getGameDetails().shop, players);
    }
}

function attemptPurchase(players, startPlayer, shop){
    const myGame = ongoingGames.find((game) => game.getPlayers()[0] == players[0]);
    let currentBuyer = players[startPlayer];

    // ensure purchases are resolved in player order in case of limited quantity
    if (myGame.getGameDetails().roomCode == "tutorial"){
        const proselytize = allActions.find((action) => action.name == "Proselytize");
        removeBoughtCardsFromShop([proselytize], shop);
        removeBoughtCardsFromShop(players[0].cardsToBuy, shop);
        players[0].buyCards(players[0].cardsToBuy, 9);
        players[0].cardsToBuy = undefined;
        io.to(`${myGame.getGameDetails().roomCode}`).emit("updateCards", players, shop, "shop", false);
    }
    else{
        while(currentBuyer.isReady){
            if (currentBuyer.cardsToBuy){
                let totalCost = 0;
                for (let i = 0; i < currentBuyer.cardsToBuy.length; i++){
                    const shopContainsAction = shop.find((action) => action[0].name == currentBuyer.cardsToBuy[i].name)
                    if (!shopContainsAction){
                        currentBuyer.isReady = false;
                        io.to(`${myGame.getGameDetails().roomCode}`).emit("notification", currentBuyer.playerNum, "An action you wished to buy has been purchased by a player ahead of you in turn order. Please place a new order.", "error");
                        io.to(`${myGame.getGameDetails().roomCode}`).emit("updateCards", players, shop, "shop", false);
                        return;
                    }
                    totalCost += currentBuyer.cardsToBuy[i].cost;
                }

                if (totalCost > currentBuyer.numCoins){
                    currentBuyer.isReady = false;
                    io.to(`${myGame.getGameDetails().roomCode}`).emit("notification", currentBuyer.playerNum, "You do not have enough coins for the order you placed. Please place a new order.", "error");
                    io.to(`${myGame.getGameDetails().roomCode}`).emit("updateCards", players, shop, "shop", false);
                    return;
                }
                else{
                    removeBoughtCardsFromShop(currentBuyer.cardsToBuy, shop);
                    currentBuyer.buyCards(currentBuyer.cardsToBuy, totalCost, currentBuyer.hasRecruited);
                    currentBuyer.cardsToBuy = undefined;
                    io.to(`${myGame.getGameDetails().roomCode}`).emit("updateCards", players, shop, "shop", false);
                    io.to(`${myGame.getGameDetails().roomCode}`).emit("updateStats", players, startPlayer);

                    if (currentBuyer.playerNum == (startPlayer - 1 + players.length) % players.length){
                        endOfRound(players);
                        return;
                    } 
                }
            }
            currentBuyer = players[(currentBuyer.playerNum + 1) % players.length];
        }
    }
 
}

function removeBoughtCardsFromShop(boughtCards, shop){
    boughtCards.forEach((card) => {
        const shopEntryIndex = shop.findIndex((entry) => entry[0].name == card.name);
        if (shop[shopEntryIndex][1] == 1){
            shop.splice(shopEntryIndex, 1);
        }
        else{
            shop[shopEntryIndex][1]--;
        }
    })
}

function roundStart(myGame){
    const players = myGame.getPlayers();
    players.forEach((player) => {
        player.numCoins += 2;
    })
    myGame.changeGamePhase("actionSelection");
    myGame.rotateStartPlayer(players.length);
    updatePlayerWaitingOn(players, "selectAction");
    io.to(`${myGame.getGameDetails().roomCode}`).emit("updateStats", myGame.getGameDetails().startPlayer);
    io.to(`${myGame.getGameDetails().roomCode}`).emit("selectAction", players);
}

function endOfRound(players){
    const myGame = ongoingGames.find((game) => game.getPlayers()[0] == players[0]);
    roundEndCleanup(players);
    io.to(`${myGame.getGameDetails().roomCode}`).emit("updateStats", players, myGame.getGameDetails().startPlayer);
    io.to(`${myGame.getGameDetails().roomCode}`).emit("updateCards", players, [], "discard", false);
    io.to(`${myGame.getGameDetails().roomCode}`).emit("updateCards", players, [], "hand", false);
    io.to(`${myGame.getGameDetails().roomCode}`).emit("updateCards", players, myGame.getGameDetails().shop, "shop", false);

    if (!checkGameEnd(players)){
        roundStart(myGame);
        io.to(`${myGame.getGameDetails().roomCode}`).emit("resetGameDisplay");
    }
    else{
        // !! add end of game functionality & scoring
    }
}

function checkGameEnd(players){
    players.forEach((player) => {
        if (player.hand.length >= 20){
            return true;
        }
    })
    return false
}

function work(worker, workValue, modification){
    if (!worker.isSabotaged){
        worker.numCoins += Math.max(0, (workValue + modification));
    }
}

function steal(stealer, stealFrom, modification, players){
    const stealValue = establishStealValue(stealFrom, players);
    const coinsToSteal = Math.min(stealValue + modification, stealFrom.numCoins);
    if (!stealFrom.isImmune){
        stealer.numCoins += coinsToSteal;
        stealFrom.numCoins -= coinsToSteal;
    }
}

function cursed(cursed){
    if (cursed.playedCard.isBasicAction){
        cursed.discardPlayedCard();
    }
    else{
        const myGame = ongoingGames.find((game) => game.getPlayers().find((player) => player.playerID == cursed.playerID));
        returnToShop(cursed.playedCard, myGame.getGameDetails().shop);
        cursed.playedCard = undefined;
    }

    // !! update display
}

function returnToShop(action, shop){
    const actionInShop = shop.find((entry) => entry[0].name == action.name);
    if (!actionInShop){
        shop.push([action, 1])
    }
    else{
        actionInShop[1]++;
    }
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
        player.isImmune = false;
        player.hasRecruited = false;
        player.isSabotaged = false;
        player.isAbducted = false;
        player.isImpersonating = false
        player.cooperatingWith = undefined;
    })
}