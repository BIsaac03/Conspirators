import * as lobby from "./lobby.js";

if (document.cookie == ""){
    document.cookie = "userID="+Math.random().toString(36).substring(1, 30);
}
let userIDCookie = document.cookie;

const socket = io("http://localhost:3000", {
    auth: {
        token: userIDCookie
    }
});

let myPlayerNum = undefined;
const bodyElement = document.body;

socket.on("newPlayer", (isGameInProgress) => {
    bodyElement.innerHTML = "";
    if (isGameInProgress){
        lobby.gameInProgressError(bodyElement);
    }
    else{
        lobby.createLobby(bodyElement, socket);
    }
})

socket.on("reconnection", (reconnectedPlayer, players, isGameInProgress) => {
    bodyElement.innerHTML = "";
    if (!reconnectedPlayer.isInGame){
        if (isGameInProgress){
            lobby.gameInProgressError(bodyElement);
        }
        else{
            lobby.createLobby(bodyElement, socket);
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
        createStats(players);
        createCardDisplay(reconnectedPlayer);
        openCloseDisplay();
        displayCards(reconnectedPlayer.playerNum, reconnectedPlayer.hand);
        actionSelection(players, myPlayerNum);

        if (!reconnectedPlayer.isReady){
            if (reconnectedPlayer.waitingOn == "selectAction"){
    
            }
            else if (reconnectedPlayer.waitingOn == "selectTarget"){
    
            }
            else if (reconnectedPlayer.waitingOn == "useCardSwap"){
    
            }
            else if (reconnectedPlayer.waitingOn == "retrieveCards"){
    
            }
            else if (reconnectedPlayer.waitingOn == "donate"){
    
            }
            else if (reconnectedPlayer.waitingOn == "purchaseCards"){
    
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

socket.on("createGameSpace", (players) => {
    createGameSpace(players);
    createStats(players);
    updateStats(players);
    createCardDisplay(players[myPlayerNum]);
    openCloseDisplay();
    displayCards(players[myPlayerNum], players[myPlayerNum].hand);
})
socket.on("selectAction", (players) => {
    actionSelection(players, myPlayerNum);
})
socket.on("revealActions", (players) => {
    revealActions(players);
})
socket.on("retrieveCards", (player, numCardsToRetrieve) => {
    if (player.playerNum == myPlayerNum){
        retrieveCards(player, numCardsToRetrieve);
    }
})
socket.on("donate", (giver, receiver, maxCoins, context) => {
    const donationScreen = document.createElement("div");
    donationScreen.id = "donationScreen";

    const contextMessage = document.createElement("p");
    contextMessage.id = "donationContext";
    contextMessage.textContent = context;

    if (myPlayerNum == giver.playerNum){
        const donationEntry = document.createElement("input");
        donationEntry.type = "number";
        donationEntry.max = maxCoins;

        const submit = document.createElement("button");
        submit.id = "submit";
        submit.addEventListener("click", () => {
            if (donationEntry.value >= 0 && donationEntry.value <= maxCoins){
                socket.emit("gaveDonation", giver, receiver, donationEntry.value);
            }
        })
        donationScreen.appendChild(donationEntry);
    }

    donationScreen.appendChild(contextMessage);
    bodyElement.appendChild(donationScreen);
})
socket.on("updateStats", (players) => {
    updateStats(players);
})

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
    playedCard.style.transform = "translateY("+(-200*Math.sin(targetAngle))+"px) translateX("+(200*(1-Math.cos(targetAngle)))+"px)  rotate("+(targetAngle-Math.PI/2)+"rad)";       

}

function createGameSpace(players){
    const userID = document.cookie;
    const thisPlayer = players.find(player => player.playerID == userID);
    myPlayerNum = thisPlayer.playerNum;
    
    bodyElement.innerHTML = "";
    const gameSpace = document.createElement("div");
    gameSpace.id = "gameSpace";

    const radianOffset = Math.PI/2 - myPlayerNum*2*Math.PI/players.length;
    for (let i = 0; i < players.length; i++){
        const playerSpace = document.createElement("div");
        playerSpace.id = "player"+i;
        playerSpace.style.transform = "rotate("+(2*Math.PI * i/players.length + radianOffset)+"rad) translateX(250px)"; 

        const playerIcon = document.createElement("div");
        playerIcon.classList.add("playerIcon");

        const playedCard = document.createElement("img");
        playedCard.classList.add("playedCard");
        playedCard.src = "static/Images/Actions/back.png";
        playedCard.style.transform = 'rotate(-90deg)';

        playedCard.addEventListener("mouseover", () => {
            if (!playedCard.src.includes("static/Images/Actions/back.png")){
                const blownUpAction = document.createElement("img");
                blownUpAction.src = playedCard.src;
                blownUpAction.id = "blownUp";
                bodyElement.appendChild(blownUpAction);
                playedCard.style.opacity = 0.3;
    
                playedCard.addEventListener("mouseout", () => {
                    const blownUpAction = document.getElementById("blownUp");
                    if (blownUpAction != undefined && !blownUpAction.matches(':hover')){
                        playedCard.style.opacity = 1.0;
                        blownUpAction.remove();
                    }
                })
                blownUpAction.addEventListener("mouseout", () => {
                    if (!playedCard.matches(':hover')){
                        playedCard.style.opacity = 1.0;
                        blownUpAction.remove();
                    }
                })
            }
        })

        playerSpace.appendChild(playedCard);
        playerSpace.appendChild(playerIcon);

        gameSpace.appendChild(playerSpace);
    }
    bodyElement.appendChild(gameSpace);
}

function createCardDisplay(player){
    const actionDisplayDiv = document.createElement("div");
    actionDisplayDiv.id = "actionDisplayDiv";

    const discardToggleDiv = document.createElement("div");
    discardToggleDiv.id = "discardToggleDiv";
    discardToggleDiv.classList.add("cardLocationToggle");
    discardToggleDiv.style.backgroundColor ="rgba(110, 110, 110, 0.83)";
    const discardToggle = document.createElement("button");
    discardToggle.textContent = "Discard"
    discardToggleDiv.addEventListener("click", () => {
        discardToggleDiv.style.backgroundColor ="rgba(0, 0, 0, 0.83)";
        handToggleDiv.style.backgroundColor ="rgba(110, 110, 110, 0.83)";
        displayCards(player, player.discard);
    })
    discardToggleDiv.appendChild(discardToggle);

    const handToggleDiv = document.createElement("div");
    handToggleDiv.id = "handToggleDiv";
    handToggleDiv.classList.add("cardLocationToggle");
    handToggleDiv.style.backgroundColor ="rgba(0, 0, 0, 0.83)";
    const handToggle = document.createElement("button");
    handToggle.textContent = "Hand";
    handToggleDiv.addEventListener("click", () => {
        handToggleDiv.style.backgroundColor ="rgba(0, 0, 0, 0.83)";
        discardToggleDiv.style.backgroundColor ="rgba(110, 110, 110, 0.83)";
        displayCards(player, player.hand);
    })
    handToggleDiv.appendChild(handToggle);

    const cardLocationToggle = document.createElement("div");
    cardLocationToggle.id = "cardLocationToggle";
    cardLocationToggle.appendChild(discardToggleDiv);
    cardLocationToggle.appendChild(handToggleDiv);

    const displayVisibilitySlider = document.createElement("div");
    displayVisibilitySlider.id = "displayVisibilitySlider";
    const sliderIcon = document.createElement("img");
    sliderIcon.id = "sliderIcon";
    sliderIcon.src = "/static/Images/Icons/collapse.svg";
    displayVisibilitySlider.appendChild(sliderIcon);
    displayVisibilitySlider.addEventListener("click", openCloseDisplay);
    
    actionDisplayDiv.appendChild(cardLocationToggle);
    actionDisplayDiv.appendChild(displayVisibilitySlider);

    const actionSelection = document.createElement("div");
    actionSelection.id = "actionSelection";

    actionDisplayDiv.appendChild(actionSelection);

    bodyElement.appendChild(actionDisplayDiv);
}

function openCloseDisplay(){
    const actionDisplayDiv = document.getElementById("actionDisplayDiv");
    const sliderIcon = document.getElementById("sliderIcon");
    if (sliderIcon.src.includes("/static/Images/Icons/expand.svg")){
        actionDisplayDiv.style.transform = "";
        sliderIcon.src = "/static/Images/Icons/collapse.svg";
    }
    else {
        const translation = actionDisplayDiv.offsetWidth - 40;
        actionDisplayDiv.style.transform = "translateX(-"+translation+"px)";
        const sliderIcon = document.querySelector(`#displayVisibilitySlider img`);
        sliderIcon.src = "/static/Images/Icons/expand.svg";
    }
}

function displayCards(player, cardsToDisplay){
    const actionSelection = document.getElementById("actionSelection");
    actionSelection.innerHTML = "";

    for (let i = 0; i < cardsToDisplay.length; i++){
        const actionDiv = document.createElement("div");
        const possibleAction = document.createElement("img");
        possibleAction.src = cardsToDisplay[i][0].image;
        possibleAction.addEventListener("click", () => {
            if (cardsToDisplay == player.hand && player.waitingOn == "selectAction"){
                const previousSelection = document.getElementById("selectedCard");
                if (previousSelection != undefined){
                    previousSelection.id = "";
                }
                actionDiv.id = "selectedCard";

                const myPlayedCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
                myPlayedCard.src = cardsToDisplay[i][0].image;
                openCloseDisplay();
            }
            if (cardsToDisplay == player.discard && player.waitingOn == "retrieveCards"){
                const remainingRetrievals = document.getElementById("remainingRetrievals");
                const numDuplicateRetrievals = document.querySelector(`.retrieveIcon p.${i}`);

                if (numDuplicateRetrievals == undefined && remainingRetrievals.textContent > 0){
                    const retrieveIcon = document.createElement("div");
                    retrieveIcon.classList.add("retrieveIcon");
                    const numDuplicateRetrievals = document.createElement("p");
                    numDuplicateRetrievals.classList.add(i);
                    retrieveIcon.appendChild(numDuplicateRetrievals);
                    possibleAction.appendChild(retrieveIcon);
                    numDuplicateRetrievals.textContent = 1;
                    remainingRetrievals.textContent -= 1;
                }
                else{
                    if (cardsToDisplay[1][i] > numDuplicateRetrievals.textContent && remainingRetrievals.textContent > 0){
                        numDuplicateRetrievals.textContent += 1;
                        remainingRetrievals.textContent -= 1;
                    }
                    else{
                        remainingRetrievals.textContent += 1;
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
    let targetPlayerNum = undefined;

    for (let i = 0; i < players.length; i++){
        if (i != myPlayerNum){
            const playerIcon = document.querySelector(`#player${i} .playerIcon`);
            playerIcon.addEventListener("mouseover", () => {
                if (targetPlayerNum == undefined){
                    orientCardToPlayer(myPlayerNum, i, players.length);
                }
            })
            playerIcon.addEventListener("click", () => {

                const myCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
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
            const actionToPlay = players[myPlayerNum].hand.find(action => actionToPlayDOM.src.includes(action[0].image));
            socket.emit("chosenAction", myPlayerNum, actionToPlay[0], targetPlayerNum);

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

function revealActions(players){
    players.forEach((player) => {
        const playedCard = document.querySelector(`#player${player.playerNum} .playedCard`);
        playedCard.src = player.playedCard[0].image;
        orientCardToPlayer(player.playerNum, player.playedCard[1], players.length);
    })
}

function retrieveCards(player, numCardsToRetrieve){
    // pull up relevant display
    const discardToggleDiv = document.getElementById("discardToggleDiv");
    const handToggleDiv = document.getElementById("handToggleDiv");
    const sliderIcon = document.getElementById("sliderIcon");
    discardToggleDiv.style.backgroundColor ="rgba(0, 0, 0, 0.83)";
    handToggleDiv.style.backgroundColor ="rgba(110, 110, 110, 0.83)";
    displayCards(player, player.discard);
    if (sliderIcon.src == "/static/Images/Icons/collapse.svg"){
        openCloseDisplay();
    }

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
                const returnedCard = player.discard.find(card => card.image == action.parentElement.parentElement.src);
                totalRetrievedCards.push(returnedCard);
            }
        })
        if (totalRetrievedCards.length == numCardsToRetrieve){
            socket.emit("returnCardsToHand", myPlayerNum, totalRetrievedCards);
        }
    })
}

function createStats(players){
    const statsSidebar = document.createElement("div");
    statsSidebar.id = "statsSidebar";

    for (let i = 0; i < players.length; i++){
        const playerDisplay = document.createElement("div");
        playerDisplay.id = "playerDisplay"+((myPlayerNum + i)%players.length);

        const playerName = document.createElement("p");
        playerName.textContent = players[(myPlayerNum + i)%players.length].playerName;
        playerName.color = players[(myPlayerNum + i)%players.length].playerColor[0];
        playerName.classList.add("playerName");

        const coinsIcon = document.createElement("img");
        coinsIcon.src = "static/Images/Icons/coins.png";
        const numCoins = document.createElement("p");
        numCoins.classList.add("numCoins");
        
        const vaultIcon = document.createElement("img");
        vaultIcon.src = "static/Images/Icons/safe.svg";
        const numCoinsInVault = document.createElement("p");
        numCoinsInVault.classList.add("numCoinsInVault");

        const handIcon = document.createElement("img");
        handIcon.src = "static/Images/Icons/hand.svg";
        const numCardsInHand = document.createElement("p");
        numCardsInHand.classList.add("handNum");

        const discardIcon = document.createElement("img");
        discardIcon.src = "static/Images/Icons/discard.png";
        const numCardsInDiscard = document.createElement("p");
        numCardsInDiscard.classList.add("discardNum");

        playerDisplay.appendChild(playerName);
        playerDisplay.appendChild(coinsIcon);
        playerDisplay.appendChild(numCoins);
        playerDisplay.appendChild(vaultIcon);
        playerDisplay.appendChild(numCoinsInVault);
        playerDisplay.appendChild(handIcon);
        playerDisplay.appendChild(numCardsInHand);
        playerDisplay.appendChild(discardIcon);
        playerDisplay.appendChild(numCardsInDiscard);
        
        statsSidebar.appendChild(playerDisplay);
    }
    bodyElement.appendChild(statsSidebar);
}

function updateStats(players){
    for (let i = 0; i < players.length; i++){
        const numCardsInHand = document.querySelector(`#playerDisplay${i} .handNum`);
        numCardsInHand.textContent = players[i].hand.length;
        const numCardsInDiscard = document.querySelector(`#playerDisplay${i} .discardNum`);
        numCardsInDiscard.textContent = players[i].discard.length;
        const numCoins = document.querySelector(`#playerDisplay${i} .numCoins`);
        numCoins.textContent = players[i].numCoins;

        const numCoinsInVault = (`#playerDisplay${i} .numCoinsInVault`);
        if (i == myPlayerNum){
            numCoinsInVault.textContent = players[i].investedCoins;
        }
        else{numCoinsInVault.textContent = '?'};
    }
}