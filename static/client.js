import { allActions } from "./actions.js";
import * as lobby from "./lobby.js";
import { Player } from "./player.js";

if (document.cookie == ""){
    document.cookie = "userID=p"+crypto.randomUUID();
}
const myID = document.cookie.slice(7);
let myPlayerNum = undefined;

const socket = io("http://localhost:3000", {
    auth: {
        token: myID
    }
});

const bodyElement = document.body;

socket.on("sendToMainMenu", () => {
    displayMainMenu();
})

socket.on("newPlayer", (isGameInProgress, roomCode) => {
    bodyElement.innerHTML = "";
    if (isGameInProgress){
        lobby.gameInProgressError(bodyElement);
    }
    else{
        lobby.createLobby(bodyElement, socket, roomCode);
    }
})

socket.on("reconnection", (reconnectedPlayer, players, shop, isGameInProgress, roomCode) => {
    bodyElement.innerHTML = "";
    if (!reconnectedPlayer.isInGame){
        if (isGameInProgress){
            lobby.gameInProgressError(bodyElement);
        }
        else{
            lobby.createLobby(bodyElement, socket, roomCode);
            for (let i = 0; i < players.length; i++){
                console.log("modify")
                lobby.modifyPlayerList(players[i].playerID, players[i].playerName, players[i].playerColor, socket);
            }
            lobby.joinedLobbyUpdate();
        }
    }
    else{
        myPlayerNum = reconnectedPlayer.playerNum;

        createGameSpace(players);
        createNotificationContainer();
        createStats(players);
        updateStats(players);
        createCardDisplay("player");
        createCardDisplay("shop");
        openClosePlayerDisplay();
        openCloseShopDisplay();
        displayCards(players[reconnectedPlayer.playerNum], reconnectedPlayer.hand, "play");
        displayCards(players[reconnectedPlayer.playerNum], shop, "buy");

        if (!reconnectedPlayer.isReady){
            if (reconnectedPlayer.waitingOn == "selectAction"){
                actionSelection(players, myPlayerNum);
                players.forEach(player => {if (player.isReady){
                    lockInCard(player.playerNum);
                }})
            }
            else if (reconnectedPlayer.waitingOn == "useCardSwap"){
    
            }
            else if (reconnectedPlayer.waitingOn == "retrieveCards"){
                // !!! should store number of retrieved cards
                retrieveCards(reconnectedPlayer, 2);
            }
            else if (reconnectedPlayer.waitingOn == "donate"){
    
            }
            else if (reconnectedPlayer.waitingOn == "purchaseCards"){
    
            }
        }

        // PLAYER IS WAITING ON OTHERS
        else{
            if (reconnectedPlayer.waitingOn == "selectAction"){
                const myPlayedCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
                generateCard(myPlayedCard, reconnectedPlayer.playedCard);
                orientCardToPlayer(myPlayerNum, reconnectedPlayer.currentTarget, players.length);
                players.forEach(player => {if (player.isReady){
                    lockInCard(player.playerNum);
                }})
            }
        }
    } 
})

socket.on("displayExistingPlayers", (players) => {
    for (let i = 0; i < players.length; i++){
        lobby.modifyPlayerList(players[i].playerID, players[i].playerName, players[i].playerColor, socket);
    }
})
socket.on("gameInProgress", () => {
    lobby.gameInProgressError(bodyElement);
})
socket.on("nameTakenError", (duplicateName) => {
    alert("The name \""+duplicateName+"\" is already being used by another player!");
})
socket.on("modifyPlayerList", (playerID, newPlayerName, newPlayerColor) => {
    lobby.modifyPlayerList(playerID, newPlayerName, newPlayerColor, socket);
})
socket.on("playerKicked", (playerID) => {
    const playerList = document.getElementById("playerList");
    const playerDOM = document.getElementById(playerID);
    playerList.removeChild(playerDOM);

    if (document.cookie == playerID){
        const joinGameButton = document.getElementsByClassName("joinGame")[0];
        joinGameButton.value = "Join Game";
        const startGameButton = document.getElementById("startGame");
        startGameButton.style.display = "none";
    }
})

socket.on("createGameSpace", (players, shop) => {
    createGameSpace(players);
    createNotificationContainer();
    createStats(players);
    updateStats(players);
    createCardDisplay("player");
    createCardDisplay("shop");
    openClosePlayerDisplay();
    openCloseShopDisplay();
    displayCards(players[myPlayerNum], players[myPlayerNum].hand, "play");
    displayCards(players[myPlayerNum], shop, "buy");
})
socket.on("selectAction", (players) => {
    actionSelection(players, myPlayerNum);
})
socket.on("opponentActionChosen", (playerNum) => {
    lockInCard(playerNum);
})
socket.on("revealActions", (players) => {
    revealActions(players);
})
socket.on("resetGameDisplay", () => {
    const selectedPlayerIcon = document.getElementById("selectedPlayer");
    selectedPlayerIcon.id = ""
    const playedCards = document.querySelectorAll(`.playedCard`);
    playedCards.forEach(card => {
        card.classList.remove("card");
        card.innerHTML = "";
        const actionBack = document.createElement("img");
        actionBack.src = "/static/Images/Misc/back.png";
        card.appendChild(actionBack);
        card.style.opacity = "0.5";
        card.style.transform = 'rotate(-90deg)';
        card.style.border = "3px dashed cyan";
    })
})
socket.on("retrieveCards", (player, numCardsToRetrieve) => {
    console.log("attemptRetrieval")
    if (player.playerNum == myPlayerNum){
        retrieveCards(player, numCardsToRetrieve);
    }
})
socket.on("donate", (giver, receiver, maxCoins, context) => {
    console.log("checkdonation");
    const donationScreen = document.createElement("div");
    donationScreen.id = "donationScreen";

    const contextMessage = document.createElement("p");
    contextMessage.id = "donationContext";
    contextMessage.textContent = context;

    if (myPlayerNum == giver.playerNum){
        const donationEntry = document.createElement("input");
        donationEntry.type = "number";
        donationEntry.max = maxCoins;
        donationScreen.appendChild(donationEntry);

        const submit = document.createElement("button");
        submit.id = "submit";
        submit.addEventListener("click", () => {
            if (donationEntry.value >= 0 && donationEntry.value <= maxCoins){
                socket.emit("gaveDonation", giver, receiver, donationEntry.value);
            }
        })
        donationScreen.appendChild(submit);
    }

    donationScreen.appendChild(contextMessage);
    bodyElement.appendChild(donationScreen);
})
socket.on("updateStats", (players) => {
    updateStats(players);
})

socket.on("updateCards", (players, isHand, shouldDisplay) => {
    if (shouldDisplay){
        openRelevantDisplay(players[myPlayerNum], isHand);
    }
    else{
        displayCards(players[myPlayerNum], players[myPlayerNum].hand, "play")
    }
})

socket.on("notification", (playerNum, notification) => {
    if (playerNum == myPlayerNum){
        displayNotification(notification);
    }
})

function displayMainMenu(){
    document.body.innerHTML = "";
    const mainMenu = document.createElement("div");
    mainMenu.id = "mainMenu";

    const title = document.createElement("p");
    title.textContent = "Conspirators";
    mainMenu.appendChild(title);

    const options = document.createElement("div");
    options.id = "options";
    mainMenu.appendChild(options);

    const createLobby = document.createElement("button");
    createLobby.textContent = "Create New Lobby";
    createLobby.addEventListener("click", () => {
        const roomCode = (Math.random().toString(36).slice(2, 6)).toUpperCase();
        socket.emit("createNewLobby", roomCode);
        lobby.createLobby(bodyElement, socket, roomCode);
        mainMenu.remove();
    })
    options.appendChild(createLobby);

    const joinLobby = document.createElement("button");
    joinLobby.textContent = "Join an existing lobby";
    joinLobby.addEventListener("click", () => {
        const existingPopUp = document.getElementById("roomCodePopUp");
        if (!existingPopUp){
            const roomCodePopUp = document.createElement("div");
            roomCodePopUp.id = "roomCodePopUp"

            const roomCodeEntry = document.createElement("input");
            roomCodeEntry.setAttribute("placeholder", "Room Code");
            roomCodeEntry.setAttribute("type", "text");
            roomCodeEntry.setAttribute("maxlength", "4");
            roomCodePopUp.appendChild(roomCodeEntry);

            const attemptJoinButton = document.createElement("button");
            attemptJoinButton.textContent = "Join"
            attemptJoinButton.addEventListener("click", () => {
                if (roomCodeEntry.value.length == 4){
                    socket.emit("attemptEnterRoom", roomCodeEntry.value);
                }
            })
            roomCodePopUp.appendChild(attemptJoinButton);

            options.appendChild(roomCodePopUp);
        }
        else{
            existingPopUp.remove();
        }
    })
    options.appendChild(joinLobby);

    const tutorial = document.createElement("button");
    tutorial.textContent = "Tutorial";
    tutorial.addEventListener("click", () => {
        const testDisplay = document.createElement("div");
        testDisplay.id = "testCard";
        bodyElement.appendChild(testDisplay);
        const card = allActions.find((card) => card.name == "Communalize")
        generateCard(testDisplay, card)
        // !! add tutorial
        mainMenu.remove();
    })
    options.appendChild(tutorial);

    bodyElement.appendChild(mainMenu);
}

function calculateNumCards(where){
    let totalCards = 0;
        where.forEach((entry) => {
            totalCards += entry[1];
        })
    return totalCards;
}

function calculateTargetAngle(myPlayerNum, targetPlayerNum, numPlayers){
    // NUMS GET BIGGER CLOCKWISE
    const totalInsideAngle = Math.PI * (numPlayers - 2);
    const totalPlayerSelectionAngle = totalInsideAngle / numPlayers;
    const angleModPerPlayer = totalPlayerSelectionAngle / (numPlayers - (numPlayers % 2));  
    
            // CALCULATIONS
            // (myPlayerNum + X) % numPlayers == targetPlayerNum
            // myPlayerNum + X == numPlayers*k + targetPlayerNum
            // X = numPlayers*k + targetPlayerNum - myPlayerNum
    let distanceClockwise = undefined;
    if (numPlayers*0 + targetPlayerNum - myPlayerNum > 0){
        distanceClockwise = numPlayers*0 + targetPlayerNum - myPlayerNum;
    }
    else {
        distanceClockwise = numPlayers*1 + targetPlayerNum - myPlayerNum;
    }
    const playersOffCenter = distanceClockwise - numPlayers/2;
    const targetAngle =  2*playersOffCenter*angleModPerPlayer;

    return targetAngle;
}

function orientCardToPlayer(originPlayerNum, targetPlayerNum, numPlayers){
    const playedCard = document.querySelector(`#player${originPlayerNum} .playedCard`);
    const targetAngle = calculateTargetAngle(originPlayerNum, targetPlayerNum, numPlayers);
    playedCard.style.transform = "translateY("+(-30*Math.sin(targetAngle)+2*Math.sign(targetAngle))+"vh) translateX("+(20*(1-Math.cos(targetAngle))+2)+"vh)  rotate("+(targetAngle-Math.PI/2)+"rad)";       
}

function createGameSpace(players){
    const thisPlayer = players.find((player) => player.playerID == myID);
    myPlayerNum = thisPlayer.playerNum;
    
    bodyElement.innerHTML = "";
    const gameSpace = document.createElement("div");
    gameSpace.id = "gameSpace";

    const radianOffset = Math.PI/2 - myPlayerNum*2*Math.PI/players.length;
    for (let i = 0; i < players.length; i++){
        const playerSpace = document.createElement("div");
        playerSpace.id = "player"+i;
        playerSpace.style.transform = "rotate("+(2*Math.PI * i/players.length + radianOffset)+"rad) translateX(25vh)"; 

        const playerIcon = document.createElement("div");
        playerIcon.classList.add("playerIcon");

        const playedCard = document.createElement("div");
        playedCard.classList.add("playedCard");
        const actionBack = document.createElement("img");
        actionBack.src = "/static/Images/Misc/back.png";
        playedCard.appendChild(actionBack);
        playedCard.style.opacity = "0.5";
        playedCard.style.transform = 'translateX(2vh) rotate(-90deg)';

        if (i == myPlayerNum){
            playedCard.addEventListener("click", () => {
                const waitingOnCard = document.getElementById("confirm");
                if (waitingOnCard != undefined){
                    openRelevantDisplay(players[i], true);
                }
            })
        }

        playedCard.addEventListener("mouseenter", () => {
            // blow up played cards on hover
            if (!playedCard.querySelector(`img[src="/static/Images/Misc/back.png"`)){
                setTimeout(() => {
                    if (playedCard.matches(":hover")){
                        const blownUpAction = document.createElement("div");
                        blownUpAction.id = "blownUp";
                        const action = allActions.find((card) => card.name == playedCard.getAttribute("action"))
                        generateCard(blownUpAction, action);

                        if (i == myPlayerNum){
                            blownUpAction.addEventListener("click", () => {
                                const waitingOnCard = document.getElementById("confirm");
                                if (waitingOnCard != undefined){
                                    openRelevantDisplay(players[i], true);
                                }
                            })
                        }
                        bodyElement.appendChild(blownUpAction);

                        playedCard.style.opacity = 0.3;
                        playedCard.addEventListener("mouseleave", () => {
                            const blownUpAction = document.getElementById("blownUp");
                            if (blownUpAction && !blownUpAction.matches(":hover")){
                                playedCard.style.opacity = 1.0;
                                blownUpAction.remove();
                            }
                        })
                        blownUpAction.addEventListener("mouseleave", () => {
                            if (!playedCard.matches(":hover")){
                                playedCard.style.opacity = 1.0;
                                blownUpAction.remove();
                            }
                        })
                    }
                }, 250)
                
            }
        })
        playerSpace.appendChild(playedCard);
        playerSpace.appendChild(playerIcon);

        gameSpace.appendChild(playerSpace);
    }
    bodyElement.appendChild(gameSpace);
}

function createNotificationContainer(){
    const notificationContainer = document.createElement("div");
    notificationContainer.id = "notificationContainer";
    bodyElement.appendChild(notificationContainer);
}

function generateCard(div, card){
    div.innerHTML = "";
    div.classList.add("card");
    if (card.isOneShot){
        div.classList.add("oneShot");
    }

    const name = document.createElement("p");
    name.innerHTML = card.name;
    name.classList.add("name")
    const text = document.createElement("p");
    text.innerHTML = card.text;
    text.classList.add("text");
        
    const cost = document.createElement("p");
    cost.classList.add("cost");
    cost.textContent = card.cost;

    const priority = document.createElement("p");
    priority.classList.add("priority");
    priority.textContent = card.priority;

    const background = document.createElement("img");
    background.classList.add("background");
    background.src = card.background;

    div.appendChild(name);
    div.setAttribute('action', card.name);
    div.appendChild(text);
    if (card.cost != 0){
        div.appendChild(cost);
    }
    if (card.priority != 0){
        div.appendChild(priority);
    }
        
    div.appendChild(background);
}

function createCardDisplay(type){
    const actionDisplayDiv = document.createElement("div");

    const displayVisibilityToggle = document.createElement("div");
    const sliderIcon = document.createElement("img");
    sliderIcon.classList.add("sliderIcon");
    displayVisibilityToggle.appendChild(sliderIcon);
    actionDisplayDiv.appendChild(displayVisibilityToggle);


    const actionSelection = document.createElement("div");
    actionSelection.classList.add("actionSelection");
    actionDisplayDiv.appendChild(actionSelection);

    if (type == "player"){
        actionDisplayDiv.id = "playerDisplayDiv";
        displayVisibilityToggle.id = "playerDisplayVisibilityToggle";
        sliderIcon.src = "/static/Images/Icons/leftArrows.svg";
        displayVisibilityToggle.addEventListener("click", openClosePlayerDisplay);

        const discardToggleDiv = document.createElement("div");
        discardToggleDiv.id = "discardToggleDiv";
        discardToggleDiv.classList.add("cardLocationToggle");
        discardToggleDiv.style.backgroundColor ="rgba(110, 110, 110, 0.83)";
        const discardToggle = document.createElement("button");
        discardToggle.textContent = "Discard"
        discardToggleDiv.addEventListener("click", () => {
            socket.emit("getUpdatedCards", false, true, myID);
        })
        discardToggleDiv.appendChild(discardToggle);

        const handToggleDiv = document.createElement("div");
        handToggleDiv.id = "handToggleDiv";
        handToggleDiv.classList.add("cardLocationToggle");
        handToggleDiv.style.backgroundColor ="rgba(0, 0, 0, 0.83)";
        const handToggle = document.createElement("button");
        handToggle.textContent = "Hand";
        handToggleDiv.addEventListener("click", () => {
            socket.emit("getUpdatedCards", true, true, myID);
        })
        handToggleDiv.appendChild(handToggle);

        const cardLocationToggle = document.createElement("div");
        cardLocationToggle.id = "cardLocationToggle";
        cardLocationToggle.appendChild(discardToggleDiv);
        cardLocationToggle.appendChild(handToggleDiv);
        actionDisplayDiv.appendChild(cardLocationToggle);

        actionSelection.classList.add("play");
    }

    else if (type == "shop"){
        actionDisplayDiv.id = "shopDisplayDiv";
        displayVisibilityToggle.id = "shopDisplayVisibilityToggle";
        sliderIcon.src = "/static/Images/Icons/rightArrows.svg";
        displayVisibilityToggle.addEventListener("click", openCloseShopDisplay);
        actionSelection.classList.add("buy");

        const displayLabel = document.createElement("div");
        displayLabel.classList.add("shopLabel");
        const labelText = document.createElement("p");
        labelText.textContent = "Shop";
        displayLabel.appendChild(labelText);
        actionDisplayDiv.appendChild(displayLabel);
    }

    bodyElement.appendChild(actionDisplayDiv);
}

function openCloseShopDisplay(){
    const actionDisplayDiv = document.getElementById("shopDisplayDiv");
    const sliderIcon = document.querySelector(`#shopDisplayVisibilityToggle img`);
    if (sliderIcon.src.includes("/static/Images/Icons/leftArrows.svg")){
        actionDisplayDiv.style.right = "0vh";
        actionDisplayDiv.style.left = "";
        sliderIcon.src = "/static/Images/Icons/rightArrows.svg";
    }
    else if (sliderIcon.src.includes("/static/Images/Icons/rightArrows.svg")){
        actionDisplayDiv.style.left = "calc(100vw - 5vh)";
        actionDisplayDiv.style.right = "";
        sliderIcon.src = "/static/Images/Icons/leftArrows.svg";
    }
}

function openClosePlayerDisplay(){
    const actionDisplayDiv = document.getElementById("playerDisplayDiv");
    const sliderIcon = document.querySelector(`#playerDisplayVisibilityToggle img`);
    if (sliderIcon.src.includes("/static/Images/Icons/rightArrows.svg")){
        actionDisplayDiv.style.left = "0vw";
        actionDisplayDiv.style.right = "";
        sliderIcon.src = "/static/Images/Icons/leftArrows.svg";
    }
    else if (sliderIcon.src.includes("/static/Images/Icons/leftArrows.svg")){
        actionDisplayDiv.style.right = "calc(100vw - 4vh)";
        actionDisplayDiv.style.left = "";
        sliderIcon.src = "/static/Images/Icons/rightArrows.svg";
    }
}

function openRelevantDisplay(player, isHand){
    const discardToggleDiv = document.getElementById("discardToggleDiv");
    const handToggleDiv = document.getElementById("handToggleDiv");
    const sliderIcon = document.querySelector(`#playerDisplayDiv .sliderIcon`);
    if (isHand){
        handToggleDiv.style.backgroundColor ="rgba(0, 0, 0, 0.83)";
        discardToggleDiv.style.backgroundColor ="rgba(110, 110, 110, 0.83)";     
        displayCards(player, player.hand, "play");
    }
    else{
        handToggleDiv.style.backgroundColor ="rgba(110, 110, 110, 0.83)";
        discardToggleDiv.style.backgroundColor ="rgba(0, 0, 0, 0.83)";
        displayCards(player, player.discard, "play");
    }
    if (sliderIcon.src.includes("/static/Images/Icons/rightArrows.svg")){
        openClosePlayerDisplay();
    }
}

function displayCards(player, cardsToDisplay, why){
    const actionSelection = document.querySelector(`.actionSelection.${why}`);
    actionSelection.innerHTML = "";
    console.log(cardsToDisplay);
    console.log(why);

    for (let i = 0; i < cardsToDisplay.length; i++){
        const actionDiv = document.createElement("div");
        const possibleAction = document.createElement("div");
        
        const card = allActions.find((card) => card.name == cardsToDisplay[i][0].name)
        generateCard(possibleAction, card)
        possibleAction.addEventListener("click", () => {
            if (JSON.stringify(cardsToDisplay) == JSON.stringify(player.hand) && !player.isReady && player.waitingOn == "selectAction"){
                const previousSelection = document.getElementById("selectedCard");
                if (previousSelection != undefined){
                    previousSelection.id = "";
                }
                actionDiv.id = "selectedCard";

                const myPlayedCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
                generateCard(myPlayedCard, cardsToDisplay[i][0]);
                openClosePlayerDisplay();
            }
            if (cardsToDisplay == player.discard && player.isReady == false && player.waitingOn == "retrieveCards"){
                const remainingRetrievals = document.getElementById("remainingRetrievals");
                const numDuplicateRetrievals = document.querySelector(`.retrieveIcon p.num${i}`);

                if (numDuplicateRetrievals == undefined && remainingRetrievals.textContent > 0){
                    const retrieveIcon = document.createElement("div");
                    retrieveIcon.classList.add("retrieveIcon");
                    const numDuplicateRetrievals = document.createElement("p");
                    numDuplicateRetrievals.classList.add(`num${i}`);
                    retrieveIcon.appendChild(numDuplicateRetrievals);
                    actionDiv.appendChild(retrieveIcon);
                    numDuplicateRetrievals.textContent = 1;
                    remainingRetrievals.textContent = Number(remainingRetrievals.textContent) - 1;
                }
                else if (numDuplicateRetrievals != undefined){
                    if (cardsToDisplay[i][1] > numDuplicateRetrievals.textContent && remainingRetrievals.textContent > 0){
                        numDuplicateRetrievals.textContent = Number(numDuplicateRetrievals.textContent) + 1;
                        remainingRetrievals.textContent = Number(remainingRetrievals.textContent) - 1;
                    }
                    else{
                        remainingRetrievals.textContent = Number(remainingRetrievals.textContent) + Number(numDuplicateRetrievals.textContent);
                        numDuplicateRetrievals.parentNode.remove();
                    } 
                }
            }
        })

        const numberOfAction = document.createElement("p");
        numberOfAction.classList.add("numberOfActions");
        numberOfAction.textContent = "x"+cardsToDisplay[i][1];
        actionDiv.appendChild(possibleAction);
        actionDiv.appendChild(numberOfAction);
        actionSelection.appendChild(actionDiv);
    }
}

function actionSelection(players, playerNum){
    openRelevantDisplay(players[playerNum], true);
    let targetPlayerNum = undefined;
    const myCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
    myCard.style.opacity = "1";

    for (let i = 0; i < players.length; i++){
        if (i != myPlayerNum){
            const playerIcon = document.querySelector(`#player${i} .playerIcon`);
            playerIcon.addEventListener("mouseenter", () => {
                if (targetPlayerNum == undefined){
                    orientCardToPlayer(myPlayerNum, i, players.length);
                }
            })
            playerIcon.addEventListener("click", () => {
                if (targetPlayerNum == undefined){
                    myCard.style.border = "3px solid black";
                    playerIcon.id = "selectedPlayer";
                    targetPlayerNum = i;
                }
                else if (targetPlayerNum == i){
                    myCard.style.border = "3px dashed cyan";
                    playerIcon.id = "";
                    targetPlayerNum = undefined;
                }
                else{
                    const previousSelection = document.getElementById("selectedPlayer");
                    previousSelection.id = "";
                    playerIcon.id = "selectedPlayer";
                    
                    orientCardToPlayer(myPlayerNum, i, players.length);
                    targetPlayerNum = i;
                }
            })
        }
    }

    const confirm = document.createElement("button");
    confirm.id = "confirm";
    confirm.textContent = "Confirm";
    confirm.addEventListener("click", () => {
        const actionToPlayDOM = document.querySelector("#selectedCard img");
        if (actionToPlayDOM != undefined && targetPlayerNum != undefined){
            const actionToPlay = players[myPlayerNum].hand.find((action) => actionToPlayDOM.src.includes(action[0].background));
            socket.emit("chosenAction", myPlayerNum, actionToPlay[0], targetPlayerNum, myID);

            // remove card-orienting event listeners
            for (let i = 0; i < players.length; i++){
                if (i != myPlayerNum){
                    const oldPlayerIcon = document.querySelector(`#player${i} .playerIcon`);
                    var newPlayerIcon = oldPlayerIcon.cloneNode(true);
                    oldPlayerIcon.parentNode.replaceChild(newPlayerIcon, oldPlayerIcon);
                }
            }
            confirm.remove();
        }  
    })
    bodyElement.appendChild(confirm);
}

function lockInCard(playerNum){
    const playerCard = document.querySelector(`#player${playerNum} .playedCard`);
    playerCard.style.opacity = "1";
    playerCard.style.border = "3px solid black";
}

function revealActions(players){
    players.forEach((player) => {
        const playedCard = document.querySelector(`#player${player.playerNum} .playedCard`);
        generateCard(playedCard, player.playedCard);
        orientCardToPlayer(player.playerNum, player.currentTarget, players.length);
    })
}

function retrieveCards(player, numCardsToRetrieve){
    openRelevantDisplay(player, false);

    const retrieveDiv = document.createElement("div");
    retrieveDiv.id = "retrieveDiv";

    const remainingRetrievals = document.createElement("p");
    remainingRetrievals.id = "remainingRetrievals"
    remainingRetrievals.textContent = numCardsToRetrieve;

    const confirm = document.createElement("button");
    confirm.id = confirm;
    confirm.addEventListener("click", () => {
        const retrievedActions = document.querySelectorAll(".retrieveIcon p");
        const totalRetrievedCards = [];
        retrievedActions.forEach(action => {
            for (let i = 0; i < action.textContent; i++){
                const returnedAction = player.discard.find((card) => card[0].background.includes(`${action.parentElement.parentElement.src}`));
                totalRetrievedCards.push(returnedCard);
            }
        })
        if (totalRetrievedCards.length == numCardsToRetrieve){
            socket.emit("returnCardsToHand", myPlayerNum, totalRetrievedCards, myID);
        }
    })
    retrieveDiv.appendChild(remainingRetrievals);
    retrieveDiv.appendChild(confirm);
    bodyElement.appendChild(retrieveDiv);
}

function createStats(players){
    for (let i = 0; i < players.length; i++){
        const statsDisplay = document.querySelector(`#player${i} .playerIcon`);
        statsDisplay.classList.add("statsDisplay");

        const playerName = document.createElement("p");
        playerName.textContent = players[(myPlayerNum + i)%players.length].playerName;
        playerName.style.color = players[(myPlayerNum + i)%players.length].playerColor[0];
        playerName.classList.add("playerName");

        const coinsIcon = document.createElement("img");
        coinsIcon.src = "static/Images/Icons/coins.svg";
        const numCoins = document.createElement("p");
        numCoins.classList.add("numCoins");
        
        const cardSwapDiv = document.createElement("div");
        const cardSwapIcon = document.createElement("img");
        cardSwapIcon.src = "static/Images/Icons/cardSwap.svg";
        const numCardSwaps = document.createElement("p");
        numCardSwaps.classList.add("numCardSwaps");
        cardSwapDiv.appendChild(cardSwapIcon);
        cardSwapDiv.appendChild(numCardSwaps);

        const redirectDiv = document.createElement("div");
        const redirectIcon = document.createElement("img");
        redirectIcon.src = "static/Images/Icons/redirect.svg";
        redirectIcon.style.transform = "rotate(110deg)";
        const numRedirects = document.createElement("p");
        numRedirects.classList.add("numRedirects");
        redirectDiv.appendChild(redirectIcon);
        redirectDiv.appendChild(numRedirects);

        const handDiv = document.createElement("div");
        const handIcon = document.createElement("img");
        handIcon.src = "static/Images/Icons/hand.svg";
        const numCardsInHand = document.createElement("p");
        numCardsInHand.classList.add("handNum");
        handDiv.appendChild(handIcon);
        handDiv.appendChild(numCardsInHand);

        const discardDiv = document.createElement("div");
        const discardIcon = document.createElement("img");
        discardIcon.src = "static/Images/Icons/discard.svg";
        discardIcon.style.transform = 'rotate(90deg)';
        const numCardsInDiscard = document.createElement("p");
        numCardsInDiscard.classList.add("discardNum");
        discardDiv.appendChild(discardIcon);
        discardDiv.appendChild(numCardsInDiscard);

        const vaultIcon = document.createElement("img");
        vaultIcon.src = "static/Images/Icons/safe.svg";
        const numCoinsInVault = document.createElement("p");
        numCoinsInVault.classList.add("numCoinsInVault");

        statsDisplay.appendChild(playerName);
        statsDisplay.appendChild(handDiv);
        statsDisplay.appendChild(discardDiv);
        //statsDisplay.appendChild(coinsIcon);
        //statsDisplay.appendChild(numCoins);
        statsDisplay.appendChild(cardSwapDiv);
        statsDisplay.appendChild(redirectDiv);
        
        
        //statsDisplay.appendChild(vaultIcon);
        //statsDisplay.appendChild(numCoinsInVault)
        
        const playerDiv = document.getElementById(`player${i}`);
        const playerRotation = playerDiv.style.transform.trim().split(/[()]\s*/)[1].slice(0, -3);
        const counterRotation = eval(playerRotation) * -1;

        statsDisplay.style.transform = `rotate(${counterRotation}rad)`;
    }
}

function updateStats(players){
    for (let i = 0; i < players.length; i++){
        const numCardsInHand = document.querySelector(`#player${i} .statsDisplay .handNum`);
        numCardsInHand.textContent = calculateNumCards(players[i].hand);
        const numCardsInDiscard = document.querySelector(`#player${i} .statsDisplay .discardNum`);
        numCardsInDiscard.textContent = calculateNumCards(players[i].discard);
        //const numCoins = document.querySelector(`#player${i} .statsDisplay .numCoins`);
        //numCoins.textContent = players[i].numCoins;
        const numCardSwaps = document.querySelector(`#player${i} .statsDisplay .numCardSwaps`)
        numCardSwaps.textContent = players[i].numCardSwaps;
        const numRedirects = document.querySelector(`#player${i} .statsDisplay .numRedirects`)
        numRedirects.textContent = players[i].numRedirects;
        //const numCoinsInVault = document.querySelector(`#player${i} .statsDisplay .numCoinsInVault`);
        //if (i == myPlayerNum){
        //    numCoinsInVault.textContent = players[i].numCoinsInVault;
        //}
        //else{numCoinsInVault.textContent = '?'};
    }
}

function displayNotification(notification){
    const notificationDiv = document.createElement("div");
    notificationDiv.classList.add("notificationDiv");

    const notificationIcon = document.createElement("img");
    notificationIcon.src = "static/Images/Icons/notification.svg"

    const notificationContent = document.createElement("p");
    notificationContent.id = "notification";
    notificationContent.textContent = notification;

    const closeNotifiction = document.createElement("button");
    closeNotifiction.id = "closeNotification";
    closeNotifiction.textContent = "X";
    closeNotifiction.addEventListener("click", () => {
        notificationDiv.remove();
    })

    notificationDiv.appendChild(notificationIcon);
    notificationDiv.appendChild(notificationContent);
    notificationDiv.appendChild(closeNotifiction);
    const notificationContainer = document.getElementById("notificationContainer");

    let keepScrollPosition = true;
    if (notificationContainer.scrollTop == -1*(notificationContainer.scrollHeight - notificationContainer.offsetHeight)){
        keepScrollPosition = false;
    }
    notificationContainer.appendChild(notificationDiv);
    if (!keepScrollPosition){
        notificationContainer.scrollTop = -1*notificationContainer.scrollHeight;
    }

    setTimeout(() => {notificationDiv.remove()}, 60000);
}