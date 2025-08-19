import * as lobby from "./lobby.js";

if (document.cookie == ""){
    document.cookie = "userID="+Math.random().toString(36).substring(1, 30);
}

const socket = io.connect("http://localhost:3000");

let myPlayerNum = undefined;
const bodyElement = document.body;

socket.on("newPlayer", (isGameInProgress) => {
    if (isGameInProgress){
        gameInProgressError();
    }
    else{
        lobby.createLobby(document, bodyElement, socket);
    }
})

socket.on("reconnection", (players, reconnectedPlayer, isGameInProgress) => {
    bodyElement.innerHTML = "";

    if (!reconnectedPlayer.isInGame){
        if (isGameInProgress){
            gameInProgressError();
        }
        else{
            lobby.createLobby(document, bodyElement, socket);
            for (let i = 0; i < players.length; i++){
                console.log("modify")
                lobby.modifyPlayerList(socket, document, players[i].playerID, players[i].playerName, players[i].playerColor);
            }
            lobby.joinedLobbyUpdate(document);
        }
    }
    else{
        myPlayerNum = reconnectedPlayer.playerNum;

        displayStats(players);

        if (!reconnectedPlayer.isReady){
            if (reconnectedPlayer.waitingOn == "selectAction"){
    
            }
            else if (reconnectedPlayer.waitingOn == "selectTarget"){
    
            }
            else if (reconnectedPlayer.waitingOn == "useCardSwap"){
    
            }
            else if (reconnectedPlayer.waitingOn == "recoverCards"){
    
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
        lobby.modifyPlayerList(socket, document, players[i].playerID, players[i].playerName, players[i].playerColor);
    }
})
socket.on("modifyPlayerList", (playerID, newPlayerName, newPlayerColor) => {
    lobby.modifyPlayerList(socket, document, playerID, newPlayerName, newPlayerColor);
    lobby.joinedLobbyUpdate(document);
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
})
socket.on("chooseAction", (players) => {
    actionSelection(players, myPlayerNum);
})



function createGameSpace(players){
    const userID = document.cookie;
    const thisPlayer = players.find(player => player.playerID == userID);
    myPlayerNum = thisPlayer.playerNum;
    
    bodyElement.innerHTML = "";
    const gameSpace = document.createElement("div");
    gameSpace.id = "gameSpace";

    for (let i = 0; i < players.length; i++){
        const playerSpace = document.createElement("div");
        playerSpace.id = "player"+i;

        if (i == myPlayerNum){
            const handIcon = document.createElement("img");
            handIcon.src = "static/Images/Icons/hand.svg";
            const discardIcon = document.createElement("img");
            discardIcon.sec = "static/Images/Icons/discard.svg";

            const coinsInVault = document.createElement("div");
            const vaultIcon = document.createElement("img");
            vaultIcon.src = "static/Images/Icons/safe.svg";
            const numCoinsInVault = document.createElement("p");
            coinsInVault.appendChild(vaultIcon);
            coinsInVault.appendChild(numCoinsInVault);

            playerSpace.classList.add("myself");
            playerSpace.appendChild(handIcon, discardIcon, coinsInVault);
        }
        else{

        }

        gameSpace.appendChild(playerSpace);
    }
    bodyElement.appendChild(gameSpace);
}

function actionSelection(players, playerNum){
    let actionToPlay = undefined;

    const actionSelectionDiv = document.createElement("div");
    actionSelectionDiv.id = "selectActionContainer";

    const targetSelection = document.createElement("select");
    targetSelection.id = "targetSelection";
    const selectionInstructions = document.createElement("option");
    selectionInstructions.setAttribute("value", -1);
    targetSelection.appendChild(selectionInstructions);
    for (let i = 0; i < players.length; i++){
        if (players.playerNum != myPlayerNum){
            const playerOption = document.createElement("option");
            playerOption.textContent = players[i].playerName;
            playerOption.setAttribute("value", i)
            targetSelection.appendChild(playerOption);
        }
    }

    const actionSelection = document.createElement("div");
    actionSelection.id = "actionSelection";
    for (let i = 0; i < players[playerNum].hand.length; i++){
        const actionDiv = document.createElement("div");
        actionDiv.id = "actionDiv";
        const possibleAction = document.createElement("img");
        possibleAction.src = players[playerNum].hand[i][0].image;
        possibleAction.addEventListener("click", () => {
            const previousSelection = document.getElementById("selected");
            if (previousSelection != undefined){
                previousSelection.id = "";
            }
            actionDiv.id = "selected";
            actionToPlay = players[playerNum].hand[i][0];

        })
        const numberOfAction = document.createElement("p");
        numberOfAction.textContent = "x"+players[playerNum].hand[i][1];
        actionDiv.appendChild(possibleAction);
        actionDiv.appendChild(numberOfAction);
        actionSelection.appendChild(actionDiv);
    }
    actionSelectionDiv.appendChild(actionSelection);

    const confirm = document.createElement("button");
    confirm.textContent = "Confirm";
    confirm.addEventListener("click", () => {
        if (actionToPlay != undefined && targetSelection.value >= 0){
            socket.emit("chosenAction", myPlayerNum, actionToPlay, targetSelection.value);
            actionSelectionDiv.remove()
        }
    })
    actionSelectionDiv.appendChild(confirm);
    bodyElement.appendChild(actionSelectionDiv);
}

function displayStats(players){
    for (let i = 0; i < players.length; i++){
        const playerDisplay = document.createElement("div");
        playerDisplay.id = "playerDisplay"+i;

        const playerName = document.createElement("p");
        playerName.textContent = players[i].playerName;
        playerName.classList.add("playerName");
        const numCardsInHand = document.createElement("p");
        numCardsInHand.textContent = players[i].hand.length;
        numCardsInHand.classList.add("handNum");
        const numCardsInDiscard = document.createElement("p");
        numCardsInDiscard.textContent = players[i].discard.length;
        numCardsInDiscard.classList.add("discardNum");
        const numCoins = document.createElement("p");
        numCoins.textContent = players[i].numCoins;
        numCoins.classList.add("numCoins");

        playerDisplay.appendChild(playerName);
        playerDisplay.appendChild(numCardsInHand);
        playerDisplay.appendChild(numCardsInDiscard);
        playerDisplay.appendChild(numCoins);

        if (i == myPlayerNum){
            const numCoinsInvested = document.createElement("p");
            numCoinsInvested.textContent = players[i].investedCoins;
            numCoinsInvested.classList.add("coinsInvested");
        }
    }
}

function updateStats(players){
    for (let i = 0; i < players.length; i++){
        const numCardsInHand = document.querySelector(`#playerDisplay${i} .handNum`);
        numCardsInHand.textContent = players[i].hand.length;
        const numCardsInDiscard = document.querySelector(`#playerDisplay${i} .discardNum`);
        numCardsInDiscard.textContent = players[i].discard.length;
        const numCoins = document.querySelector(`#playerDisplay${i} .numCoins`);
        numCoins.textContent = players[i].numCoins;

        if (i == myPlayerNum){
            const numCoinsInvested = (`#playerDisplay${i} .coinsInvested`);
            numCoinsInvested.textContent = players[i].investedCoins;
        }
    }
}

function examineDiscard(player){
    const discardPopUp = document.createElement("div");
    discardPopUp.id = "discardPopUp";

    for (let i = 0; i < player.discard.length; i++){
        const actionDiv = document.createElement("div");
        actionDiv.id = "actionDiv";

        const action = document.createElement("img");
        action.src = player.discard[i][0].image
        const numCopies = document.createElement("p");
        numCopies.textContent = "x"+player.discard[i][1];

        actionDiv.appendChild(action);
        actionDiv.appendChild(numCopies);
    }
    discardPopUp.appendChild(actionDiv);

}

function gameInProgressError(){
    bodyElement.innerHTML = "";
    const error = document.createElement("div");
    error.id = "error";
    const errorMessage = document.createElement("p");
    errorMessage.textContent = "A game is already in progress. All players in the game must leave before a new game can be started.";
    error.appendChild(errorMessage);
    bodyElement.appendChild(error)
}

// removing informative popups
document.addEventListener("click", (e) => {
    const popUp = document.getElementById("popUp");
    if (popUp != undefined && !popUp.contains(e.target)){
        popUp.remove();
    }
})