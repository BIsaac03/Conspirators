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

socket.on("startTutorial", (players) => {
    startTutorial(players, 1);
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
    if (roomCode == "tutorial"){
        // !! first create function to catch up on previous tutorial changes
        startTutorial(players, reconnectedPlayer.tutorialPhase)
    }
    else if (!reconnectedPlayer.isInGame){
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
        createWorkValueScorecard(players.length, false, false);
        createStealValueScorecard(players.length, false, false);
        createStats(players);
        updateStats(players);
        createCardDisplay("player");
        createCardDisplay("shop");
        openClosePlayerDisplay();
        openCloseShopDisplay();
        displayCards(players[myPlayerNum], reconnectedPlayer.hand, "play", false);
        displayCards(players[myPlayerNum], shop, "buy", false);

        if (!reconnectedPlayer.isReady){
            // FIRST PHASE OF ROUND
            if (reconnectedPlayer.waitingOn == "selectAction"){
                actionSelection(players, myPlayerNum);
                players.forEach(player => {if (player.isReady){
                    lockInCard(player.playerNum);
                }})
            }

            // SECOND PHASE OF ROUND
            else if (reconnectedPlayer.waitingOn == "useCardSwap"){
                allowCardSwaps(players);
                players.forEach(player => {
                    orientCardToPlayer(player.playerNum, player.currentTarget, players.length);
                })
            }

            // REVEALED ACTIONS
            else if (reconnectedPlayer.waitingOn == "redirectCards"){

            }
            else if (reconnectedPlayer.waitingOn == "retrieveCards"){
                // !!! should store number of retrieved cards
                retrieveCards(reconnectedPlayer, 2, false);
            }
            else if (reconnectedPlayer.waitingOn == "donate"){
    
            }

            // ROUND END
            else if (reconnectedPlayer.waitingOn == "buyCards"){
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
    createWorkValueScorecard(players.length, false, false);
    createStealValueScorecard(players.length, false, false);
    createStats(players);
    updateStats(players);
    createCardDisplay("player");
    createCardDisplay("shop");
    openClosePlayerDisplay();
    openCloseShopDisplay();
    displayCards(players[myPlayerNum], players[myPlayerNum].hand, "play", false);
    displayCards(players[myPlayerNum], shop, "buy", false);
})
socket.on("selectAction", (players) => {
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
    promptDonation(giver, receiver, maxCoins, context)
})
socket.on("updateStats", (players) => {
    updateStats(players);
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
            roomCodeEntry.setAttribute("placeholder", "Code");
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
        mainMenu.remove();
        socket.emit("setUpTutorial", myID);
    })
    options.appendChild(tutorial);

    bodyElement.appendChild(mainMenu);
}

function startTutorial(players, phase){
    myPlayerNum = 0;
    createGameSpace(players);
    createNotificationContainer();
    createStats(players);
    updateStats(players);

    const tutorialDiv = document.createElement("div")
    tutorialDiv.id = "tutorial"
    const tutorialMessage = document.createElement("p");
    tutorialMessage.id = "tutorialMessage";
    tutorialDiv.appendChild(tutorialMessage);
    bodyElement.appendChild(tutorialDiv);

    tutorialPhase(phase);


    const leaveTutorial = document.createElement("button");
    leaveTutorial.textContent = "Leave tutorial";
    leaveTutorial.id = "leaveTutorial";
    leaveTutorial.addEventListener("click", () => {
        socket.emit("leaveTutorial", myID);
        displayMainMenu();
    })
    bodyElement.appendChild(leaveTutorial);
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
    const tutorialProgress = tutorialDiv.querySelector(`.tutorialProgress`);

    switch (phase){
        case 1:
            addTutorialProgressArrows([ "Click the arrows to navigate through parts of the tutorial.",
                                        "The game will be played over a series of rounds, where you will play cards, get coins, and buy new cards.",
                                        "Each player starts with the same hand of cards.",
                                        "Click the gray bar on the left to open the player display."
                                        ], 2, tutorialDiv)
            break;

        case 2:
            var clickedBefore = document.getElementById("playerDisplayDiv");
            if (!clickedBefore){
                createCardDisplay("player");
                openClosePlayerDisplay();
                socket.emit("tutorialRequest", "setWaitingOn", "clickWork", myID);

                const discardToggle = document.getElementById("discardToggleDiv");
                const discardClone = discardToggle.cloneNode(true);
                discardToggle.replaceWith(discardClone);
                const handToggle = document.getElementById("handToggleDiv");
                const handClone = handToggle.cloneNode(true);
                handToggle.replaceWith(handClone);

                var displayBar = document.getElementById("playerDisplayVisibilityToggle");
                displayBar.addEventListener("click", tutorialOpenedHand);
                displayBar.addEventListener("click", () => {
                    socket.emit("getUpdatedCards", "hand", false, myID);
                })
            }
            break;
        
        case 3:
            if (tutorialProgress){
                tutorialProgress.remove();
            }
            tutorialMessage("Choose to 'Work'.");
            break;

        case 4:
            socket.emit("tutorialRequest", "setWaitingOn", "", myID);
            if (tutorialProgress){
                tutorialProgress.remove();
            }
            addTutorialProgressArrows([ "Whenever you play an action, you must choose ANOTHER player to target.",
                                        "For some cards, this will matter, but the choice here is arbitrary.",
                                        "Click on a player (the gray circles) to target them, then confirm your play."
                                        ], 5, tutorialDiv);

            for (let i = 1; i < 3; i++){
                const playedCard = document.querySelector(`#player${i} .playedCard`);
                const actionBack = document.createElement("img");
                actionBack.src = "/static/Images/Misc/back.png";
                playedCard.appendChild(actionBack);
                playedCard.style.opacity = "0.5";
            }
            break;

        case 5:
            var clickedBefore = document.getElementById("confirmAction");
            if (!clickedBefore){
                const myCard = document.querySelector(`#player0 .playedCard`);
                addPlayerTargeting(myCard, 3);

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
            tutorialProgress.remove();
            addTutorialProgressArrows([ "After each player has confirmed their action, they may spend a Card Swap token to change it.",
                                        "Each player starts the game with 1, and will earn more through card effects.",
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
                    socket.emit("tutorialRequest", "confirmCard", "", myID);
                    cardSwapPopUp.remove();
                    tutorialPhase(8);
                })

                cardSwapPopUp.appendChild(useCardSwap);
                cardSwapPopUp.appendChild(keepActionAsIs);   
                bodyElement.appendChild(cardSwapPopUp);
            }
            break;

        case 8:
            tutorialProgress.remove();
            const work = allActions.find((action) => action.name == "Work");
            const cooperate = allActions.find((action) => action.name == "Cooperate");

            var grudgieCard = document.querySelector(`#player1 .playedCard`);
            generateCard(grudgieCard, cooperate);
            var pudgieCard = document.querySelector(`#player2 .playedCard`);
            generateCard(pudgieCard, work);
            addTutorialProgressArrows([ "Played actions are resolved clockwise, starting with the underlined player.",
                                        "At the end of each round, the underline rotates clockwise, so your turn order will change over time.",
                                        "One of the main ways your will earn coins is by working.",
                                        "The value of each work changes each round based on the total number of workers.",
                                        "Fewer workers will make each work action yield fewer coins.",
                                        "Hover over the blue scorecard in the bottom-left corner to see exactly how these values correlate with this many players."
                                        ], 9, tutorialDiv);
            break;
        
        case 9:
            var alreadyClicked = document.getElementById("workValueScorecard");
            if (!alreadyClicked){
                createWorkValueScorecard(3, false, true);
            }
            break;

        case 10:
            tutorialProgress.remove();
            addTutorialProgressArrows([ "Since all 3 players are workers this round, each work will only give 2 coins.",
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
            tutorialProgress.remove();
            addTutorialProgressArrows([ "Grudgie's Cooperate gave us 5 coins. They are likely expecting at least a few back.",
                                        "Since this is a tutorial, and we have no long-term consequences to fear, let's keep all of them.",
                                        "Enter a '0' and click 'Confirm'."
                                        ], 13, tutorialDiv);
            break;
        
        case 13:
            var clickedBefore = document.getElementById("donationScreen");
            if (!clickedBefore){
                promptDonation("", "", 4, "How many coins will you return to Grudgie?", true)
            }
            break;
        
        case 14:
            tutorialProgress.remove();
            socket.emit("tutorialRequest", "discardCard", "", myID);
            socket.emit("tutorialRequest", "setCoins", 9, myID);
            endRoundCleanUp(3);
            addTutorialProgressArrows([ "Actions you play are sent to your personal discard at the end of the round.",
                                        "Then, players can spend their coins to buy new cards from the Shop.",
                                        "We will get to that shortly.",
                                        "First, let's look at a card in some more detail to better understand what we'll be buying.",
                                        ""
                                        ], 15, tutorialDiv);
            break;

        case 15:
            const background = document.createElement("div");
            background.classList = "background";
            const testDisplay = document.createElement("div");
            testDisplay.id = "testCard";
            background.appendChild(testDisplay);
            bodyElement.appendChild(background);
            const card = allActions.find((card) => card.name == "Bewitch!");
            generateCard(testDisplay, card)
            tutorialProgress.remove();
            addTutorialProgressArrows([ "Bewitch is a special type of action called a One-Shot.",
                                        "One-Shots have powerful abilities, but can only be played once, returning to the Shop rather than your discard.",
                                        "They can be distinguished by their unique name formatting and slightly darker background.",
                                        "All cards in the shop have a number in a gold circle on the left, denoting its cost in coins.",
                                        "This can differentiate Basic Actions (the ones in your starting hand) from non-Basic Actions.",
                                        "The color of a card has no MECHANICAL impact, but can help identify a card's ability at a glance.",
                                        "Cards with an arrow affect the player it targets. (All cards still 'target' someone, even if they don't have an arrow.",
                                        "Blue cards Work, making players who played one 'Workers'.",
                                        "Red cards Steal.",
                                        "Purple cards (like Bewitch) have a special effect that lasts beyond the normal action phase.",
                                        "Yellow cards have none of these defining features.",
                                        "Some cards are also green, but that will be explained in a later section.",
                                        "Finally, the text at the bottom of the card explains the exact effect it will have when played.",
                                        "Click on the COST of Bewitch to continue."
                                        ], 16, tutorialDiv);
            break
        
        case 16:
            const popUp = document.querySelector(`.background:has(#testCard)`);
            const bewitchCost = popUp.querySelector(`.cost`);
            bewitchCost.addEventListener("click", () => {
                popUp.remove();
                tutorialPhase(17);
            })
            break;

        case 17: 
            tutorialProgress.remove();
            addTutorialProgressArrows([ "Let's buy a new card!",
                                        "Click the gold bar on the right to look at the Shop."
                                        ], 18, tutorialDiv);
            break;

        case 18:
            var clickedBefore = document.getElementById("shopDisplayDiv");
            if (!clickedBefore){
                createCardDisplay("shop");
                openCloseShopDisplay();

                var displayBar = document.getElementById("shopDisplayVisibilityToggle");
                displayBar.addEventListener("click", tutorialOpenedShop);
                displayBar.addEventListener("click", () => {
                    socket.emit("getUpdatedCards", "shop", false, myID)
                });
            }
            break;

        case 19:
            tutorialProgress.remove();
            addTutorialProgressArrows([ "You can buy up to 3 different cards each round.",
                                        "If you buy more than 1 card, you'll get a rebate.",
                                        "Buying 2 cards will earn you 1 coin, while buying 3 will earn you 3.",
                                        "Let's buy a Curse and a Sabotage. (You may need to scroll through the shop if you cannot find them.)"
                                        ], 20, tutorialDiv);
            break;
    
        case 20:
            socket.emit("tutorialRequest", "setWaitingOn", "buyCards", myID);
            socket.emit("getUpdatedCards", "shop", false, myID);
            break;

        case 21:
            tutorialProgress.remove();
            socket.emit("tutorialRequest", "setWaitingOn", "", myID);
            addTutorialProgressArrows([ "Newly bought cards will go in your discard, so you won't be able to play them next round.",
                                        "Open the player display again, and navigate to your Discard."
                                        ], 22, tutorialDiv);
            break;

        case 22:
            const restrictedDisplay = document.getElementById("playerDisplayDiv");
            restrictedDisplay.remove();
            createCardDisplay("player");
            openClosePlayerDisplay();
            socket.emit("getUpdatedCards", "hand", false, myID);

            const displayToggle = document.getElementById("discardToggleDiv");
            displayToggle.addEventListener("click", tutorialOpenedDiscard);
            break;
        
        case 23:
            tutorialProgress.remove();
            socket.emit("tutorialRequest", "setWaitingOn", "clickRest", myID);
            addTutorialProgressArrows([ "In order to play cards in your discard pile, you must first add them to your hand.",
                                        "You will get to do this when you 'Rest'.",
                                        "Go back to your hand, read 'Rest', and click on it when you are ready to progress to the next round."
                                        ], 24, tutorialDiv);
            break;

        case 24:
            socket.emit("tutorialRequest", "setWaitingOn", "clickRest", myID);
            break;

        case 25:
            tutorialProgress.remove();
            addTutorialProgressArrows([ "At the start of each round (including the first), players get 2 coins.",
                                        "Then, players choose their action.",
                                        "Let's 'Prepare' so we can have more flexibility on future rounds."
                                        ], 26, tutorialDiv);
            for (let i = 1; i < 3; i++){
                const playedCard = document.querySelector(`#player${i} .playedCard`);
                const actionBack = document.createElement("img");
                actionBack.src = "/static/Images/Misc/back.png";
                playedCard.appendChild(actionBack);
                playedCard.style.opacity = "0.5";
            }
            break;

        case 26: 
            socket.emit("tutorialRequest", "setWaitingOn", "clickPrepare", myID);
            socket.emit("getUpdatedCards", "hand", false, myID);
            break;

        case 27:
            var clickedBefore = document.getElementById("confirmAction");
            if (!clickedBefore){
                const myCard = document.querySelector(`#player0 .playedCard`);
                const prepare = allActions.find((action) => action.name == "Prepare");
                generateCard(myCard, prepare)
                addPlayerTargeting(myCard, 3);

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

                        confirm.remove();
                        orientCardToPlayer(1, 0, 3);
                        lockInCard(1)
                        orientCardToPlayer(2, 1, 3);
                        lockInCard(2);
                        tutorialPhase(28);
                    }  
                })
                bodyElement.appendChild(confirm);
            }
            break;
        
        case 28:
            tutorialProgress.remove();
            addTutorialProgressArrows([ "Uh oh. It's looking like Grudgie might be holding a grudge.",
                                        "Use a Card Swap token to 'Retaliate' against Grudgie."
                                        ], 29, tutorialDiv);
            break;

        case 29:
            tutorialProgress.remove();
            const cardSwapPopUp = document.createElement("div");
            cardSwapPopUp.id = "cardSwapPopUp";

            const useCardSwap = document.createElement("button");
            useCardSwap.textContent = "Use Card Swap";
            useCardSwap.addEventListener("click", () => {
                cardSwapPopUp.remove();
                endRoundCleanUp(1);

                const playedCard = document.querySelector(`#player0 .playedCard`);
                addPlayerTargeting(playedCard, 3);
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

                        confirm.remove();
                        tutorialPhase(31);
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

        case 30:
            const playedCard = document.querySelector(`#player0 .playedCard`);
            const retaliate = allActions.find((action) => action.name == "Retaliate");
            generateCard(playedCard, retaliate);
            break;

        case 31:
            const steal = allActions.find((action) => action.name == "Steal");
            const prepare = allActions.find((action) => action.name == "Prepare");

            var grudgieCard = document.querySelector(`#player1 .playedCard`);
            generateCard(grudgieCard, steal);
            var pudgieCard = document.querySelector(`#player2 .playedCard`);
            generateCard(pudgieCard, prepare);
            tutorialPhase(32);
            break;

        case 32:
            addTutorialProgressArrows([ "Even though Grudgie goes before us in turn order, our Retaliate will block their Steal.",
                                        "Green cards are always performed, in full, before ANY non-green cards, regardless of turn order.",
                                        "If multiple green cards are played in the same round, the lowest numbered one takes priority.",
                                        "In the event that multiple players play the same green action, regular turn order determines which is first.",
                                        ""
                                        ], 33, tutorialDiv);
            break;

        case 33:
            tutorialProgress.remove();
            addTutorialProgressArrows([ "The number of coins taken on a Steal action is determined by how many players are stealing from them.",
                                        "The more thieves focused on a single player, the fewer coins each thief steals.",
                                        "The value of the Steal is resolved before any player takes coins, and the thievery occurs in turn order.",
                                        "This means an earlier thief may be able to sneak in and rob your target before you can.",
                                        "Hover over the red scorecard in the bottom-left corner to see exactly how many coins doubled-up thieves steal."
                                        ], 34, tutorialDiv);
            break;

        case 34:
            var alreadyClicked = document.getElementById("stealValueScorecard");
            if (!alreadyClicked){
                createStealValueScorecard(3, false, true);
            }
            break;

        case 35:
            tutorialProgress.remove();
            addTutorialProgressArrows([ "That's all you need to know to become a masterful conspirator.",
                                        "...",
                                        "...",
                                        "Oh, you want to learn how to win?",
                                        "*sigh* I guess...",
                                        "Once a player has at least 20 cards in their hand, the end of the game has been triggered.",
                                        "Any players who reached this milestone will earn 10 additional points.",
                                        "Then, players add the cost of all actions in their hand and discard, earning points equal to half this number, rounded down.",
                                        "Finally, players will earn a point for every coin in their possession at the end of the game.",
                                        "Now it is truly time to say goodbye.",
                                        "Click 'Leave Tutorial' in the top-right."
                                        ], 36, tutorialDiv);
            break;
    }
}
function tutorialOpenedHand(){
    const displayBar = document.getElementById("playerDisplayVisibilityToggle");
    displayBar.removeEventListener("click", tutorialOpenedHand);
    tutorialPhase(3);
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
function tutorialOpenedShop(){
    const displayBar = document.getElementById("shopDisplayVisibilityToggle");
    displayBar.removeEventListener("click", tutorialOpenedShop);
    tutorialPhase(19);
}
function tutorialOpenedDiscard(){
    const displayToggle = document.getElementById("discardToggleDiv");
    displayToggle.removeEventListener("click", tutorialOpenedDiscard);
    tutorialPhase(23);
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
    const targetAngle = calculateTargetAngle(originPlayerNum, targetPlayerNum, numPlayers);
    playedCard.style.transform = "translateX("+(-5*Math.sin(targetAngle))+"vh) translateY("+(-18*Math.cos(targetAngle))+"vh) rotate("+(targetAngle)+"rad)";       
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
        playedCard.classList.add("card");
        playedCard.classList.add("playedCard");
        playedCard.style.transform = 'translateX(2vh) rotate(-90deg)';

        if (i == myPlayerNum){
            playedCard.addEventListener("click", () => {
                promptActionSelection(players[i], false);
            })
        }

        // blow up played cards on hover
        playedCard.addEventListener("mouseenter", () => {
            if (playedCard.hasAttribute("action")){
                setTimeout(() => {
                    if (playedCard.matches(":hover")){
                        const blownUpAction = document.createElement("div");
                        blownUpAction.id = "blownUp";
                        const action = allActions.find((card) => card.name == playedCard.getAttribute("action"));
                        generateCard(blownUpAction, action);

                        if (i == myPlayerNum){
                            blownUpAction.addEventListener("click", () => {
                                promptActionSelection(players[i], false);
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

function createWorkValueScorecard(numPlayers, isBlownUp, isTutorial){
    const workValueScorecard = document.createElement("div");

    if (isBlownUp){
        workValueScorecard.id = "blownUpScorecard";
        workValueScorecard.classList.add("work");
        const workersTitle = document.createElement("p");
        workersTitle.textContent = "Workers";
        const coinsTitle = document.createElement("p");
        coinsTitle.textContent = "Coins";
        workValueScorecard.appendChild(workersTitle);
        workValueScorecard.appendChild(coinsTitle);
        for (let i = 1; i < numPlayers+1; i++){
            const numWorkers = document.createElement("p");
            numWorkers.textContent = i
            workValueScorecard.appendChild(numWorkers);
            const numCoins = document.createElement("p");
            // fewer workers = more coins per worker
            switch (i){
                case 1: 
                    numCoins.textContent = Math.min(7, numPlayers + 3);
                    break;
                case 2:
                    numCoins.textContent = Math.min(7, numPlayers + 1);
                    break;
                default:
                    numCoins.textContent = numPlayers + 2 - i;
            }
            workValueScorecard.appendChild(numCoins);
        }
    }
    else{
        workValueScorecard.id = "workValueScorecard";
        workValueScorecard.addEventListener("mouseenter", () => {
            const alreadyBlownUp = document.getElementById("blownUpScorecard");
            if (!alreadyBlownUp){
                createWorkValueScorecard(numPlayers, true, isTutorial);
                if (isTutorial){
                    setTimeout(() => {
                        tutorialPhase(10);
                    }, 500);
                }
            }
        })
        workValueScorecard.addEventListener("mouseleave", () => {
            const alreadyBlownUp = document.getElementById("blownUpScorecard");
            if (alreadyBlownUp){
                alreadyBlownUp.remove();
                if (isTutorial){
                    workValueScorecard.remove();
                    createWorkValueScorecard(numPlayers, false, false);
                }
            }
        })
    }
    bodyElement.appendChild(workValueScorecard);
}

function createStealValueScorecard(numPlayers, isBlownUp, isTutorial){
    const stealValueScorecard = document.createElement("div");

    if (isBlownUp){
        stealValueScorecard.id = "blownUpScorecard"
        stealValueScorecard.classList.add("steal");
        const thievesTitle = document.createElement("p");
        thievesTitle.textContent = "Thieves";
        const coinsTitle = document.createElement("p");
        coinsTitle.textContent = "Coins";
        stealValueScorecard.appendChild(thievesTitle);
        stealValueScorecard.appendChild(coinsTitle);
        for (let i = 1; i < numPlayers; i++){
            const numThieves = document.createElement("p");
            numThieves.textContent = i
            stealValueScorecard.appendChild(numThieves);
            const numCoins = document.createElement("p");
            // fewer thieves = fewer coins per thief
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
            stealValueScorecard.appendChild(numCoins);
        }
    }
    else{
        stealValueScorecard.id = "stealValueScorecard";
        stealValueScorecard.addEventListener("mouseenter", () => {
            const alreadyBlownUp = document.getElementById("blownUpScorecard");
            if (!alreadyBlownUp){
                createStealValueScorecard(numPlayers, true, isTutorial);
                if (isTutorial){
                    setTimeout(() => {
                        tutorialPhase(35);
                    }, 500);
                }
            }
        })
        stealValueScorecard.addEventListener("mouseleave", () => {
            const alreadyBlownUp = document.getElementById("blownUpScorecard");
            if (alreadyBlownUp){
                alreadyBlownUp.remove();
                if (isTutorial){
                    stealValueScorecard.remove();
                    createStealValueScorecard(numPlayers, false, false);
                }
            }
        })
    }
    bodyElement.appendChild(stealValueScorecard);
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
            socket.emit("getUpdatedCards", "discard", true, myID);
        })
        discardToggleDiv.appendChild(discardToggle);

        const handToggleDiv = document.createElement("div");
        handToggleDiv.id = "handToggleDiv";
        handToggleDiv.classList.add("cardLocationToggle");
        handToggleDiv.style.backgroundColor ="rgba(0, 0, 0, 0.83)";
        const handToggle = document.createElement("button");
        handToggle.textContent = "Hand";
        handToggleDiv.addEventListener("click", () => {
            socket.emit("getUpdatedCards", "hand", true, myID);
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

function openRelevantPlayerDisplay(player, where, isTutorial){
    const discardToggleDiv = document.getElementById("discardToggleDiv");
    const handToggleDiv = document.getElementById("handToggleDiv");
    const sliderIcon = document.querySelector(`#playerDisplayDiv .sliderIcon`);
    if (where == "hand"){
        handToggleDiv.style.backgroundColor ="rgba(0, 0, 0, 0.83)";
        discardToggleDiv.style.backgroundColor ="rgba(110, 110, 110, 0.83)";     
        displayCards(player, player.hand, "play", isTutorial);
    }
    else if (where == "discard"){
        handToggleDiv.style.backgroundColor ="rgba(110, 110, 110, 0.83)";
        discardToggleDiv.style.backgroundColor ="rgba(0, 0, 0, 0.83)";
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
        generateCard(possibleAction, card)
        possibleAction.addEventListener("click", () => {
            if (isTutorial){
                console.log(card.name)

                if (player.waitingOn == "clickWork"){
                    if (card.name == "Work"){
                        const myPlayedCard = document.querySelector(`#player0 .playedCard`);
                        myPlayedCard.style.opacity = 1;
                        generateCard(myPlayedCard, card);
                        openClosePlayerDisplay();
                        tutorialPhase(4);
                    }
                }
                if (player.waitingOn == "buyCards"){
                    if (card.name == "Sabotage!" || card.name == "Curse"){
                        if (possibleAction.classList.contains("selected")){
                            possibleAction.classList.remove("selected");
                        }
                        else {
                            possibleAction.classList.add("selected");
                        }
                        modifyCheckOutList(9, cardsToDisplay[i][0].name, cardsToDisplay[i][0].cost, true)
                    }   

                }
                if (player.waitingOn == "clickRest"){
                    if (card.name == "Rest"){
                        openClosePlayerDisplay();
                        socket.emit("tutorialRequest", "setWaitingOn", "", myID);
                        tutorialPhase(25);
                    }
                }
                if (player.waitingOn == "clickPrepare"){
                    if (card.name == "Prepare"){
                        openClosePlayerDisplay();
                        socket.emit("tutorialRequest", "setWaitingOn", "", myID);
                        tutorialPhase(27);
                    }
                }
                if (player.waitingOn == "clickRetaliate"){
                    if (card.name == "Retaliate"){
                        openClosePlayerDisplay();
                        socket.emit("tutorialRequest", "setWaitingOn", "", myID);
                        tutorialPhase(30);
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
                generateCard(myPlayedCard, cardsToDisplay[i][0]);
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
            else if (!player.isReady && player.waitingOn == "buyCards"){
                // !! visually indicate selected cards
                modifyCheckOutList(cardsToDisplay[i][0].name, cardsToDisplay[i][0].cost, false);
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

    // orients card to targeted player 
    addPlayerTargeting(myCard, players.length)

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
            const actionToPlay = players[myPlayerNum].hand.find((action) => action[0].name == actionToPlayName);
            socket.emit("chosenAction", myPlayerNum, actionToPlay[0], targetPlayerNum, Boolean(originalCard), myID);

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

function addPlayerTargeting(myCard, numPlayers){
    for (let i = 0; i < numPlayers; i++){
        if (i != myPlayerNum){
            const playerIcon = document.querySelector(`#player${i} .playerIcon`);

            playerIcon.addEventListener("mouseenter", () => {
                let targetPlayerNum = undefined;
                const previousSelection = document.getElementById("selectedPlayer");
                if (previousSelection){
                    targetPlayerNum = previousSelection.parentElement.id.slice(6);
                }

                if (targetPlayerNum == undefined){
                    orientCardToPlayer(myPlayerNum, i, numPlayers);
                }
            })

            playerIcon.addEventListener("click", () => {
                let targetPlayerNum = undefined;
                const previousSelection = document.getElementById("selectedPlayer");
                if (previousSelection){
                    targetPlayerNum = previousSelection.parentElement.id.slice(6);
                }

                if (targetPlayerNum == undefined){
                    myCard.style.border = "3px solid black";
                    playerIcon.id = "selectedPlayer";
                }
                else if (targetPlayerNum == i){
                    myCard.style.border = "3px dashed cyan";
                    playerIcon.id = "";
                }
                else{
                    previousSelection.id = "";
                    playerIcon.id = "selectedPlayer";
                    orientCardToPlayer(myPlayerNum, i, numPlayers);
                }
            })
        }
    }
}

function lockInCard(playerNum){
    const playerCard = document.querySelector(`#player${playerNum} .playedCard`);
    playerCard.style.opacity = "1";
    playerCard.style.border = "3px solid black";
}

function allowCardSwaps(players){
    const originalCard = players[myPlayerNum].playedCard;
    const originalTarget = players[myPlayerNum].currentTarget;

    const cardSwapPopUp = document.createElement("div");
    cardSwapPopUp.id = "cardSwapPopUp";

    const useCardSwap = document.createElement("button");
    useCardSwap.textContent = "Use Card Swap";
    useCardSwap.addEventListener("click", () => {
        cardSwapPopUp.remove();
        actionSelection(players, originalCard, originalTarget);
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
        generateCard(playedCard, player.playedCard);
        orientCardToPlayer(player.playerNum, player.currentTarget, players.length);
    })
}

function modifyCheckOutList(coinsToSpend, actionName, actionCost, isTutorial){
    let checkOutList = document.getElementById("checkOutList");
    if (!checkOutList){
        checkOutList = document.createElement("div");
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
                const sabotage = allActions.find((action) => action.name == "Sabotage!");
                if ((actionsToBuy[0] == curse || actionsToBuy[0] == sabotage)&&(actionsToBuy[1] == curse || actionsToBuy[1] == sabotage)){
                    socket.emit("attemptedPurchase", actionsToBuy, myID);
                    tutorialPhase(21);
                    openCloseShopDisplay();
                    checkOutList.remove();
                    
                }
            }
            else{ 
                socket.emit("attemptedPurchase", actionsToBuy, myID);
                checkOutList.remove();
            }
        })

        const totalCost = document.createElement("p");
        totalCost.classList.add("sum");

        const rebate = document.createElement("p");
        rebate.classList.add("rebate");

        bottomRow.appendChild(finalizePurchase);
        bottomRow.appendChild(rebate);
        bottomRow.appendChild(totalCost);
        checkOutList.appendChild(bottomRow);
    }
              
    const existingEntry = checkOutList.querySelector(`[action = "${actionName}"]`)
    if (existingEntry){
        if (checkOutList.childElementCount == 2){
            checkOutList.remove();
        }
        else{
            existingEntry.remove()
            const totalCost = checkOutList.querySelector(`.sum`);
            totalCost.textContent = Number(totalCost.textContent) - actionCost;
            const rebate = checkOutList.querySelector(`.rebate`);
            if (rebate.textContent == "+1"){
                rebate.textContent = "";
            }
            else{
                rebate.textContent = "+1";
            }
        }
    }

   else{
        const totalCost = checkOutList.querySelector(`.sum`);
        if (Number(totalCost.textContent) + actionCost <= coinsToSpend){
            totalCost.textContent = Number(totalCost.textContent) + actionCost;

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
            if (checkOutList.childElementCount == 3){
                rebate.textContent = "+1";
            }
            else if (checkOutList.childElementCount == 4){
                rebate.textContent = "+3"
            }
        }
        else{
            // !! display not enough coins message
        }
    }
}

function retrieveCards(player, numCardsToRetrieve, isTutorial){
    openRelevantPlayerDisplay(player, "discard", isTutorial);

    const retrieveDiv = document.createElement("div");
    retrieveDiv.id = "retrieveDiv";

    const remainingRetrievals = document.createElement("p");
    remainingRetrievals.id = "remainingRetrievals"
    remainingRetrievals.textContent = numCardsToRetrieve;

    const confirm = document.createElement("button");
    confirm.id = "confirmRetrieve";
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

function promptDonation(giver, receiver, maxCoins, context, isTutorial){
    const donationScreen = document.createElement("div");
    donationScreen.id = "donationScreen";

    const contextMessage = document.createElement("p");
    contextMessage.id = "donationContext";
    contextMessage.textContent = context;
    donationScreen.appendChild(contextMessage);

    if (isTutorial || myPlayerNum == giver.playerNum){
        const donationEntry = document.createElement("input");
        donationEntry.type = "text";
        donationEntry.maxLength = 1;
        donationScreen.appendChild(donationEntry);

        const submit = document.createElement("button");
        submit.id = "submit";
        submit.textContent = "Confirm";
        submit.addEventListener("click", () => {
            if (donationEntry.value >= 0 && donationEntry.value <= maxCoins){
                if (isTutorial){
                    if (donationEntry.value == 0){
                        donationScreen.remove();
                        tutorialPhase(14);
                    }
                }
                else{
                    socket.emit("gaveDonation", giver, receiver, donationEntry.value);
                } 
            }
        })
        donationScreen.appendChild(submit);
    }    
    bodyElement.appendChild(donationScreen);
}

function createStats(players){
    for (let i = 0; i < players.length; i++){
        const statsDisplay = document.createElement("div");
        statsDisplay.classList.add("statsDisplay");

        const playerName = document.createElement("p");
        playerName.textContent = players[(myPlayerNum + i)%players.length].playerName;
        playerName.style.color = players[(myPlayerNum + i)%players.length].playerColor[0];
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
        discardIcon.style.transform = 'rotate(90deg)';
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

function updateStats(players){
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

// !! add function to regular game
function endRoundCleanUp(numPlayers){
    for (let i = 0; i < numPlayers; i++){
        const playedCard = document.querySelector(`#player${i} .playedCard`);
            playedCard.innerHTML = "";
            playedCard.removeAttribute("action");
            playedCard.style.border = "3px dashed cyan";
            playedCard.style.transform = "translateX(2vh) rotate(-90deg)";
        }
    const selectedPlayer = document.getElementById("selectedPlayer");
    if (selectedPlayer){
        selectedPlayer.id = "";
    }
}

function tutorialMessage(message){
    const previousMessage = document.getElementById("tutorialMessage");
    previousMessage.textContent = message;
}