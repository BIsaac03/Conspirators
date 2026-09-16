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

socket.on("outsideLobby", () => {
    if (window.location.href == "http://localhost:3000/" || window.location.href == "http://localhost:3000/index.html"){
        addMainMenuListeners();
    }
    else if (window.location.href.startsWith("http://localhost:3000/lobby.html")){
        const params = new URLSearchParams(window.location.search);
        const roomCode = params.get('roomCode');
        socket.emit("connectToNewLobby", roomCode); 
        lobby.populateLobby(bodyElement, socket, roomCode);
    }    
})

socket.on("startTutorial", (players) => {
    startTutorial(players, 1);
})

socket.on("gameInProgress", () => {
    lobby.gameInProgressError(bodyElement);
})

socket.on("reconnection", (reconnectedPlayer, players, shop, roundPhase, startPlayer, isGameInProgress, roomCode) => {
    if (roomCode == "tutorial"){
        startTutorial(players, reconnectedPlayer.tutorialPhase)
    }
    else if (!reconnectedPlayer.isInGame){
        if (isGameInProgress){
            lobby.gameInProgressError(bodyElement);
        }
        else{
            lobby.populateLobby(bodyElement, socket, roomCode);
            for (let i = 0; i < players.length; i++){
                console.log("modify")
                lobby.modifyPlayerList(players[i].playerID, players[i].playerName, players[i].playerColor, socket);
            }
            lobby.joinedLobbyUpdate();
        }
    }
    else{
        myPlayerNum = reconnectedPlayer.playerNum;

        populateGameSpace(players);
        addActionSearchListeners(false);
        addScorecardListeners(players.length);
        createStats(players);
        updateStats(players, startPlayer);
        addCardDisplayListeners();
        displayCards(players[myPlayerNum], reconnectedPlayer.hand, "play", false);
        displayCards(players[myPlayerNum], shop, "buy", false);
        modifyBewitchedIcons(players);

        // restore interrupted game state
        switch (roundPhase){
            case "actionSelection":
                populateCardBacks(players.length);
                if (reconnectedPlayer.playedCard && reconnectedPlayer.currentTarget){
                    const myPlayedCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
                    generateCard(myPlayedCard, reconnectedPlayer.playedCard, false);
                    orientCardToPlayer(myPlayerNum, reconnectedPlayer.currentTarget, players.length);
                }
                
                players.forEach((player) => {
                    if (player.isReady){
                        lockInCard(player.playerNum);
                    }
                })
                break;

            case "cardSwaps":
                populateCardBacks(players.length);
                const myPlayedCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
                generateCard(myPlayedCard, reconnectedPlayer.playedCard, false);
                orientCardToPlayer(myPlayerNum, reconnectedPlayer.currentTarget, players.length);

                players.forEach(player => {
                    lockInCard(player.playerNum);
                    orientCardToPlayer(player.playerNum, player.currentTarget, players.length);
                })
                break;

            case "actionResolution":
                players.forEach(player => {
                    const playedCard = document.querySelector(`#player${player.playerNum} .playedCard`);
                    lockInCard(player.playerNum);
                    orientCardToPlayer(player.playerNum, player.currentTarget, players.length);
                    generateCard(playedCard, player.playedCard, player.isImpersonating);
                })
                break;

            case "buyCards":
                break;
        }

        // prompt player action
        if (!reconnectedPlayer.isReady){
            switch (reconnectedPlayer.waitingOn){
                case "selectAction":
                    actionSelection(players, myPlayerNum);
                    break;

                case "useCardSwap":
                    allowCardSwaps(players);
                    break;

                case "retrieveCards":
                    retrieveCards(reconnectedPlayer, Math.floor(calculateNumCards(reconnectedPlayer.discard) / 2), false);
                    break;

                case "cooperate":
                    promptDonation(reconnectedPlayer, players[reconnectedPlayer.cooperatingWith], "cooperate");
                    break;

                case "honor":
                    promptDonation(reconnectedPlayer, players[reconnectedPlayer.currentTarget], "honor");
                    break;

                case "chooseImpersonate":
                    promptImpersonate(players.length);
                    break;

                case "whistleRedirects":
                    promptRedirects("whistle");
                    break;

                case "hijackRedirects":
                    promptRedirects("whistle");
                    break;
                
                case "buyCards":
                    createCheckOutList(reconnectedPlayer.numCoins, false);
                    break;
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

    if (document.cookie.slice(7) == playerID){
        const joinGameButton = document.getElementById("joinGame");
        joinGameButton.textContent = "Join Game";
        const startGameButton = document.getElementById("startGame");
        startGameButton.style.visibility = "hidden";
    }
})

socket.on("sendToGame", () => {
    window.location.href = "gameSpace.html"
})
socket.on("selectAction", (players) => {
    displayCards(players[myPlayerNum], players[myPlayerNum].hand, "play", false);
    populateCardBacks(players.length);
    actionSelection(players, myPlayerNum);
})
socket.on("opponentActionChosen", (playerNum) => {
    lockInCard(playerNum);
})
socket.on("cardSwapPhase", (players) => {
    allowCardSwaps(players);
})
socket.on("revealActions", (players) => {
    revealActions(players);
    modifyBewitchedIcons(players);
})
socket.on("allowShopPurchases", (shop, players) => {
    actionPhaseCleanUp(players.length);
    displayCards(players[myPlayerNum], shop, "buy", false);
    createCheckOutList(players[myPlayerNum].numCoins, false);
})
socket.on("resetGameDisplay", () => {
    removePreviousElement(`#checkOutList`);
    populateCardBacks();
})
socket.on("bewitchIcons", (players) => {
    modifyBewitchedIcons(players);
})
socket.on("chooseImpersonate", (numPlayers, playerID) => {
    if (playerID == myID){
        promptImpersonate(numPlayers);
    }
})
socket.on("updateImpersonation", (playerNum, impersonatedAction) => {
    const playedCard = document.querySelector(`#player${playerNum} .playedCard`);
    generateCard(playedCard, impersonatedAction, true);
    playedCard.setAttribute("action", impersonatedAction.name);
})
socket.on("retrieveCards", (player, numCardsToRetrieve) => {
    if (player.playerID == myID){
        retrieveCards(player, numCardsToRetrieve);
    }
})
socket.on("cooperate", (target, cooperator) => {
    if (target.playerNum == myPlayerNum){
        promptDonation(target, cooperator, "cooperate");
    }
})
socket.on("honor", (player, target) => {
    if (player.playerNum == myPlayerNum){
        promptDonation(player, target, "honor");
    }
})
socket.on("whistleRedirects", (playerID) => {
    if (playerID == myID){
        promptRedirects("whistle");
    }
})
socket.on("hijackRedirects", (playerID) => {
    if (playerID == myID){
        promptRedirects("hijack");
    }
})

socket.on("displayWorkValue", (workValue) => {
    const workValueDisplay = document.querySelector(`#workValueScorecard p`);
    workValueDisplay.textContent = workValue;
})

socket.on("animateCoinTransfer", (playerFrom, playerTo, numCoins, numPlayers) => {
    animateCoinTransfer(playerFrom, playerTo, numCoins, numPlayers);
})

socket.on("updateStats", (players, startPlayer) => {
    updateStats(players, startPlayer);
})

socket.on("updateCards", (players, shop, where, shouldDisplay, isTutorial) => {
    if (where == "hand"){
        displayCards(players[myPlayerNum], players[myPlayerNum].hand, "play", isTutorial)
    }
    else if (where == "discard"){
        displayCards(players[myPlayerNum], players[myPlayerNum].discard, "play", isTutorial)
    }
    else if (where == "shop"){
        displayCards(players[myPlayerNum], shop, "buy", isTutorial);
    }
    if (shouldDisplay){
        openRelevantPlayerDisplay(players[myPlayerNum], where, isTutorial);
    }
})

socket.on("notification", (notification, notificationType, playerNum) => {
    if (playerNum == "ALL" || playerNum == myPlayerNum){
        displayNotification(notification, notificationType);
    }
})

function addMainMenuListeners(){
    const mainMenu = document.getElementById("mainMenu");
    const options = document.getElementById("options");

    const createLobby = options.querySelector(`.createLobby`);
    createLobby.addEventListener("click", () => {
        const roomCode = (Math.random().toString(36).slice(2, 6)).toUpperCase();
        window.location.href = `lobby.html?roomCode=${roomCode}`;
    })

    const joinLobby = options.querySelector(`.joinLobby`);
    joinLobby.addEventListener("click", () => {
        const existingPopUp = document.getElementById("roomCodePopUp");
        if (!existingPopUp){
            const roomCodePopUp = document.createElement("div");
            roomCodePopUp.id = "roomCodePopUp"

            const roomCodeEntry = document.createElement("input");
            roomCodeEntry.setAttribute("placeholder", "Code");
            roomCodeEntry.setAttribute("type", "text");
            roomCodeEntry.setAttribute("maxlength", "4");
            roomCodePopUp.appendChild(roomCodeEntry);

            const attemptJoinButton = document.createElement("button");
            attemptJoinButton.textContent = "Join"
            attemptJoinButton.addEventListener("click", () => {
                if (roomCodeEntry.value.length == 4){
                    window.location.href = `lobby.html?roomCode=${roomCodeEntry.value.toUpperCase()}`;
                }
            })
            roomCodePopUp.appendChild(attemptJoinButton);

            options.appendChild(roomCodePopUp);
        }
        else{
            existingPopUp.remove();
        }
    })

    const tutorial = options.querySelector(`.startTutorial`);
    tutorial.addEventListener("click", () => {
        socket.emit("setUpTutorial", myID);
        setTimeout(()=> {
            window.location.href = "gameSpace.html";
        }, 100)
    })
}
// TUTORIAL
function startTutorial(players, phase){
    myPlayerNum = 0;
    hideElementsForTutorial()
    populateGameSpace(players);
    createStats(players);
    if (phase < 26){
        updateStats(players, 0);
    }
    else{
        updateStats(players, 1);
    }
    
    addCardDisplayListeners();
    addScorecardListeners(3);

    const tutorialDiv = document.createElement("div")
    tutorialDiv.id = "tutorial"
    const tutorialMessage = document.createElement("p");
    tutorialMessage.id = "tutorialMessage";
    tutorialDiv.appendChild(tutorialMessage);
    bodyElement.appendChild(tutorialDiv);

    if (phase != 1){
        console.log(players[0]);
        loadPreviousTutorialSteps(phase, players[0].currentTarget);
    }
    tutorialPhase(phase);

    const leaveTutorial = document.createElement("button");
    leaveTutorial.textContent = "Leave tutorial";
    leaveTutorial.id = "leaveTutorial";
    leaveTutorial.addEventListener("click", () => {
        socket.emit("leaveTutorial", myID);
        setTimeout(() => {
            window.location.href = "index.html";
        }, 100);
    })
    bodyElement.appendChild(leaveTutorial);
}
function hideElementsForTutorial(){
    const actionSearch = document.getElementById("actionSearch");
    const playerDisplay = document.getElementById("playerDisplay");
    const shopDisplay = document.getElementById("shopDisplay");
    const workValueScorecard = document.getElementById("workValueScorecard");
    const stealValueScorecard = document.getElementById("stealValueScorecard");

    actionSearch.style.visibility = "hidden";
    playerDisplay.style.visibility = "hidden";
    shopDisplay.style.visibility = "hidden";
    workValueScorecard.style.visibility = "hidden";
    stealValueScorecard.style.visibility = "hidden";
}
function addTutorialProgressArrows(messages, nextPhaseNum, tutorialDiv){
    const tutorialProgress = document.createElement("div");
    tutorialProgress.classList = "tutorialProgress"

    const completed = document.createElement("p");
    completed.classList.add("completed");
    completed.textContent = "1";
    const total = document.createElement("p");
    total.textContent = ` / ${messages.length}`;

    const previous = document.createElement("img");
    previous.src = "./static/Images/Icons/previous.svg";
    previous.addEventListener("click", () => {
        if (Number(completed.textContent) > 1){
            completed.textContent = Number(completed.textContent)-1;
            tutorialMessage(messages[completed.textContent-1]);
        }
    })
    const next = document.createElement("img");
    next.src = "./static/Images/Icons/next.svg";
    next.addEventListener("click", () => {
        if (Number(completed.textContent) < messages.length){
            completed.textContent = Number(completed.textContent)+1;
            tutorialMessage(messages[completed.textContent-1]);
        }
        if (Number(completed.textContent) == messages.length){
            tutorialPhase(nextPhaseNum);
        }
    })

    tutorialMessage(messages[0]);
    tutorialProgress.appendChild(previous);
    tutorialProgress.appendChild(completed);
    tutorialProgress.appendChild(total);
    tutorialProgress.appendChild(next);

    tutorialDiv.appendChild(tutorialProgress);
}
function tutorialPhase(phase){
    myPlayerNum = 0;

    const tutorialDiv = document.getElementById("tutorial");

    switch (phase){
        case 1:
            addTutorialProgressArrows([ "Click the arrows to navigate through parts of the tutorial.",
                                        "The game will be played over a series of rounds, where you will play cards, get coins, and buy new cards.",
                                        "Each player starts the game with the same cards in their Hand.",
                                        "Click the gray bar on the left to open the player display."
                                        ], 2, tutorialDiv)
            break;

        case 2:
            const playerDisplay = document.getElementById("playerDisplay");
            if (playerDisplay.style.visibility == "hidden"){
                playerDisplay.style.visibility = "visible";
                socket.emit("tutorialRequest", "setWaitingOn", "clickWork", myID);

                var displayBar = document.getElementById("playerDisplayVisibilityToggle");
                displayBar.addEventListener("click", tutorialOpenedHand);
                displayBar.addEventListener("click", () => {
                    socket.emit("getUpdatedCards", "hand", false, myID);
                })
            }
            break;
        
        case 3:
            socket.emit("tutorialRequest", "save", 3, myID);
            removePreviousElement(`.tutorialProgress`);
            tutorialMessage("Choose to 'Work'.");
            break;

        case 4:
            socket.emit("tutorialRequest", "save", 4, myID);
            socket.emit("tutorialRequest", "setWaitingOn", "", myID);
            removePreviousElement(`.tutorialProgress`);
            addTutorialProgressArrows([ "Whenever you play an action, you must choose a player to target.",
                                        "For some cards, this will matter, but the choice here is arbitrary.",
                                        "You may NEVER target yourself; all effects on the card apply to you, unless otherwise stated.",
                                        "Click on a player (the colored circles) to target them, then confirm your play."
                                        ], 5, tutorialDiv);
            populateCardBacks(3);
            break;

        case 5:
            var clickedBefore = document.getElementById("confirmAction");
            if (!clickedBefore){
                const myCard = document.querySelector(`#player0 .playedCard`);
                addPlayerTargeting(myCard, myPlayerNum, 3);

                const confirm = document.createElement("button");
                confirm.id = "confirmAction";
                confirm.textContent = "Confirm";
                confirm.addEventListener("click", () => {
                    const actionToPlayName = document.querySelector(`#player0 .playedCard .name`).textContent;
                    let targetPlayerNum = undefined;
                    const selectedPlayer = document.getElementById("selectedPlayer");
                    if (selectedPlayer){
                        targetPlayerNum = selectedPlayer.parentElement.id.slice(6);
                    }

                    if (actionToPlayName != undefined && targetPlayerNum != undefined){
                        for (let i = 0; i < 3; i++){
                            if (i != myPlayerNum){
                                const oldPlayerIcon = document.querySelector(`#player${i} .playerIcon`);
                                var newPlayerIcon = oldPlayerIcon.cloneNode(true);
                                oldPlayerIcon.parentNode.replaceChild(newPlayerIcon, oldPlayerIcon);
                            }
                        }
                        socket.emit("tutorialRequest", "confirmCard", ["Work", targetPlayerNum, false], myID);
                        confirm.remove();
                        orientCardToPlayer(1, 0, 3);
                        lockInCard(1)
                        orientCardToPlayer(2, 1, 3);
                        lockInCard(2);
                        tutorialPhase(6);
                    }  
                })
                bodyElement.appendChild(confirm);
            }
            break;

        case 6:
            socket.emit("tutorialRequest", "save", 6, myID);
            removePreviousElement(`.tutorialProgress`);
            tutorialHighlight("numCardSwaps", true);
            addTutorialProgressArrows([ "After each player has confirmed their action, they may spend a Card Swap token to change it.",
                                        "Each player starts the game with 1, and can earn more through card effects.",
                                        "Let's save ours for later. Click 'Carry On'."
                                        ], 7, tutorialDiv);
            break;
        
        case 7:
            var clickedBefore = document.getElementById("cardSwapPopUp");
            if (!clickedBefore){
                const cardSwapPopUp = document.createElement("div");
                cardSwapPopUp.id = "cardSwapPopUp";

                const useCardSwap = document.createElement("button");
                useCardSwap.textContent = "Use Card Swap";

                const keepActionAsIs = document.createElement("button");
                keepActionAsIs.textContent = "Carry On";
                keepActionAsIs.addEventListener("click", () => {
                    const currentTarget = document.querySelector(`#player0 .playedCard`).getAttribute("targetNum");
                    socket.emit("tutorialRequest", "confirmCard", ["Work", currentTarget, true], myID);
                    cardSwapPopUp.remove();
                    tutorialPhase(8);
                })

                cardSwapPopUp.appendChild(useCardSwap);
                cardSwapPopUp.appendChild(keepActionAsIs);   
                bodyElement.appendChild(cardSwapPopUp);
            }
            break;

        case 8:
            socket.emit("tutorialRequest", "save", 8, myID);
            removePreviousElement(`.tutorialProgress`);
            document.querySelector(`#player0 .handNum`).textContent = "11";
            document.querySelector(`#player1 .handNum`).textContent = "11";
            document.querySelector(`#player2 .handNum`).textContent = "11";
            tutorialHighlight("numCardSwaps", false);
            const work = allActions.find((action) => action.name == "Work");
            const cooperate = allActions.find((action) => action.name == "Cooperate");

            var grudgieCard = document.querySelector(`#player1 .playedCard`);
            generateCard(grudgieCard, cooperate, false);
            var pudgieCard = document.querySelector(`#player2 .playedCard`);
            generateCard(pudgieCard, work, false);
            addTutorialProgressArrows([ "Played actions are resolved clockwise, starting with the underlined player.",
                                        "At the end of each round, the underline rotates clockwise, so your turn order will change over time.",
                                        "One of the main ways you will earn coins is by <b>Working</b>.",
                                        "The value of a <b>Work</b> changes each round based on the total number of workers.",
                                        "A greater number of workers will make each <b>Work</b> yield fewer coins.",
                                        "Hover over the blue scorecard in the bottom-left corner to see exactly how these values correlate with this many players."
                                        ], 9, tutorialDiv);
            break;
        
        case 9:
            const workValueScorecard = document.getElementById("workValueScorecard");
            if (workValueScorecard.style.visibility == "hidden"){
                workValueScorecard.style.visibility = "visible";
                workValueScorecard.addEventListener("mouseenter", tutorialHoveredWorkScorecard);
            }
            break;

        case 10:
            socket.emit("tutorialRequest", "save", 10, myID);
            removePreviousElement(`.tutorialProgress`);
            tutorialHighlight("numCoins", true);
            document.querySelector(`#player0 .numCoins`).textContent = "4";
            document.querySelector(`#player2 .numCoins`).textContent = "4";
            var currentWorkValue = document.querySelector(`#workValueScorecard p`);
            currentWorkValue.textContent = "2";
            addTutorialProgressArrows([ "Since all 3 players are workers this round, each <b>Work</b> will only give 2 coins.",
                                        "You can see the current work value displayed on the scorecard.",
                                        "Grudgie's card modifies their work value by -2, so they won't receive any coins!",
                                        "That's not the only thing their card does, however.",
                                        "If the size/angle of a played card makes it difficult to read, you can enlarge it. Hover over Grudgie's card."
                                        ], 11, tutorialDiv);
            break;

        case 11:
            const cardToHover = document.querySelector(`#player1 .playedCard`);
            cardToHover.addEventListener("mouseenter", tutorialHoveredCard); 
            break;

        case 12:
            socket.emit("tutorialRequest", "save", 12, myID);
            removePreviousElement(`.tutorialProgress`);
            document.querySelector(`#player0 .numCoins`).textContent = "9";
            socket.emit("tutorialRequest", "setCoins", 9, myID);
            addTutorialProgressArrows([ "Grudgie's Cooperate gave us 5 coins. They are likely expecting at least a few back.",
                                        "Let's keep all of them.",
                                        "Enter a '0' and click 'Confirm'."
                                        ], 13, tutorialDiv);
            break;
        
        case 13:
            var clickedBefore = document.getElementById("donationScreen");
            if (!clickedBefore){
                promptDonation("", {playerName: "Grudgie"}, "tutorial")
            }
            break;
        
        case 14:
            socket.emit("tutorialRequest", "save", 14, myID);
            removePreviousElement(`.tutorialProgress`);
            tutorialHighlight("numCoins", false);
            socket.emit("tutorialRequest", "discardCard", "", myID);
            actionPhaseCleanUp(3);
            document.querySelector(`#player0 .discardNum`).textContent = "1";
            document.querySelector(`#player1 .discardNum`).textContent = "1";
            document.querySelector(`#player2 .discardNum`).textContent = "1";
            var currentWorkValue = document.querySelector(`#workValueScorecard p`);
            currentWorkValue.textContent = "";

            addTutorialProgressArrows([ "Actions you play are sent to your personal discard at the end of the round.",
                                        "Then, players can spend their coins to buy new cards from the Shop.",
                                        "We will get to that shortly.",
                                        "First, let's look at a card in some more detail to better understand what we'll be buying.",
                                        "If someone mentions an unfamiliar card, or if a card needs more clarification, you can search for it.",
                                        "Search for 'Bewitch', in the top-left corner."
                                        ], 15, tutorialDiv);
            break;

        case 15:
            const actionSearch = document.getElementById("actionSearch");
            if (actionSearch.style.visibility == "hidden"){
                addActionSearchListeners(true);
                actionSearch.style.visibility = "visible";
                actionSearch.querySelector(`input`).addEventListener("input", tutorialSearchedBewitch);
            }
            break;

        case 16:
            socket.emit("tutorialRequest", "save", 16, myID);
            removePreviousElement(`.tutorialProgress`);
            addTutorialProgressArrows([ "Bewitch is a special type of action called a One-Shot.",
                                        "One-Shots have powerful abilities, but can only be played once, returning to the Shop rather than your Discard.",
                                        "They can be distinguished by their unique name formatting and slightly darker background.",
                                        "All cards in the shop have a number in a gold circle on the left, denoting its cost in coins.",
                                        "This can differentiate Basic Actions (the ones in your starting Hand) from non-Basic Actions.",
                                        "The color of a card has no MECHANICAL impact, but can help identify a card's ability at a glance.",
                                        "Cards with an arrow affect the player it targets. (All cards still 'target' someone, even if they don't have an arrow.)",
                                        "Blue cards <b>Work</b>, making players who played one 'workers'.",
                                        "Red cards <b>Steal</b> coins from other players, making players who played one 'thieves'.",
                                        "Purple cards (like Bewitch) have a special effect that lasts beyond the normal action phase.",
                                        "Yellow cards have none of these defining features.",
                                        "Some cards are also green, but that will be explained in a later section.",
                                        "Finally, the text at the bottom of the card explains the exact effect it will have when played.",
                                        "Click on the COST of Bewitch to continue."
                                        ], 17, tutorialDiv);
            break
        
        case 17:
            const popUp = document.querySelector(`#blownUp`);
            const bewitchCost = popUp.querySelector(`.cost`);
            bewitchCost.addEventListener("click", () => {
                removePreviousElement(`#blownUp`);
                tutorialPhase(18);
            })
            break;

        case 18: 
            socket.emit("tutorialRequest", "save", 18, myID);
            document.querySelector(`#actionSearch input`).value = "";
            removePreviousElement(`#actionSearch div`);
            removePreviousElement(`.tutorialProgress`);
            addTutorialProgressArrows([ "Let's buy a new card!",
                                        "Click the gold bar on the right to look at the Shop."
                                        ], 19, tutorialDiv);
            break;

        case 19:
            const shopDisplay = document.getElementById("shopDisplay");
            if (shopDisplay.style.visibility == "hidden"){
                shopDisplay.style.visibility = "visible";
                var displayBar = document.getElementById("shopDisplayVisibilityToggle");
                displayBar.addEventListener("click", tutorialOpenedShop);
                displayBar.addEventListener("click", () => {
                    socket.emit("getUpdatedCards", "shop", false, myID)
                });
            }
            break;

        case 20:
            socket.emit("tutorialRequest", "save", 20, myID);
            removePreviousElement(`.tutorialProgress`);
            addTutorialProgressArrows([ "You can buy up to 3 <strong>different</strong> cards each round.",
                                        "If you buy more than 1, you'll get a rebate.",
                                        "Buying 2 cards will earn you 1 coin, while buying 3 will earn you 3.",
                                        "The coins are earned <strong>after</strong> your purchase, so you cannot use them this round.",
                                        "While all players can place their orders simultaneously, the orders will be resolved in turn-order.",
                                        "If you tried to place an order for an action that is now unavaiable, you will be prompted to place a new order.",
                                        "If you ever want to view clarifying details about a card in the shop, you can RIGHT-click it instead of searching for it.",
                                        "Let's buy a 'Curse' and a 'Bewitch'. (You may need to scroll through the shop if you cannot find them.)"
                                        ], 21, tutorialDiv);
            break;
    
        case 21:
            removePreviousElement(`#checkOutList`);
            createCheckOutList(9, true);
            socket.emit("tutorialRequest", "setWaitingOn", "buyCards", myID);
            socket.emit("getUpdatedCards", "shop", false, myID);
            break;

        case 22:
            socket.emit("tutorialRequest", "save", 22, myID);
            removePreviousElement(`.tutorialProgress`);
            tutorialHighlight("discardNum", true);
            document.querySelector(`#player0 .discardNum`).textContent = "3";
            document.querySelector(`#player0 .numCoins`).textContent = "1";
            document.querySelector(`#player1 .discardNum`).textContent = "1";
            document.querySelector(`#player1 .numCoins`).textContent = "2";
            document.querySelector(`#player2 .discardNum`).textContent = "2";
            document.querySelector(`#player2 .numCoins`).textContent = "0";
            socket.emit("tutorialRequest", "setWaitingOn", "", myID);
            addTutorialProgressArrows([ "Newly bought cards will go in your Discard, so you won't be able to play them next round.",
                                        "Open the player display again, and navigate to your Discard."
                                        ], 23, tutorialDiv);
            break;

        case 23:
            socket.emit("getUpdatedCards", "hand", false, myID);
            const discardToggle = document.getElementById("discardToggle");
            discardToggle.addEventListener("click", tutorialOpenedDiscard);
            break;
        
        case 24:
            socket.emit("tutorialRequest", "save", 24, myID);
            removePreviousElement(`.tutorialProgress`);
            tutorialHighlight("discardNum", false);
            tutorialHighlight("handNum", true);
            socket.emit("tutorialRequest", "setWaitingOn", "clickRest", myID);
            addTutorialProgressArrows([ "In order to play cards in your Discard, you must first add them to your Hand.",
                                        "You will get to do this when you 'Rest'.",
                                        "Go back to your Hand, read 'Rest', and click on it when you are ready to progress to the next round."
                                        ], 25, tutorialDiv);
            break;

        case 25:
            socket.emit("tutorialRequest", "setWaitingOn", "clickRest", myID);
            break;

        case 26:
            socket.emit("tutorialRequest", "save", 26, myID);
            removePreviousElement(`.tutorialProgress`);

            const oldStartPlayer = document.getElementById("startPlayer");
            oldStartPlayer.id = "";
            const newStartPlayer = document.querySelector(`#player1 .playerName`);
            newStartPlayer.id = "startPlayer";
            
            tutorialHighlight("handNum", false);
            document.querySelector(`#player0 .numCoins`).textContent = "3";
            document.querySelector(`#player1 .numCoins`).textContent = "4";
            document.querySelector(`#player2 .numCoins`).textContent = "2";
            addTutorialProgressArrows([ "At the start of each round (including the first), players get 2 coins.",
                                        "Then, players choose their action.",
                                        "Let's 'Prepare' so we can have more flexibility on future rounds."
                                        ], 27, tutorialDiv);
            populateCardBacks(3);
            break;

        case 27: 
            socket.emit("tutorialRequest", "setWaitingOn", "clickPrepare", myID);
            socket.emit("getUpdatedCards", "hand", false, myID);
            break;

        case 28:
            var clickedBefore = document.getElementById("confirmAction");
            if (!clickedBefore){
                const myCard = document.querySelector(`#player0 .playedCard`);
                const prepare = allActions.find((action) => action.name == "Prepare");
                generateCard(myCard, prepare, false)
                addPlayerTargeting(myCard, myPlayerNum, 3);

                const confirm = document.createElement("button");
                confirm.id = "confirmAction";
                confirm.textContent = "Confirm";
                confirm.addEventListener("click", () => {
                    let targetPlayerNum = undefined;
                    const selectedPlayer = document.getElementById("selectedPlayer");
                    if (selectedPlayer){
                        targetPlayerNum = selectedPlayer.parentElement.id.slice(6);
                    }

                    if (targetPlayerNum != undefined){
                        for (let i = 0; i < 3; i++){
                            if (i != myPlayerNum){
                                const oldPlayerIcon = document.querySelector(`#player${i} .playerIcon`);
                                var newPlayerIcon = oldPlayerIcon.cloneNode(true);
                                oldPlayerIcon.parentNode.replaceChild(newPlayerIcon, oldPlayerIcon);
                            }
                        }
                        socket.emit("tutorialRequest", "confirmCard", ["Prepare", targetPlayerNum, false], myID);
                        confirm.remove();
                        orientCardToPlayer(1, 0, 3);
                        lockInCard(1)
                        orientCardToPlayer(2, 1, 3);
                        lockInCard(2);
                        tutorialPhase(29);
                    }  
                })
                bodyElement.appendChild(confirm);
            }
            break;
        
        case 29:
            socket.emit("tutorialRequest", "save", 29, myID);
            removePreviousElement(`.tutorialProgress`);
            addTutorialProgressArrows([ "Uh oh. It's looking like Grudgie might be holding a grudge.",
                                        "Use a Card Swap token to 'Retaliate' against Grudgie."
                                        ], 30, tutorialDiv);
            break;

        case 30:
            removePreviousElement(`.tutorialProgress`);
            const cardSwapPopUp = document.createElement("div");
            cardSwapPopUp.id = "cardSwapPopUp";

            const useCardSwap = document.createElement("button");
            useCardSwap.textContent = "Use Card Swap";
            useCardSwap.addEventListener("click", () => {
                document.querySelector(`#player0 .numCardSwaps`).textContent = "0";
                cardSwapPopUp.remove();
                actionPhaseCleanUp(1);

                const playedCard = document.querySelector(`#player0 .playedCard`);
                addPlayerTargeting(playedCard, myPlayerNum, 3);
                socket.emit("tutorialRequest", "setWaitingOn", "clickRetaliate", myID);
                socket.emit("getUpdatedCards", "hand", false, myID);

                const confirm = document.createElement("button");
                confirm.id = "confirmAction";
                confirm.textContent = "Confirm";
                confirm.addEventListener("click", () => {
                    const actionToPlayName = document.querySelector(`#player0 .playedCard .name`).textContent;
                    let targetPlayerNum = undefined;
                    const selectedPlayer = document.getElementById("selectedPlayer");
                    if (selectedPlayer){
                        targetPlayerNum = selectedPlayer.parentElement.id.slice(6);
                    }

                    if (actionToPlayName == "Retaliate" && targetPlayerNum == 1){
                        for (let i = 0; i < 3; i++){
                            if (i != myPlayerNum){
                                const oldPlayerIcon = document.querySelector(`#player${i} .playerIcon`);
                                var newPlayerIcon = oldPlayerIcon.cloneNode(true);
                                oldPlayerIcon.parentNode.replaceChild(newPlayerIcon, oldPlayerIcon);
                            }
                        }
                        socket.emit("tutorialRequest", "confirmCard", ["Retaliate", 1, true], myID);
                        confirm.remove();
                        tutorialPhase(32);
                    }  
                })
                bodyElement.appendChild(confirm);
            })

            const keepActionAsIs = document.createElement("button");
            keepActionAsIs.textContent = "Carry On";

            cardSwapPopUp.appendChild(useCardSwap);
            cardSwapPopUp.appendChild(keepActionAsIs);   
            bodyElement.appendChild(cardSwapPopUp);
            break;

        case 31:
            const playedCard = document.querySelector(`#player0 .playedCard`);
            const retaliate = allActions.find((action) => action.name == "Retaliate");
            generateCard(playedCard, retaliate, false);
            break;

        case 32:
            const steal = allActions.find((action) => action.name == "Steal");
            const prepare = allActions.find((action) => action.name == "Prepare");

            var grudgieCard = document.querySelector(`#player1 .playedCard`);
            generateCard(grudgieCard, steal);
            var pudgieCard = document.querySelector(`#player2 .playedCard`);
            generateCard(pudgieCard, prepare, false);
            tutorialPhase(33);

            var currentWorkValue = document.querySelector(`#workValueScorecard p`);
            currentWorkValue.textContent = "0";
            break;

        case 33:
            socket.emit("tutorialRequest", "save", 33, myID);
            document.querySelector(`#player0 .handNum`).textContent = "10";
            document.querySelector(`#player1 .handNum`).textContent = "10";
            document.querySelector(`#player2 .handNum`).textContent = "10";
            addTutorialProgressArrows([ "Even though Grudgie goes before us in turn order, our 'Retaliate' will block their 'Steal'.",
                                        "Green cards are always resolved before ANY non-green cards, regardless of turn order.",
                                        "If multiple green cards are played in the same round, the lowest numbered one takes priority.",
                                        "In the event that multiple players play the same green action, regular turn order determines which is resolved first.",
                                        ""
                                        ], 34, tutorialDiv);
            break;

        case 34:
            socket.emit("tutorialRequest", "save", 34, myID);
            removePreviousElement(`.tutorialProgress`);
            addTutorialProgressArrows([ "The number of coins taken by a <b>Steal</b> is determined by how many players are <b>stealing</b> from your target.",
                                        "The more thieves targeting a single player, the fewer coins each thief will <b>Steal</b>.",
                                        "Hover over the red scorecard in the bottom-left to see exactly how many coins doubled-up thieves <b>Steal</b>."
                                        ], 35, tutorialDiv);
            break;

        case 35:
            const stealValueScorecard = document.getElementById("stealValueScorecard");
            if (stealValueScorecard.style.visibility == "hidden"){
                stealValueScorecard.style.visibility = "visible";
                stealValueScorecard.addEventListener("mouseenter", tutorialHoveredStealScorecard);
            }
            break;

        case 36:
            socket.emit("tutorialRequest", "save", 36, myID);
            removePreviousElement(`.tutorialProgress`);
            animateCoinTransfer(1, 0, 4, 3)
            document.querySelector(`#player0 .numCoins`).textContent = "10";
            document.querySelector(`#player1 .numCoins`).textContent = "0";
            document.querySelector(`#player2 .numCardSwaps`).textContent = "4";
            addTutorialProgressArrows([ "That's all you need to know to become a masterful conspirator.",
                                        "...",
                                        "...",
                                        "Oh, you want to learn how to win?",
                                        "*sigh* I guess...",
                                        "Once a player has at least <strong>20</strong> cards in their Hand, the end of the game has been triggered.",
                                        "Any players who reached this milestone will earn 10 additional points.",
                                        "Then, players add the cost of all actions in their Hand and Discard, earning points equal to <b>half</b> this number, rounded down.",
                                        "Finally, players will earn a point for every coin in their possession at the end of the game.",
                                        "Now it is truly time to say goodbye.",
                                        "Click 'Leave Tutorial' in the top-right."
                                        ], 37, tutorialDiv);
            break;
    }
}
function tutorialOpenedHand(){
    const displayBar = document.getElementById("playerDisplayVisibilityToggle");
    displayBar.removeEventListener("click", tutorialOpenedHand);
    tutorialPhase(3);
}
function tutorialHoveredWorkScorecard(){
    const workValueScorecard = document.getElementById("workValueScorecard");
    workValueScorecard.removeEventListener("mouseenter", tutorialHoveredWorkScorecard)
    setTimeout(() => {
        tutorialPhase(10);
    }, 500);
}
function tutorialHoveredCard(){
    const cardToHover = document.querySelector(`#player1 .playedCard`);
    setTimeout(() => {
        if (cardToHover.matches(":hover")){
            cardToHover.removeEventListener("mouseenter", tutorialHoveredCard);
            setTimeout(() => {
                tutorialPhase(12);
            }, 750)
        }
    }, 250)
}
function tutorialSearchedBewitch(){
    const actionSearch = document.getElementById("actionSearch");
    const input = actionSearch.querySelector(`input`);
    if (input.value == "Bewitch"){
        input.removeEventListener("input", tutorialSearchedBewitch);
        tutorialPhase(16);
    }
}
function tutorialOpenedShop(){
    const displayBar = document.getElementById("shopDisplayVisibilityToggle");
    displayBar.removeEventListener("click", tutorialOpenedShop);
    tutorialPhase(20);
}
function tutorialOpenedDiscard(){
    const displayToggle = document.getElementById("discardToggle");
    displayToggle.removeEventListener("click", tutorialOpenedDiscard);
    tutorialPhase(24);
}
function tutorialHoveredStealScorecard(){
    const stealValueScorecard = document.getElementById("stealValueScorecard");
    stealValueScorecard.removeEventListener("mouseenter", tutorialHoveredStealScorecard)
    setTimeout(() => {
        tutorialPhase(36);
    }, 500);
}
function tutorialHighlight(className, makeColorful){
    const relevantNums = document.querySelectorAll(`.${className}`)
    relevantNums.forEach((num) => {
        const relevantDiv = num.parentElement;
        if (makeColorful){
            relevantDiv.style.filter = "invert(50%) sepia(100%) saturate(1000%) hue-rotate(90deg)";
        }
        else{
            relevantDiv.style.filter = "";
        }
    })
}
function loadPreviousTutorialSteps(phase, target){
    socket.emit("tutorialRequestion", "setWaitingOn", "", myID);

    // reveal hidden elements
    document.getElementById("playerDisplay").style.visibility = "visible";
    const playerToggle = document.getElementById("playerDisplayVisibilityToggle");
    playerToggle.addEventListener("click", () => {
        socket.emit("getUpdatedCards", "hand", false, myID);
    })
    if (phase >= 10){
        const workValueScorecard = document.getElementById("workValueScorecard");
        workValueScorecard.style.visibility = "visible";
    }
    if (phase >= 16){
        const actionSearch = document.getElementById("actionSearch");
        addActionSearchListeners(true);
        actionSearch.style.visibility = "visible";
    }
    if (phase >= 20){
        const shopDisplay = document.getElementById("shopDisplay");
        shopDisplay.style.visibility = "visible";
        const shopToggle = document.getElementById("shopDisplayVisibilityToggle");
        shopToggle.addEventListener("click", () => {
            socket.emit("getUpdatedCards", "shop", false, myID)
        });
    }
    if (phase == 36){
        const stealValueScorecard = document.getElementById("stealValueScorecard");
        stealValueScorecard.style.visibility = "visible";
    }

    // update player card
    if (4 <= phase && phase <= 12){
        const work = allActions.find((action) => action.name == "Work");
        const myPlayedCard = document.querySelector(`#player0 .playedCard`);
        generateCard(myPlayedCard, work, false);
    }
    else if (phase == 16){
        const bewitch = allActions.find((action) => action.name == "Bewitch");
        blowUpAction(bewitch, false, false);
    }
    else if (phase == 29){
        const prepare = allActions.find((action) => action.name == "Prepare");
        const myPlayedCard = document.querySelector(`#player0 .playedCard`);
        generateCard(myPlayedCard, prepare, false);
    }
    else if (phase >= 33){
        const retaliate = allActions.find((action) => action.name == "Retaliate");
        const myPlayedCard = document.querySelector(`#player0 .playedCard`);
        generateCard(myPlayedCard, retaliate, false);
    }

    // update opponent cards
    if (phase == 6 || phase == 26 || phase == 29){
        populateCardBacks(3);
    }
    else if (phase == 10 || phase == 12){
        const work = allActions.find((action) => action.name == "Work");
        const cooperate = allActions.find((action) => action.name == "Cooperate");

        const grudgieCard = document.querySelector(`#player1 .playedCard`);
        generateCard(grudgieCard, cooperate, false);
        const pudgieCard = document.querySelector(`#player2 .playedCard`);
        generateCard(pudgieCard, work, false);
    }

    else if (phase >= 33){
        const steal = allActions.find((action) => action.name == "Steal");
        const prepare = allActions.find((action) => action.name == "Prepare");

        const grudgieCard = document.querySelector(`#player1 .playedCard`);
        generateCard(grudgieCard, steal, false);
        const pudgieCard = document.querySelector(`#player2 .playedCard`);
        generateCard(pudgieCard, prepare, false);
    }

    // orient cards
    if ((6 <= phase && phase <= 12) || 29 <= phase){
        orientCardToPlayer(0, target, 3)
        orientCardToPlayer(1, 0, 3);
        orientCardToPlayer(2, 1, 3);
        lockInCard(0)
        lockInCard(1)
        lockInCard(2);
    }
    
    // update stats
    // handNum
    if (phase >= 34){
        document.querySelector(`#player0 .handNum`).textContent = "10";
        document.querySelector(`#player1 .handNum`).textContent = "10";
        document.querySelector(`#player2 .handNum`).textContent = "10";
    }
    else if (phase >= 10){
        document.querySelector(`#player0 .handNum`).textContent = "11";
        document.querySelector(`#player1 .handNum`).textContent = "11";
        document.querySelector(`#player2 .handNum`).textContent = "11";
    }

    // discardNum
    if (16 <= phase && phase <= 20){
        document.querySelector(`#player0 .discardNum`).textContent = "1";
        document.querySelector(`#player1 .discardNum`).textContent = "1";
        document.querySelector(`#player2 .discardNum`).textContent = "1";
    }
    else if (phase >= 24){
        document.querySelector(`#player0 .discardNum`).textContent = "3";
        document.querySelector(`#player1 .discardNum`).textContent = "1";
        document.querySelector(`#player2 .discardNum`).textContent = "2";
    }

    //numCoins
    if (10 <= phase && phase <= 20){
        document.querySelector(`#player2 .numCoins`).textContent = "4";
    }
    if (14 <= phase && phase <= 20){
        document.querySelector(`#player0 .numCoins`).textContent = "9";
    }
    else if (phase == 24){
        document.querySelector(`#player0 .numCoins`).textContent = "1";
        document.querySelector(`#player1 .numCoins`).textContent = "2";
        document.querySelector(`#player2 .numCoins`).textContent = "0";
    }
    else if (phase >= 29){
        document.querySelector(`#player0 .numCoins`).textContent = "3";
        document.querySelector(`#player1 .numCoins`).textContent = "4";
        document.querySelector(`#player2 .numCoins`).textContent = "2";
    } 

    // startPlayer
    if (phase > 26){
        const oldStartPlayer = document.getElementById("startPlayer");
        oldStartPlayer.id = "";
        const newStartPlayer = document.querySelector(`#player1 .playerName`);
        newStartPlayer.id = "startPlayer";
    }

    // workValue
    if (phase == 12){
        const currentWorkValue = document.querySelector(`#workValueScorecard p`);
        currentWorkValue.textContent = "2";
    }
    else if (phase >= 33){
        const currentWorkValue = document.querySelector(`#workValueScorecard p`);
        currentWorkValue.textContent = "0";
    }
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
    const anglePerPlayer = Math.PI / numPlayers
    let distanceFromLeft = 0;
    if (targetPlayerNum > myPlayerNum){
        distanceFromLeft = targetPlayerNum - myPlayerNum;
    }
    else{
        distanceFromLeft = numPlayers - (myPlayerNum - targetPlayerNum);
    }
    const angleFromLeft = anglePerPlayer * distanceFromLeft;
    return (angleFromLeft - Math.PI);
}

function orientCardToPlayer(originPlayerNum, targetPlayerNum, numPlayers){
    const playedCard = document.querySelector(`#player${originPlayerNum} .playedCard`);
    playedCard.setAttribute("targetNum", targetPlayerNum);
    const targetAngle = calculateTargetAngle(originPlayerNum, targetPlayerNum, numPlayers);
    playedCard.style.transform = "translateX("+(10 + 5*Math.sin(targetAngle))+"vh) translateY("+(-15*Math.cos(targetAngle))+"vh) rotate("+(targetAngle)+"rad)";       
}

function populateGameSpace(players){
    const thisPlayer = players.find((player) => player.playerID == myID);
    myPlayerNum = thisPlayer.playerNum;
    const gameSpace = document.getElementById("gameSpace");

    const radianOffset = Math.PI/2 - myPlayerNum*2*Math.PI/players.length;
    for (let i = 0; i < players.length; i++){
        const playerSpace = document.createElement("div");
        playerSpace.id = "player"+i;
        playerSpace.style.transform = "rotate("+(2*Math.PI * i/players.length + radianOffset)+"rad) translateX(25vh)"; 

        const playerIcon = document.createElement("div");
        playerIcon.classList.add("playerIcon");
        playerIcon.style.transform = "rotate("+(-2*Math.PI * i/players.length - radianOffset)+"rad)";
        playerIcon.style.boxShadow = `0 0 10vh 10px ${players[i].playerColor[0]} inset`;

        const playedCard = document.createElement("div");
        playedCard.classList.add("playedCard");
        playedCard.style.transform = "translateX(5vh) rotate(-90deg)";

        if (i == myPlayerNum){
            playedCard.addEventListener("click", () => {
                promptActionSelection(players[i], false);
            })
        }

        // blow up played cards on hover
        playedCard.addEventListener("mouseenter", () => {
            if (playedCard.hasAttribute("action")){
                setTimeout(() => {
                    if (playedCard.matches(":hover") && !document.getElementById("blownUp")){
                        const action = allActions.find((card) => card.name == playedCard.getAttribute("action"));
                        const blownUpAction = blowUpAction(action, true, false);

                        playedCard.style.opacity = "0.3";
                        playedCard.addEventListener("mouseleave", () => {
                            removePreviousElement(`#blownUp.inPlay`)
                            playedCard.style.opacity = "1.0";
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

function modifyBewitchedIcons(players){
    for (let i = 0; i < players.length; i++){
        const playerIcon = document.querySelector(`#player${i} .playerIcon`);
        if (players[i].isBewitched){
            const randNum = Math.floor(Math.random()*3);
            playerIcon.style.backgroundImage = `url(/static/Images/Misc/bewitched${randNum}.jpg)`;

        }
        else{
            playerIcon.style.backgroundImage = "";
        }
    }
}

function addScorecardListeners(numPlayers){
    for (let i = 0; i < 2; i++){
        let scorecard = undefined;
        let scorecardType = undefined;
        if (i == 0){
            scorecard = document.getElementById("workValueScorecard");
            scorecardType = "work";
        }
        else{
            scorecard = document.getElementById("stealValueScorecard");
            scorecardType = "steal";
        }

        scorecard.addEventListener("mouseenter", () => {
            const alreadyBlownUp = document.getElementById("blownUpScorecard");
            if (!alreadyBlownUp){
                blowUpScorecard(numPlayers, scorecardType);
            }
        })
        
        scorecard.addEventListener("mouseleave", () => {
            removePreviousElement(`#blownUpScorecard`);
        })
    }
}

function blowUpScorecard(numPlayers, scoreCardType){
    const blownUpScorecard = document.createElement("div");
    blownUpScorecard.id = "blownUpScorecard";
    
    const numPlayersTitle = document.createElement("p");
    const numCoinsTitle = document.createElement("p");
    numCoinsTitle.textContent = "Coins";

    blownUpScorecard.appendChild(numPlayersTitle);
    blownUpScorecard.appendChild(numCoinsTitle);

    for (let i = 1; i < numPlayers+1; i++){
        const playerNum = document.createElement("p");
        playerNum.textContent = i
        blownUpScorecard.appendChild(playerNum);
        const numCoins = document.createElement("p");
        switch (scoreCardType){
            case "work":
                switch (i){
                    case 1: 
                        numCoins.textContent = Math.min(7, numPlayers + 3);
                        break;
                    case 2:
                        numCoins.textContent = Math.min(5, numPlayers + 1);
                        break;
                    default:
                        numCoins.textContent = numPlayers + 2 - i;
                }
                break;

            case "steal":
                switch (i){
                    case 1: 
                        numCoins.textContent = 4;
                        break;
                    case 2:
                        numCoins.textContent = 3;
                        break;
                    default:
                        numCoins.textContent = 2;
                }
                break;
        }
        blownUpScorecard.appendChild(numCoins);
    }

    if (scoreCardType == "work"){
        blownUpScorecard.classList.add("work");
        numPlayersTitle.textContent = "Workers";
    }

    else if (scoreCardType == "steal"){
        blownUpScorecard.classList.add("steal");
        numPlayersTitle.textContent = "Thieves";
    }

    bodyElement.appendChild(blownUpScorecard);
}

function generateCard(div, action, isImpersonated){
    div.innerHTML = "";

    if (action){
        div.classList.remove("back");
        div.classList.add("card");
        if (action.isOneShot){
            div.classList.add("oneShot");
        }

        const name = document.createElement("p");
        name.innerHTML = action.name;
        if (action.isOneShot){
            name.innerHTML += "!";
        }
        name.classList.add("name")
        const text = document.createElement("p");
        text.innerHTML = action.text;
        text.classList.add("text");
            
        const cost = document.createElement("p");
        cost.classList.add("cost");
        cost.textContent = action.cost;

        const priority = document.createElement("p");
        priority.classList.add("priority");
        priority.textContent = action.priority;

        const background = document.createElement("img");
        background.classList.add("background");
        background.src = action.background;

        div.appendChild(name);
        div.setAttribute('action', action.name);
        div.appendChild(text);
        if (action.cost){
            div.appendChild(cost);
        }
        if (action.priority){
            div.appendChild(priority);
        }
            
        div.appendChild(background);

        if (isImpersonated){
            const mustache = document.createElement("img");
            mustache.src = "/static/Images/Misc/mustache.svg";
            mustache.classList.add("mustache");
            div.appendChild(mustache);
        }
    }
}

function blowUpAction(action, isInPlay, FAQOnly){
    removePreviousElement(`#blownUp`);

    const previewDisplay = document.createElement("div");
    previewDisplay.id = "blownUp";
    if (isInPlay){
        previewDisplay.classList.add("inPlay");
    }
    bodyElement.appendChild(previewDisplay);

    if (!FAQOnly){
        generateCard(previewDisplay, action, false)
    }
    else{
        previewDisplay.classList.add("FAQOnly");
    }

    if (action.FAQ){
        const actionFAQ = document.createElement("div");
        actionFAQ.classList.add("FAQ");
        action.FAQ.forEach((info) => {
            const tip = document.createElement("p");
            tip.innerHTML = info;
            actionFAQ.appendChild(tip);
            if (action.isOneShot){
                tip.classList.add("oneShot");
            }
        })
        previewDisplay.appendChild(actionFAQ);
    }
    
    return previewDisplay;
}

function addCardDisplayListeners(){
    const playerDisplayVisibilityToggle = document.getElementById("playerDisplayVisibilityToggle")
    playerDisplayVisibilityToggle.addEventListener("click", openClosePlayerDisplay);

    const discardToggle = document.getElementById("discardToggle");
    discardToggle.style.backgroundColor = "rgba(110, 110, 110, 0.83)";
    discardToggle.addEventListener("click", () => {
        socket.emit("getUpdatedCards", "discard", true, myID);
    })

    const handToggle = document.getElementById("handToggle");
    handToggle.style.backgroundColor = "rgba(0, 0, 0, 0.83)";
    handToggle.addEventListener("click", () => {
        socket.emit("getUpdatedCards", "hand", true, myID);
    })

    const shopDisplayVisibilityToggle = document.getElementById("shopDisplayVisibilityToggle");
    shopDisplayVisibilityToggle.addEventListener("click", openCloseShopDisplay);
}

function openCloseShopDisplay(){
    const shopDisplay = document.getElementById("shopDisplay");
    const sliderIcon = document.querySelector(`#shopDisplayVisibilityToggle img`);
    if (sliderIcon.src.includes("/static/Images/Icons/leftArrows.svg")){
        const playerSliderIcon = document.querySelector(`#playerDisplayVisibilityToggle img`);
        if (playerSliderIcon.src.includes("/static/Images/Icons/leftArrows.svg")){
            openClosePlayerDisplay()
        }

        shopDisplay.style.left = "calc(30vw)";
        sliderIcon.src = "/static/Images/Icons/rightArrows.svg";
    }
    else if (sliderIcon.src.includes("/static/Images/Icons/rightArrows.svg")){
        shopDisplay.style.left = "calc(100vw - max(3vw, 40px))";
        sliderIcon.src = "/static/Images/Icons/leftArrows.svg";
    }
}

function openClosePlayerDisplay(){
    const playerDisplay= document.getElementById("playerDisplay");
    const sliderIcon = document.querySelector(`#playerDisplayVisibilityToggle img`);
    if (sliderIcon.src.includes("/static/Images/Icons/rightArrows.svg")){
        const shopSliderIcon = document.querySelector(`#shopDisplayVisibilityToggle img`);
        if (shopSliderIcon.src.includes("/static/Images/Icons/rightArrows.svg")){
            openCloseShopDisplay()
        }

        playerDisplay.style.right = "calc(30vw)";
        sliderIcon.src = "/static/Images/Icons/leftArrows.svg";
    }
    else if (sliderIcon.src.includes("/static/Images/Icons/leftArrows.svg")){
        playerDisplay.style.right = "calc(100vw - max(3vw, 40px))";
        sliderIcon.src = "/static/Images/Icons/rightArrows.svg";
    }
}

function openRelevantPlayerDisplay(player, where, isTutorial){
    const discardToggle = document.getElementById("discardToggle");
    const handToggle = document.getElementById("handToggle");
    const sliderIcon = document.querySelector(`#playerDisplay .sliderIcon`);
    if (where == "hand"){
        handToggle.style.backgroundColor = "rgba(0, 0, 0, 0.83)";
        discardToggle.style.backgroundColor = "rgba(110, 110, 110, 0.83)";     
        displayCards(player, player.hand, "play", isTutorial);
    }
    else if (where == "discard"){
        handToggle.style.backgroundColor = "rgba(110, 110, 110, 0.83)";
        discardToggle.style.backgroundColor = "rgba(0, 0, 0, 0.83)";
        displayCards(player, player.discard, "play", isTutorial);
    }
    if (sliderIcon.src.includes("/static/Images/Icons/rightArrows.svg")){
        openClosePlayerDisplay();
    }
}

function displayCards(player, cardsToDisplay, why, isTutorial){
    const actionSelection = document.querySelector(`.actionSelection.${why}`);
    actionSelection.innerHTML = "";

    for (let i = 0; i < cardsToDisplay.length; i++){
        const actionDiv = document.createElement("div");
        const possibleAction = document.createElement("div");
        
        const card = allActions.find((card) => card.name == cardsToDisplay[i][0].name)
        generateCard(possibleAction, card, false)
        possibleAction.addEventListener("click", () => {
            if (isTutorial){
                if (player.waitingOn == "clickWork"){
                    if (card.name == "Work"){
                        const myPlayedCard = document.querySelector(`#player0 .playedCard`);
                        myPlayedCard.style.opacity = "1";
                        generateCard(myPlayedCard, card, false);
                        openClosePlayerDisplay();
                        tutorialPhase(4);
                    }
                }
                if (player.waitingOn == "buyCards"){
                    if (card.name == "Bewitch" || card.name == "Curse"){
                        if (possibleAction.classList.contains("selected")){
                            possibleAction.classList.remove("selected");
                        }
                        else {
                            possibleAction.classList.add("selected");
                        }
                        modifyCheckOutList(cardsToDisplay[i][0].name, cardsToDisplay[i][0].cost, true)
                    }   

                }
                if (player.waitingOn == "clickRest"){
                    if (card.name == "Rest"){
                        openClosePlayerDisplay();
                        socket.emit("tutorialRequest", "setWaitingOn", "", myID);
                        tutorialPhase(26);
                    }
                }
                if (player.waitingOn == "clickPrepare"){
                    if (card.name == "Prepare"){
                        openClosePlayerDisplay();
                        socket.emit("tutorialRequest", "setWaitingOn", "", myID);
                        tutorialPhase(28);
                    }
                }
                if (player.waitingOn == "clickRetaliate"){
                    if (card.name == "Retaliate"){
                        openClosePlayerDisplay();
                        socket.emit("tutorialRequest", "setWaitingOn", "", myID);
                        tutorialPhase(31);
                    }
                }
                
            }
            else if (JSON.stringify(cardsToDisplay) == JSON.stringify(player.hand) && !player.isReady && (player.waitingOn == "selectAction" || player.waitingOn == "useCardSwap")){
                const previousSelection = document.getElementById("selectedCard");
                if (previousSelection != undefined){
                    previousSelection.id = "";
                }
                actionDiv.id = "selectedCard";

                const myPlayedCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
                generateCard(myPlayedCard, cardsToDisplay[i][0], false);
                openClosePlayerDisplay();
            }
            else if (JSON.stringify(cardsToDisplay) == JSON.stringify(player.discard) && !player.isReady && player.waitingOn == "retrieveCards"){
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
                    if (remainingRetrievals.textContent == "0"){
                        document.getElementById("confirmRetrieve").disabled = false;
                    }
                }
                else if (numDuplicateRetrievals != undefined){
                    if (cardsToDisplay[i][1] > numDuplicateRetrievals.textContent && remainingRetrievals.textContent > 0){
                        numDuplicateRetrievals.textContent = Number(numDuplicateRetrievals.textContent) + 1;
                        remainingRetrievals.textContent = Number(remainingRetrievals.textContent) - 1;
                        if (remainingRetrievals.textContent == "0"){
                            document.getElementById("confirmRetrieve").disabled = false;
                        }
                    }
                    else{
                        remainingRetrievals.textContent = Number(remainingRetrievals.textContent) + Number(numDuplicateRetrievals.textContent);
                        numDuplicateRetrievals.parentNode.remove();
                        document.getElementById("confirmRetrieve").disabled = true;
                    } 
                }
            }
            else if (why == "buy" && !player.isReady && player.waitingOn == "buyCards"){
                modifyCheckOutList(cardsToDisplay[i][0].name, cardsToDisplay[i][0].cost, false);
            }
        })
        possibleAction.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            if (why == "buy"){
                blowUpAction(card, false, true);
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

function promptActionSelection(player, isTutorial){
    const waitingOnCard = document.getElementById("confirmAction");
    if (waitingOnCard != undefined){
        openRelevantPlayerDisplay(player, "hand", isTutorial);
    }
}

function actionSelection(players, myPlayerNum, originalCard){
    const myCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
    myCard.style.opacity = "1";
    promptActionSelection(players[myPlayerNum], false);

    // orients card to target player 
    addPlayerTargeting(myCard, myPlayerNum, players.length)

    const confirm = document.createElement("button");
    confirm.id = "confirmAction";
    confirm.textContent = "Confirm";
    confirm.addEventListener("click", () => {
        const actionToPlayName = document.querySelector(`#player${myPlayerNum} .playedCard .name`).textContent;
        let targetPlayerNum = undefined;
                const previousSelection = document.getElementById("selectedPlayer");
                if (previousSelection){
                    targetPlayerNum = previousSelection.parentElement.id.slice(6);
                }

        if (actionToPlayName != undefined && targetPlayerNum != undefined){
            const actionToPlay = players[myPlayerNum].hand.find((action) => actionToPlayName.startsWith(action[0].name));
            if (!players[myPlayerNum].isBewitched || actionToPlay[0].isBasicAction){
                socket.emit("chosenAction", myPlayerNum, actionToPlay[0], targetPlayerNum, Boolean(originalCard), myID);
                removeAllPlayerTargeting(players.length);
                confirm.remove();
            }
            else{
                displayNotification("You are bewitched and can only play Basic Actions.", "error")
            }
        }  
    })
    bodyElement.appendChild(confirm);
}

function addPlayerTargeting(card, playerNum, numPlayers){
    for (let i = 0; i < numPlayers; i++){
        if (i != playerNum){
            const playerIcon = document.querySelector(`#player${i} .playerIcon`);
            playerIcon.addEventListener("mouseenter", () => {
                let targetPlayerNum = undefined;
                const previousSelection = document.getElementById("selectedPlayer");
                if (previousSelection){
                    targetPlayerNum = previousSelection.parentElement.id.slice(6);
                }
                if (!targetPlayerNum || playerNum != myPlayerNum){
                    orientCardToPlayer(playerNum, i, numPlayers);
                }
            })

            playerIcon.addEventListener("click", () => {
                if (playerNum == myPlayerNum){
                    let targetPlayerNum = undefined;
                    const previousSelection = document.getElementById("selectedPlayer");
                    if (previousSelection){
                        targetPlayerNum = previousSelection.parentElement.id.slice(6);
                    }

                    if (targetPlayerNum == undefined){
                        card.style.border = "3px solid black";
                        playerIcon.id = "selectedPlayer";
                    }
                    else if (targetPlayerNum == i){
                        card.style.border = "3px dashed cyan";
                        playerIcon.id = "";
                    }
                    else{
                        previousSelection.id = "";
                        playerIcon.id = "selectedPlayer";
                        orientCardToPlayer(playerNum, i, numPlayers);
                    }
                }
                else{
                    removeAllPlayerTargeting(numPlayers)
                }
            })
        }
    }
}

function removeAllPlayerTargeting(numPlayers){
    for (let i = 0; i < numPlayers; i++){
        const oldPlayerIcon = document.querySelector(`#player${i} .playerIcon`);
        const newPlayerIcon = oldPlayerIcon.cloneNode(true);
        oldPlayerIcon.replaceWith(newPlayerIcon);
    }
}

function lockInCard(playerNum){
    const playerCard = document.querySelector(`#player${playerNum} .playedCard`);
    playerCard.style.opacity = "1";
    playerCard.style.border = "3px solid black";
}

function allowCardSwaps(players){
    players.forEach((player) => {
        const playedCard = document.querySelector(`#player${player.playerNum} .playedCard`);
        orientCardToPlayer(player.playerNum, player.currentTarget, players.length);
    })

    const originalCard = players[myPlayerNum].playedCard;
    const originalTarget = players[myPlayerNum].currentTarget;

    const cardSwapPopUp = document.createElement("div");
    cardSwapPopUp.id = "cardSwapPopUp";

    const useCardSwap = document.createElement("button");
    useCardSwap.textContent = "Use Card Swap";
    useCardSwap.addEventListener("click", () => {
        cardSwapPopUp.remove();
        actionSelection(players, myPlayerNum, originalCard);
    })
    if (players[myPlayerNum].numCardSwaps < 1){
        useCardSwap.disabled = true;
        useCardSwap.title = "You are out of Card Swap tokens!"
    }

    const keepActionAsIs = document.createElement("button");
    keepActionAsIs.textContent = "Carry On";
    keepActionAsIs.addEventListener("click", () => {
        cardSwapPopUp.remove();
        socket.emit("chosenAction", myPlayerNum, originalCard, originalTarget, true, myID);
    })

    cardSwapPopUp.appendChild(useCardSwap);
    cardSwapPopUp.appendChild(keepActionAsIs);   
    bodyElement.appendChild(cardSwapPopUp); 
}

function revealActions(players){
    players.forEach((player) => {
        const playedCard = document.querySelector(`#player${player.playerNum} .playedCard`);
        generateCard(playedCard, player.playedCard, player.isImpersonating);
        orientCardToPlayer(player.playerNum, player.currentTarget, players.length);
    })
}

function animateCoinTransfer(playerFrom, playerTo, numCoins, numPlayers){
    const elementFrom = document.querySelector(`#player${playerFrom} .playerIcon`);
    const elementTo = document.querySelector(`#player${playerTo} .playerIcon`);
    const rectFrom = elementFrom.getBoundingClientRect();
    const rectTo = elementTo.getBoundingClientRect();
    const coordFrom = [(rectFrom.left + rectFrom.right) / 2, (rectFrom.top + rectFrom.bottom) / 2];
    const coordTo = [(rectTo.left + rectTo.right) / 2, (rectTo.top + rectTo.bottom) / 2];

    const angle = Math.atan2(coordFrom[1] - coordTo[1], coordFrom[0] - coordTo[0]) * 180 / Math.PI;

    for (let i = 0; i < numCoins; i++){
        setTimeout(() => {
            const coin = document.createElement("div");
            coin.classList.add("coin");
            const arc = Math.floor(Math.random()*50);
            const direction = Math.floor(Math.random()*2);

            coin.style.offsetPath = `path("M ${coordFrom[0]},${coordFrom[1]} A ${arc} ${100} ${angle + 90} 0 ${direction} ${coordTo[0]},${coordTo[1]}")`;
            bodyElement.appendChild(coin);

            setTimeout(() => {
                coin.remove()
            }, 2000);

            coin.animate([
                { offsetDistance: "0%" },
                { offsetDistance: "100%" }
                ], {
                duration: 2000,
                easing: 'ease-in-out'
            });
        }, i*200);
    }
}

function createCheckOutList(coinsToSpend, isTutorial){
    const checkOutList = document.createElement("div");
    checkOutList.id  = "checkOutList";
    bodyElement.appendChild(checkOutList);
    const bottomRow = document.createElement("div");

    const finalizePurchase = document.createElement("button");
    finalizePurchase.textContent = "BUY";
    finalizePurchase.addEventListener("click", () => {
        const actionsToBuy = [];
        const namesOfActions = checkOutList.querySelectorAll(`.name`);
        namesOfActions.forEach((entry) => {
            const action = allActions.find((action) => action.name == entry.textContent);
            actionsToBuy.push(action);
        })

        if (isTutorial){
            const curse = allActions.find((action) => action.name == "Curse");
            const bewitch = allActions.find((action) => action.name == "Bewitch");
            if ((actionsToBuy[0] == curse || actionsToBuy[0] == bewitch)&&(actionsToBuy[1] == curse || actionsToBuy[1] == bewitch)){
                socket.emit("logAttemptedPurchase", actionsToBuy, myID);
                tutorialPhase(22);
                openCloseShopDisplay();
                const selectedActions = document.querySelectorAll(`#shopDisplay .selected`);
                selectedActions.forEach((action) => action.classList.remove("selected"));
                checkOutList.remove();
            }
        }
        else{ 
            socket.emit("logAttemptedPurchase", actionsToBuy, myID);
            const selectedActions = document.querySelectorAll(`#shopDisplay .selected`);
            selectedActions.forEach((action) => action.classList.remove("selected"));
            checkOutList.remove();
        }
    })
    const coinIcon = document.createElement("img");
    coinIcon.src = "static/Images/Icons/coins.svg";

    const remainingCoins = document.createElement("div");
    remainingCoins.classList.add("coinDiv");
    const numRemainingCoins = document.createElement("p");
    numRemainingCoins.classList.add("leftover");
    numRemainingCoins.textContent = coinsToSpend;
    remainingCoins.appendChild(coinIcon);
    remainingCoins.appendChild(numRemainingCoins);

    const rebate = document.createElement("p");
    rebate.classList.add("rebate");
    rebate.textContent = "+0";

    bottomRow.appendChild(finalizePurchase);
    bottomRow.appendChild(remainingCoins);
    bottomRow.appendChild(rebate);
    checkOutList.appendChild(bottomRow);

    const coinRow = document.createElement("div");
    const myCoins = document.createElement("div");
    myCoins.classList.add("coinDiv");
    const numMyCoins = document.createElement("p");
    numMyCoins.classList.add("myCoins");
    numMyCoins.textContent = coinsToSpend;
    const clonedIcon = coinIcon.cloneNode(true);
    myCoins.appendChild(clonedIcon);
    myCoins.appendChild(numMyCoins);

    const totalCost = document.createElement("p");
    totalCost.classList.add("sum");
    totalCost.textContent = "-0";

    coinRow.appendChild(myCoins);
    coinRow.appendChild(totalCost);
    checkOutList.appendChild(coinRow);
}

function modifyCheckOutList(actionName, actionCost){
    const checkOutList = document.getElementById("checkOutList");
    const shopAction = document.querySelector(`#shopDisplay [action = "${actionName}"]`)
    const existingEntry = checkOutList.querySelector(`[action = "${actionName}"]`)
    if (existingEntry){
        shopAction.classList.remove("selected");
        existingEntry.remove()

        const totalCost = checkOutList.querySelector(`.sum`);
        totalCost.textContent = Number(totalCost.textContent) + actionCost;
        if (totalCost.textContent == "0"){
            totalCost.textContent = "-0";
        }
        const remainingCoins = checkOutList.querySelector(`.leftover`);
        remainingCoins.textContent = Number(remainingCoins.textContent) + actionCost

        const rebate = checkOutList.querySelector(`.rebate`);
        if (rebate.textContent == "+1"){
            rebate.textContent = "+0";
        }
        else if (rebate.textContent == "+3"){
            rebate.textContent = "+1";
        }
    }

   else{
        const remainingCoins = checkOutList.querySelector(`.leftover`);
        console.log(checkOutList.childElementCount)
        if (checkOutList.childElementCount < 5){
            if (Number(remainingCoins.textContent) >= actionCost){
                shopAction.classList.add("selected");

                remainingCoins.textContent = Number(remainingCoins.textContent) - actionCost;
                const totalCost = checkOutList.querySelector(`.sum`);
                totalCost.textContent = Number(totalCost.textContent) - actionCost;

                const newEntry = document.createElement("div");
                newEntry.setAttribute("action", actionName);
                const name = document.createElement("p")
                name.classList.add("name");
                name.textContent = actionName;
                const cost = document.createElement("p");
                cost.classList.add("cost");
                cost.textContent = actionCost;

                newEntry.appendChild(name);
                newEntry.appendChild(cost);
                checkOutList.appendChild(newEntry);

                const rebate = checkOutList.querySelector(`.rebate`);
                if (checkOutList.childElementCount == 4){
                    rebate.textContent = "+1";
                }
                else if (checkOutList.childElementCount == 5){
                    rebate.textContent = "+3"
                }
            }

            else{
                displayNotification("You do not have enough coins for this purchase.", "error");
                openCloseShopDisplay();
            }
        }
        else{
            displayNotification("You can only buy 3 cards each round.", "error");
            openCloseShopDisplay();
        }
    }
}

function retrieveCards(player, numCardsToRetrieve){
    openRelevantPlayerDisplay(player, "discard", false);

    const retrieveDiv = document.createElement("div");
    retrieveDiv.id = "retrieveDiv";

    const remainingRetrievalTitle = document.createElement("p");
    remainingRetrievalTitle.textContent = "Remaining Cards to Return";
    const remainingRetrievals = document.createElement("p");
    remainingRetrievals.id = "remainingRetrievals"
    remainingRetrievals.textContent = numCardsToRetrieve;

    const confirm = document.createElement("button");
    confirm.textContent = "Confirm";
    confirm.id = "confirmRetrieve";
    confirm.disabled = true;
    confirm.addEventListener("click", () => {
        const retrievedActionNums = document.querySelectorAll(".retrieveIcon p");
        const allRetrievedCards = [];
        let numTotalRetrievals = 0;
        retrievedActionNums.forEach(actionNum => {
            const actionName = actionNum.parentElement.parentElement.firstChild.getAttribute("action");
            const returnedAction = player.discard.find((card) => card[0].name == actionName);
            const numToReturn = Number(actionNum.textContent);
            if (returnedAction[1] >= numToReturn){
                allRetrievedCards.push([returnedAction[0], numToReturn]);
                numTotalRetrievals += numToReturn
            }
        })
        console.log(numTotalRetrievals);
        console.log(allRetrievedCards);

        if (numTotalRetrievals == numCardsToRetrieve){
            socket.emit("returnCardsToHand", myPlayerNum, allRetrievedCards, myID);
            socket.emit("getUpdatedCards", "discard", false, myID);
            retrieveDiv.remove();
            openClosePlayerDisplay();
        }        
    })

    retrieveDiv.appendChild(remainingRetrievalTitle);
    retrieveDiv.appendChild(remainingRetrievals);
    retrieveDiv.appendChild(confirm);
    bodyElement.appendChild(retrieveDiv);
}

function promptDonation(giver, receiver, donationType){
    const donationScreen = document.createElement("div");
    donationScreen.id = "donationScreen";

    const contextMessage = document.createElement("p");
    contextMessage.id = "donationContext";
    donationScreen.appendChild(contextMessage);

    const donationEntry = document.createElement("input");
    donationEntry.type = "text";
    donationEntry.maxLength = 1;
    donationScreen.appendChild(donationEntry);

    if (donationType == "cooperate" || donationType == "tutorial"){
        contextMessage.textContent = "How many coins will you return to "+receiver.playerName+"?";
    }
    else if (donationType == "honor"){
        contextMessage.textContent = "How many coins will you take?";
        donationEntry.addEventListener("input", () => {
            if (donationEntry.value >= 0 && donationEntry.value <= 4){
                contextMessage.textContent = "You will take " + donationEntry.value + ", leaving " + receiver.playerName + " " + (4 - Number(donationEntry.value)) * 3 + " coins.";
            }
            else{
                contextMessage.textContent = "Enter a number 0-4 to decide how many coins YOU will take"
            }
        })
    }

    const submit = document.createElement("button");
    submit.id = "submit";
    submit.textContent = "Confirm";
    submit.addEventListener("click", () => {
        if (donationEntry.value >= 0 && donationEntry.value <= 4){
            donationScreen.remove();
            if (donationType == "tutorial"){
                if (donationEntry.value == 0){
                    tutorialPhase(14);
                }
            }
            else if (donationType == "cooperate"){
                socket.emit("returnedCooperation", giver.playerID, receiver.playerID, Number(donationEntry.value));
            } 
            else if (donationType == "honor"){
                socket.emit("honored", giver.playerID, receiver.playerID, Number(donationEntry.value));
            }
        }
    })
    donationScreen.appendChild(submit);    
    bodyElement.appendChild(donationScreen);
}

function promptImpersonate(numPlayers){
    const impersonateDiv = document.createElement("div");
    impersonateDiv.id = "impersonateDiv";

    const instruction = document.createElement("p");
    instruction.textContent = "Click on the card you wish to Impersonate";

    const confirm = document.createElement("button");
    confirm.textContent = "Confirm";
    confirm.disabled = true;
    confirm.addEventListener("click", () => {
        const myCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
        socket.emit("impersonated", myCard.getAttribute("action"), myID);
        impersonateDiv.remove();
        const playedCards = document.querySelectorAll(`.playedCard`);
        playedCards.forEach((card) => {
            const clone = card.cloneNode(true);
            card.replaceWith(clone);
        })
    })

    impersonateDiv.appendChild(instruction);
    impersonateDiv.appendChild(confirm);
    bodyElement.appendChild(impersonateDiv);

    for (let i = 0; i < 2; i++){
        const neighborModification = i*2 - 1;
        console.log(neighborModification)
        const neighborNum = (myPlayerNum + neighborModification + numPlayers) % numPlayers;
        console.log(neighborNum)
        const neighborCard = document.querySelector(`#player${neighborNum} .playedCard`);
        neighborCard.addEventListener("click", () => {
            const myCard = document.querySelector(`#player${myPlayerNum} .playedCard`);
            const selectedAction = allActions.find((action) => action.name == neighborCard.getAttribute("action"));
            generateCard(myCard, selectedAction, true);
            myCard.setAttribute("action", selectedAction.name);
            confirm.disabled = false;
            socket.emit("newImpersonatedCard", selectedAction, myPlayerNum, myID);
        })
    }
}

function promptRedirects(type){
    const playedCards = document.querySelectorAll(`.playedCard`);
    switch(type){
        case "whistle":
            playedCards.forEach((card) => {
                const target = card.getAttribute("targetNum");
                if ((target == myPlayerNum || 
                target == (myPlayerNum + 1) % playedCards.length ||
                target == (myPlayerNum - 1 + playedCards.length) % playedCards.length) &&
                card.parentElement.id.slice(6) != myPlayerNum){
                    card.classList.add("redirectable");
                    card.setAttribute("originalTarget", target);
                    card.addEventListener("click", () => {
                        // !! let user eaesilt switch from one neighbor to another
                        if (card.getAttribute("targetNum") != myPlayerNum){
                            orientCardToPlayer(card.parentElement.id.slice(6), myPlayerNum, playedCards.length);
                        }
                        else if (card.getAttribute("originalTarget") != myPlayerNum){
                            orientCardToPlayer(card.parentElement.id.slice(6), card.getAttribute("originalTarget"), playedCards.length);
                        }
                        else if (card.parentElement.id.slice(6) == (myPlayerNum + 1) % playedCards.length){
                            orientCardToPlayer(card.parentElement.id.slice(6), (myPlayerNum - 1 + playedCards.length) % playedCards.length, playedCards.length);   
                        }
                        else if (card.parentElement.id.slice(6) == (myPlayerNum - 1 + playedCards.length) % playedCards.length)
                            orientCardToPlayer(card.parentElement.id.slice(6), (myPlayerNum + 1) % playedCards.length, playedCards.length);
                        else{
                            addPlayerTargeting(card, card.parentElement.id.slice(6), playedCards.length);
                        }
                    })
                }
            })
            break;
        
        case "hijack":
            const myTarget = document.querySelector(`#player${myPlayerNum} .playedCard`).getAttribute("targetNum");
            playedCards.forEach((card) => {
                const target = card.getAttribute("targetNum");
                if (target == myTarget){
                    card.classList.add("redirectable");
                    card.setAttribute("originalTarget", target);
                    card.addEventListener("click", () => {
                        if (card.getAttribute("targetNum") != myTarget){
                            orientCardToPlayer(card.parentElement.id.slice(6), myTarget, playedCards.length);
                        }
                        else{
                            // !! allow user to choose new targets
                        }
                    })
                }
            })
            break;
    }

    const finalizeTargeting = document.createElement("button");
    finalizeTargeting.textContent = "Finalize Targeting";
    finalizeTargeting.addEventListener("click", () => {
        const newTargets = []
        finalizeTargeting.remove();
        const playedCards = document.querySelectorAll(`.playedCard`);
        playedCards.forEach((card) => {
            newTargets.push(card.getAttribute("targetNum"));
            const clone = card.cloneNode(true);
            card.replaceWith(clone);
        })
        socket.emit("finishedRedirecting", newTargets, myID);
    })
    bodyElement.appendChild(finalizeTargeting);
}

function createStats(players){
    for (let i = 0; i < players.length; i++){
        const statsDisplay = document.createElement("div");
        statsDisplay.classList.add("statsDisplay");

        const playerName = document.createElement("p");
        playerName.textContent = players[i].playerName;
        playerName.style.color = players[i].playerColor[0];
        playerName.classList.add("playerName");

        const coinDiv = document.createElement("div");
        const coinIcon = document.createElement("img");
        coinIcon.src = "static/Images/Icons/coins.svg";
        const numCoins = document.createElement("p");
        numCoins.classList.add("numCoins");
        coinDiv.appendChild(coinIcon);
        coinDiv.appendChild(numCoins);
        
        const cardSwapDiv = document.createElement("div");
        const cardSwapIcon = document.createElement("img");
        cardSwapIcon.src = "static/Images/Icons/cardSwap.svg";
        const numCardSwaps = document.createElement("p");
        numCardSwaps.classList.add("numCardSwaps");
        cardSwapDiv.appendChild(cardSwapIcon);
        cardSwapDiv.appendChild(numCardSwaps);

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
        discardIcon.style.transform = "rotate(90deg)";
        const numCardsInDiscard = document.createElement("p");
        numCardsInDiscard.classList.add("discardNum");
        discardDiv.appendChild(discardIcon);
        discardDiv.appendChild(numCardsInDiscard);

        statsDisplay.appendChild(playerName);
        statsDisplay.appendChild(handDiv);
        statsDisplay.appendChild(discardDiv);
        statsDisplay.appendChild(coinDiv);
        statsDisplay.appendChild(cardSwapDiv);
        
        const playerDiv = document.getElementById(`player${i}`);
        const playerRotation = playerDiv.style.transform.trim().split(/[()]\s*/)[1].slice(0, -3);
        const counterRotation = eval(playerRotation) * -1;

        if (Math.sign(Math.cos(playerRotation) < 0)){
            statsDisplay.style.transform = `rotate(${counterRotation}rad) translateX(${-23}vh) translateY(${Math.sin(playerRotation) * -3}vh)`;
        }
        else{
            statsDisplay.style.transform = `rotate(${counterRotation}rad) translateX(${23}vh) translateY(${Math.sin(playerRotation) * -3}vh)`;
        }

        playerDiv.appendChild(statsDisplay);        
    }
}

function updateStats(players, startPlayer){
    const previousStartPlayer = document.getElementById("startPlayer");
    if (previousStartPlayer){
        previousStartPlayer.id = "";
    }
    const newStartPlayer = document.querySelector(`#player${startPlayer} .playerName`);
    newStartPlayer.id = "startPlayer";

    for (let i = 0; i < players.length; i++){
        const numCardsInHand = document.querySelector(`#player${i} .statsDisplay .handNum`);
        numCardsInHand.textContent = calculateNumCards(players[i].hand);
        const numCardsInDiscard = document.querySelector(`#player${i} .statsDisplay .discardNum`);
        numCardsInDiscard.textContent = calculateNumCards(players[i].discard);
        const numCoins = document.querySelector(`#player${i} .statsDisplay .numCoins`);
        numCoins.textContent = players[i].numCoins;
        const numCardSwaps = document.querySelector(`#player${i} .statsDisplay .numCardSwaps`)
        numCardSwaps.textContent = players[i].numCardSwaps;
    }
}

function addActionSearchListeners(isTutorial){
    const actionSearch = document.getElementById("actionSearch");
    const autocompleteSuggestions = actionSearch.querySelector(`div`);
    const searchInput = actionSearch.querySelector(`input`);

    searchInput.addEventListener("input", () => {
        searchInput.value = searchInput.value.charAt(0).toUpperCase() + searchInput.value.slice(1).toLowerCase();

        autocompleteSuggestions.innerHTML = "";
        let actionToDisplay = undefined;
        allActions.forEach((action) => {
            if (searchInput.value != "" && action.name.startsWith(searchInput.value) && action.name != searchInput.value){
                const suggestion = document.createElement("p");
                suggestion.textContent = action.name;
                suggestion.addEventListener("click", () => {
                    setTimeout(() => {
                        searchInput.value = action.name;
                        searchInput.dispatchEvent(new Event("input"));
                    }, 50);
                })
                suggestion.addEventListener("mouseover", () => {
                    const alreadyHighlighted = actionSearch.querySelector(`.highlighted`)
                    if (alreadyHighlighted){
                        alreadyHighlighted.classList.remove("highlighted");
                    }
                    suggestion.classList.add("highlighted");
                })
                autocompleteSuggestions.appendChild(suggestion);
            }
            if (searchInput.value == action.name){
                actionToDisplay = action;
            }
        }) 

        if (!isTutorial){
            removePreviousElement(`#blownUp`);
            if (actionToDisplay){
                blowUpAction(actionToDisplay, false, false);
            }
        }
        else{
            if (actionToDisplay && actionToDisplay.name == "Bewitch" && !document.getElementById("blownUp")){
                blowUpAction(actionToDisplay, false, false);
            }
        }
        
    })
    searchInput.addEventListener("keydown", (e) => {
        const alreadyHighlighted = actionSearch.querySelector(`.highlighted`)
        const autocompleteSuggestions = actionSearch.querySelector(`div`);
        switch (e.key){
            case "ArrowDown":
                e.preventDefault(); 
                if (alreadyHighlighted){
                    alreadyHighlighted.classList.remove("highlighted");
                    if (alreadyHighlighted.nextSibling){
                        alreadyHighlighted.nextSibling.classList.add("highlighted");
                    }
                    else{
                        autocompleteSuggestions.firstChild.classList.add("highlighted");
                    }
                }
                else if (autocompleteSuggestions && autocompleteSuggestions.firstChild){
                    autocompleteSuggestions.firstChild.classList.add("highlighted");
                }
                break;

            case "ArrowUp":
                e.preventDefault(); 
                if (alreadyHighlighted){
                    alreadyHighlighted.classList.remove("highlighted");
                    if (alreadyHighlighted.previousSibling){
                        alreadyHighlighted.previousSibling.classList.add("highlighted");
                    }
                    else{
                        autocompleteSuggestions.lastChild.classList.add("highlighted");
                    }
                }
                else if (autocompleteSuggestions && autocompleteSuggestions.firstChild){
                    autocompleteSuggestions.lastChild.classList.add("highlighted");
                }
                break;

            case "Enter":
                e.preventDefault(); 
                if (alreadyHighlighted){
                    setTimeout(() => {
                        searchInput.value = alreadyHighlighted.textContent;
                        searchInput.dispatchEvent(new Event("input"));
                    }, 50);
                }
                break;
        }
    })

    document.addEventListener("click", (e) => {
        if (!actionSearch.contains(e.target)){
            if (!(isTutorial && searchInput.value == "Bewitch")){
                removePreviousElement(`#blownUp`);
                autocompleteSuggestions.innerHTML = "";
                searchInput.value = ""; 
            }           
        }
    })
}

function displayNotification(notification, notificationType){
    const notificationDiv = document.createElement("div");
    notificationDiv.classList.add("notificationDiv");

    const notificationIcon = document.createElement("img");
    if (notificationType == "info"){
        notificationIcon.src = "static/Images/Icons/notification_info.svg";
        notificationDiv.classList.add("info");
        setTimeout(() => {notificationDiv.remove()}, 40000);
    }
    else if (notificationType == "error"){
        notificationIcon.src = "static/Images/Icons/notification_error.svg";
        notificationDiv.classList.add("error");
        setTimeout(() => {notificationDiv.remove()}, 10000);
    }
    else if (notificationType == "warning"){
        notificationIcon.src = "static/Images/Icons/notification_warning.svg";
        notificationDiv.classList.add("warning");
        setTimeout(() => {notificationDiv.remove()}, 20000);
    }

    const notificationContent = document.createElement("p");
    notificationContent.id = "notification";
    notificationContent.innerHTML = notification;
    
    const namedActions = notificationContent.querySelectorAll(`span`);
    namedActions.forEach((action) => {
        const actionToBlowUp = allActions.find((toBlowUp) => toBlowUp.name == action.textContent);
        switch (actionToBlowUp.definingColor){
            case ("red"):
                action.style.color = "#BA0000";
                break;

            case ("blue"):
                action.style.color = "#41A7BF";
                break;

            case ("green"):
                action.style.color = "#24BC82";
                break;

            case ("purple"):
                action.style.color = "#9470DC";
                break;

            case ("yellow"):
                action.style.color = "#FFE166";
                break;

        }

        action.addEventListener("mouseenter", () => {
            blowUpAction(actionToBlowUp, false, false);
        })
        action.addEventListener("mouseleave", () => {
            removePreviousElement(`#blownUp`);
        })
    })

    const closeNotifiction = document.createElement("button");
    closeNotifiction.id = "closeNotification";
    closeNotifiction.textContent = "X";
    closeNotifiction.addEventListener("click", () => {
        notificationDiv.remove();
    })

    notificationDiv.appendChild(notificationIcon);
    notificationDiv.appendChild(notificationContent);
    notificationDiv.appendChild(closeNotifiction);
    const notificationCenter = document.getElementById("notificationCenter");

    let keepScrollPosition = true;
    if (notificationCenter.scrollTop == -1*(notificationCenter.scrollHeight - notificationCenter.offsetHeight)){
        keepScrollPosition = false;
    }
    notificationCenter.appendChild(notificationDiv);
    if (!keepScrollPosition){
        notificationCenter.scrollTop = -1*notificationCenter.scrollHeight;
    }
}

function populateCardBacks(numPlayers){
    for (let i = 0; i < numPlayers; i++){
        if (i != myPlayerNum){
            const playedCard = document.querySelector(`#player${i} .playedCard`);
            playedCard.classList.remove("card");
            playedCard.innerHTML = "";
            playedCard.classList.add("back");
        }
    }
}

function actionPhaseCleanUp(numPlayers){
    for (let i = 0; i < numPlayers; i++){
        const playedCard = document.querySelector(`#player${i} .playedCard`);
        playedCard.innerHTML = "";
        playedCard.removeAttribute("action");
        playedCard.classList.remove("card");
        playedCard.style.border = "3px dashed cyan";
        playedCard.style.opacity = "0.3";
        playedCard.style.transform = "translateX(5vh) rotate(-90deg)";
    }
    
    const workValueDisplay = document.querySelector(`#workValueScorecard p`);
    workValueDisplay.textContent = "";

    const selectedPlayer = document.getElementById("selectedPlayer");
    if (selectedPlayer){
        selectedPlayer.id = "";
    }
}

function tutorialMessage(message){
    const previousMessage = document.getElementById("tutorialMessage");
    previousMessage.innerHTML = message;
}

function removePreviousElement(query){
    const elementToRemove = document.querySelector(query);
    if (elementToRemove){
        elementToRemove.remove();
    }
}