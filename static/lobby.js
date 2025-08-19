function createLobby(bodyElement, socket){
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
    playerCustomization.addEventListener('submit', (e) => e.preventDefault());

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
    
    const joinGameButton = document.createElement("input");
    joinGameButton.classList.add("joinGame");
    joinGameButton.setAttribute("type", "submit");
    joinGameButton.setAttribute("value", "Join Game");
    joinGameButton.addEventListener("click", () => {

        const name = playerName.value;
        const color = playerColor.value;
        if (name != ""){
            localStorage.setItem('chosenName', name);
            localStorage.setItem('preferredColor', color);
            socket.emit("playerJoinedLobby", document.cookie, name, color);
            joinedLobbyUpdate(document);
        }
    })

    const startGameButton = document.createElement("button");
    startGameButton.id = "startGame";
    startGameButton.textContent = "Start Game"
    startGameButton.addEventListener("click", () => {
        if (confirm("Are you sure you want to start the game? New players will not be able to join an in-progress game.")){
            socket.emit("startGame");
        }
    })
    startGameButton.style.display = "none";  
    
    playerCustomization.appendChild(label);
    playerCustomization.appendChild(playerName);
    playerCustomization.appendChild(playerColor);
    playerCustomization.appendChild(joinGameButton);
    
    const playerListDOM = document.createElement("ul");
    playerListDOM.id = "playerList"
    playerListDOM.textContent = "Joined players:"
    
    lobby.appendChild(playerCustomization);
    lobby.appendChild(playerListDOM);
    lobby.appendChild(startGameButton);
    bodyElement.appendChild(lobby);
}

function joinedLobbyUpdate(){
    const joinGameButton = document.getElementsByClassName("joinGame")[0];
    joinGameButton.value = "Update";
    const startGameButton = document.getElementById("startGame");
    startGameButton.style.display = "block";
}

function modifyPlayerList(playerID, playerName, playerColor, socket){
    const playerList = document.getElementById("playerList");
    if (playerList != undefined){
        const existingPlayer = document.getElementById(playerID);
        if (existingPlayer === null){
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

export { createLobby, joinedLobbyUpdate, modifyPlayerList }