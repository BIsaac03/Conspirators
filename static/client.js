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
        displayStats(players);
        actionSelection(players, myPlayerNum);

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
    displayStats(players);
})
socket.on("chooseAction", (players) => {
    actionSelection(players, myPlayerNum);
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
    console.log(distanceClockwise)
    if (numPlayers*0 + targetPlayerNum - myPlayerNum > 0){
        distanceClockwise = numPlayers*0 + targetPlayerNum - myPlayerNum;
    }
    else {
        distanceClockwise = numPlayers*1 + targetPlayerNum - myPlayerNum;
    }
    const playersOffCenter = distanceClockwise - numPlayers/2;
    console.log(playersOffCenter)
    const targetAngle =  2*playersOffCenter*angleModPerPlayer;

    return targetAngle;
}

function orientCardToPlayer(targetPlayerNum, numPlayers){
    const myPlayedCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
    const targetAngle = calculateTargetAngle(myPlayerNum, targetPlayerNum, numPlayers);
    myPlayedCard.style.transform = "translateY("+(-200*Math.sin(targetAngle))+"px) translateX("+(200*(1-Math.cos(targetAngle)))+"px)  rotate("+(targetAngle-Math.PI/2)+"rad)";       

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
        playedCard.src = "static/Images/Actions/Defend.png";
        playedCard.style.transform = 'rotate(-90deg)';

        playedCard.addEventListener("mouseover", () => {
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
        })

        playerSpace.appendChild(playedCard);
        playerSpace.appendChild(playerIcon);


        if (i == myPlayerNum){
            playerSpace.classList.add("myself");
            const handIcon = document.createElement("img");
            handIcon.src = "static/Images/Icons/hand.svg";
            handIcon.id = "handIcon";

            const discardIcon = document.createElement("img");
            //discardIcon.src = "static/Images/Icons/discard.svg";

            playerSpace.appendChild(handIcon, discardIcon);
        }
        else{


        }
        
        gameSpace.appendChild(playerSpace);
    }
    bodyElement.appendChild(gameSpace);
}

function actionSelection(players, playerNum){
    let actionToPlay = undefined;
    let targetPlayerNum = undefined;

    const actionSelectionDiv = document.createElement("div");
    actionSelectionDiv.id = "selectActionContainer";

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

    for (let i = 0; i < players.length; i++){
        if (i != myPlayerNum){
            const playerIcon = document.querySelector(`#player${i} .playerIcon`);
            playerIcon.addEventListener("mouseover", () => {
                orientCardToPlayer(i, players.length);
            })
        }
    }

    const confirm = document.createElement("button");
    confirm.id = "confirm";
    confirm.textContent = "Confirm";
    confirm.addEventListener("click", () => {
        if (actionToPlay != undefined && targetPlayerNum != undefined){
            socket.emit("chosenAction", myPlayerNum, actionToPlay, targetPlayerNum);
            // 
            confirm.remove();
            actionSelectionDiv.remove()
        }
    })
    bodyElement.appendChild(confirm);
    bodyElement.appendChild(actionSelectionDiv);
}

function displayStats(players){
    const statsSidebar = document.createElement("div");
    statsSidebar.id = "statsSidebar";

    for (let i = 0; i < players.length; i++){
        const playerDisplay = document.createElement("div");
        playerDisplay.id = "playerDisplay"+((myPlayerNum + i)%players.length);

        const playerName = document.createElement("p");
        playerName.textContent = players[(myPlayerNum + i)%players.length].playerName;
        playerName.classList.add("playerName");
        const numCardsInHand = document.createElement("p");
        numCardsInHand.textContent = players[(myPlayerNum + i)%players.length].hand.length;
        numCardsInHand.classList.add("handNum");
        const numCardsInDiscard = document.createElement("p");
        numCardsInDiscard.textContent = players[(myPlayerNum + i)%players.length].discard.length;
        numCardsInDiscard.classList.add("discardNum");
        const numCoins = document.createElement("p");
        numCoins.textContent = players[(myPlayerNum + i)%players.length].numCoins;
        numCoins.classList.add("numCoins");

        playerDisplay.appendChild(playerName);
        playerDisplay.appendChild(numCardsInHand);
        playerDisplay.appendChild(numCardsInDiscard);
        playerDisplay.appendChild(numCoins);

        if (i == 0){
            const coinsInVault = document.createElement("div");
            const vaultIcon = document.createElement("img");
            vaultIcon.src = "static/Images/Icons/safe.svg";
            const numCoinsInVault = document.createElement("p");
            numCoinsInVault.textContent = players[0].investedCoins;
            coinsInVault.appendChild(vaultIcon);
            coinsInVault.appendChild(numCoinsInVault);
        }
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

// removing informative popups
document.addEventListener("click", (e) => {
    const popUp = document.getElementById("popUp");
    if (popUp != undefined && !popUp.contains(e.target)){
        popUp.remove();
    }
})