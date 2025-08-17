const socket = io.connect("http://localhost:3000");

let myPlayerNum = undefined;
const bodyElement = document.body;
createLobby();

socket.on("reconnection", (players, playerNum) => {
    myPlayerNum = playerNum;
    displayStats(players);

    if (!players[playerNum].isinGame){
        
    }
    else if (!players[playerNum].isReady){
        if (players[playerNum].waitingOn == "selectAction"){

        }
        else if (players[playerNum].waitingOn == "selectTarget"){

        }
        else if (players[playerNum].waitingOn == "useCardSwap"){

        }
        else if (players[playerNum].waitingOn == "recoverCards"){

        }
        else if (players[playerNum].waitingOn == "donate"){

        }
        else if (players[playerNum].waitingOn == "purchaseCards"){

        }
    }
})

socket.on("chooseAction", (players) => {
    actionSelection(players, myPlayerNum);
})

function createLobby(){
    const header = document.createElement("div");
    header.classList.add("header");
    bodyElement.appendChild(header);
    
    const title = document.createElement("p");
    title.classList.add("title");
    title.textContent = "Lobby";
    bodyElement.appendChild(title);
    
    const lobby = document.createElement("div");
    lobby.id = "lobby";
    
    const playerCustomization = document.createElement("form");
    playerCustomization.classList.add("playerCustomization");
    
    const label = document.createElement("label");
    label.setAttribute("for", "playerName");
    label.textContent =  "Player Name:";
    
    const playerName = document.createElement("input");
    playerName.classList.add("playerName");
    playerName.setAttribute("type", "text");
    playerName.setAttribute("maxlength", "20");
    playerName.setAttribute("name", "playerName");
    playerName.id = "playerName";
    let chosenName = localStorage.getItem("chosenName");
    if (chosenName != undefined){
        playerName.value = chosenName;
    }
    
    const playerColor = document.createElement("input");
    playerColor.classList.add("colorSelect");
    playerColor.setAttribute("type", "color");
    playerColor.setAttribute("name", "playerColor");
    playerColor.id = "playerColor";
    let preferredColor = localStorage.getItem("preferredColor");
    if (preferredColor != undefined){
        playerColor.value = preferredColor;
    }
    
    const submitBtn = document.createElement("input");
    submitBtn.classList.add("joinGame");
    submitBtn.setAttribute("type", "submit");
    submitBtn.setAttribute("value", "Join Game");
    submitBtn.addEventListener("click", () => {
        const name = playerName.value;
        const color = playerColor.value;
        if (name != ""){
            localStorage.setItem('chosenName', name);
            localStorage.setItem('preferredColor', color);
            socket.emit("joinGame", name, color);
        }
    })
    
    playerCustomization.appendChild(label);
    playerCustomization.appendChild(playerName);
    playerCustomization.appendChild(playerColor);
    playerCustomization.appendChild(submitBtn);
    
    const playerListDOM = document.createElement("ul");
    playerListDOM.id = "playerList"
    playerListDOM.textContent = "Joined players:"
    
    lobby.appendChild(playerCustomization);
    lobby.appendChild(playerListDOM);
    bodyElement.appendChild(lobby);
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


// removing informative popups
document.addEventListener("click", (e) => {
    const discardPopUp = document.getElementById("discardPopUp");
    if (discardPopUp != undefined && !discardPopUp.contains(e.target)){
        discardPopUp.remove();
    }
})