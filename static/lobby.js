function populateLobby(bodyElement, socket, roomCode){
    const codeDiv = document.getElementById("roomCode");

    const code = codeDiv.querySelector(`p`);
    code.textContent = roomCode;

    const copyCode = codeDiv.querySelector(`img`);
    copyCode.src = "./static/Images/Icons/copy.svg";
    copyCode.addEventListener("click", () => {
        navigator.clipboard.writeText(roomCode);
    })

    const playerName = document.getElementById("playerName")
    let chosenName = localStorage.getItem("chosenName");
    if (chosenName){
        playerName.value = chosenName;
    }
    
    const playerColor = document.getElementById("playerColor");
    let preferredColor = localStorage.getItem("preferredColor");
    if (preferredColor){
        playerColor.value = preferredColor;
    }
    
    const joinGameButton = document.getElementById("joinGame");
    joinGameButton.addEventListener("click", () => {
        const name = playerName.value;
        const color = playerColor.value;
        if (name){
            localStorage.setItem('chosenName', name);
            localStorage.setItem('preferredColor', color);
            socket.emit("playerJoinedLobby", document.cookie.slice(7), name, color, roomCode);
            joinedLobbyUpdate(document);
        }
    })

    const startGameButton = document.getElementById("startGame");
    startGameButton.addEventListener("click", () => {
        if (confirm("Are you sure you want to start the game? New players will not be able to join an in-progress game.")){
            socket.emit("startGame", roomCode);
        }
    })
}

function joinedLobbyUpdate(){
    const joinGameButton = document.getElementById("joinGame");
    joinGameButton.textContent = "Update";
    const startGameButton = document.getElementById("startGame");
    startGameButton.style.display = "block";
}

function modifyPlayerList(playerID, playerName, playerColor, socket){
    const playerList = document.getElementById("playerList");
    if (playerList){
        const existingPlayer = document.getElementById(playerID);
        if (!existingPlayer){
            const player = document.createElement("div");
            player.id = playerID;
            player.classList.add("player");
    
            const playerColorDOM = document.createElement("div");
            playerColorDOM.classList.add("playerColor");
            playerColorDOM.style.backgroundColor = playerColor[0];
            player.appendChild(playerColorDOM);
    
            const playerNameDOM = document.createElement("li");
            playerNameDOM.classList.add("playerName");
            playerNameDOM.textContent = playerName;
            player.appendChild(playerNameDOM);
    
            const leaveLobbyButton = document.createElement("button");
            leaveLobbyButton.id = "leaveLobbyButton";
            leaveLobbyButton.textContent = "X";
            leaveLobbyButton.addEventListener("click", () => {
                socket.emit("leftLobby", playerID);
            })
            player.appendChild(leaveLobbyButton)
            playerList.appendChild(player);
    
        }
        else{
            existingPlayer.children[0].style.backgroundColor = playerColor[0];
            existingPlayer.children[1].textContent = playerName;
        }
    }
}

function gameInProgressError(bodyElement){
    bodyElement.innerHTML = "";
    const error = document.createElement("div");
    error.id = "error";
    const errorMessage = document.createElement("p");
    errorMessage.textContent = "A game is already in progress. All players in the game must leave before a new game can be started.";
    error.appendChild(errorMessage);
    bodyElement.appendChild(error)
}

export { populateLobby, joinedLobbyUpdate, modifyPlayerList, gameInProgressError }