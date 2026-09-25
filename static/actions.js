export const allActions = [
// BASIC ACTIONS    
    {
        "name": "Steal",
        "background": "static/Images/Backgrounds/red_arrow.png",
        "text": "<b>Steal</b>.",
        "definingColor": "red",
        "isWork": false,
        "isSteal": true,
        "isTargeting": true,
        "effect": `animationTime = steal(player, players[player.currentTarget], 0, players)`,
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": undefined
    },
    {
        "name": "Work",
        "background": "static/Images/Backgrounds/blue.png",
        "text": "<b>Work</b>.",
        "definingColor": "blue",
        "isWork": true,
        "isSteal": false,
        "isTargeting": false,
        "effect": `animationTime = work(player, workValue, 0, players)`,
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": undefined
    },
    {
        "name": "Defend",
        "background": "static/Images/Backgrounds/green.png",
        "text": "Take 2 coins. You cannot be stolen from.",
        "definingColor": "green",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `player.numCoins += 2; 
                    player.isImmune = true;
                    animationTime = 1400;
                    io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 2, players.length, player.playerNum);
                    io.to(myGame.getGameDetails().roomCode).emit("protectIcon", player.playerNum);`,
        "priority": 4,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": undefined
    },
    {
        "name": "Retaliate",
        "background": "static/Images/Backgrounds/green_(red)_arrow.png",
        "text": "Take 3 coins.<br> Target player cannot steal from you. On try, <b>Steal</b>.",
        "definingColor": "red",
        "isWork": false,
        "isSteal": `(players[potentialThief.currentTarget].playedCard && players[potentialThief.currentTarget].playedCard.name != "Retaliate" && players[potentialThief.currentTarget].playedCard.isSteal && players[potentialThief.currentTarget].currentTarget == potentialThief.playerNum)`,
        "isTargeting": true,
        "effect":  `player.numCoins += 3;
                    animationTime = 1600;
                    io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 3, players.length, player.playerNum);
                    player.retaliatingAgainst = player.currentTarget;`,
        "priority": 5,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": undefined
    },
    {
        "name": "Rest",
        "background": "static/Images/Backgrounds/purple.png",
        "text": "Return half of your discarded cards to your Hand (rounded down). This card is discarded to your Hand.",
        "definingColor": "purple",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `if (player.countCards("discard") >= 2){
                        player.isReady = false;
                        player.waitingOn = "retrieveCards";
                        io.to(myGame.getGameDetails().roomCode).emit("retrieveCards", player, Math.floor(player.countCards("discard") / 2));
                    }`,
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["This does not count as one of the cards in your Discard for its calculation."]
    },
    {
        "name": "Cooperate",
        "background": "static/Images/Backgrounds/blue_arrow.png",
        "text": "<b>Work -2</b>.<br>Target player takes 5 coins. They may give you up to 4 of them.",
        "definingColor": "blue",
        "isWork": true,
        "isSteal": false,
        "isTargeting": true,
        "effect":  `const workTime = work(player, workValue, -2, players); 
                    players[player.currentTarget].numCoins += 5; 
                    animationTime = Math.max(2000, workTime);
                    io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 5, players.length, player.currentTarget);
                    players[player.currentTarget].isReady = false;
                    players[player.currentTarget].waitingOn = "cooperate";
                    players[player.currentTarget].cooperatingWith = player.playerNum;
                    io.to(myGame.getGameDetails().roomCode).emit("cooperate", players[player.currentTarget], player);`,
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": true,
        "isOneShot": false,
        "FAQ": undefined
    },
    {
        "name": "Prepare",
        "background": "static/Images/Backgrounds/yellow.png",
        "text": "Take 3 Card Swap tokens.",
        "definingColor": "yellow",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `player.numCardSwaps += 3;`,
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": true,
        "isOneShot": false,
        "FAQ": undefined
    },
    {
        "name": "Ransack",
        "background": "static/Images/Backgrounds/red_arrow.png",
        "text": "<b>Steal -1</b>.<br>Neighbors of target player each take 2 coins.",
        "definingColor": "red",
        "isWork": false,
        "isSteal": true,
        "isTargeting": true,
        "effect":  `const stealTime = steal(player, players[player.currentTarget], -1, players);
                    animationTime = 1400 + stealTime;
                    setTimeout(() => {
                        players[(player.currentTarget + 1) % players.length].numCoins += 2;
                        players[(player.currentTarget - 1 + players.length) % players.length].numCoins += 2;
                        io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 2, players.length, (player.currentTarget + 1) % players.length);
                        io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 2, players.length, (player.currentTarget - 1 + players.length) % players.length);
                    }, stealTime)`,
        "priority": 0,
        "cost": 3,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Your neighbors take coins even if your <b>Steal</b> is blocked.", "If you are a neighbor, you take coins."]
    },
    {
        "name": "Bewitch",
        "background": "static/Images/Backgrounds/purple_blue.png",
        "text": "<b>Work +4</b>.<br>All other players become <i>Bewitched</i> (can only play Basic Actions next turn).",
        "definingColor": "purple",
        "isWork": true,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `animationTime = work(player, workValue, 4, players)
                    players.forEach((other) => {
                        if (other.playerID != player.playerID){
                            other.isBewitched = true;
                            io.to(myGame.getGameDetails().roomCode).emit("notification", "You have been <i>Bewitched</i>", "warning", other.playerNum);
                        } 
                    })`,
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": true,
        "FAQ": ["Basic Actions are any cards that started the game in your Hand (they will not have a cost).", "If multiple players <i>Bewitch</i> in a round, everyone is still only <i>Bewitched</i> for a single round."]
    },
    {
        "name": "Communalize",
        "background": "static/Images/Backgrounds/green_blue_arrow.png",
        "text": "<b>Work +2</b>.<br>Both you and target player take a Card Swap token and cannot be stolen from.",
        "definingColor": "blue",
        "isWork": true,
        "isSteal": false,
        "isTargeting": true,
        "effect":  `animationTime = work(player, workValue, 2, players); 
                    player.numCardSwaps++;
                    player.isImmune = true;
                    io.to(myGame.getGameDetails().roomCode).emit("protectIcon", player.playerNum);
                    players[player.currentTarget].numCardSwaps++;
                    players[player.currentTarget].isImmune = true;
                    io.to(myGame.getGameDetails().roomCode).emit("protectIcon", player.currentTarget);`,
        "priority": 4,
        "cost": 7,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Redirecting this card after it has resolved does not change players' immunity from Thieves.", "Since this is resolved before 'Sabotage', it can still earn coins from <b>Work</b>."]
    },
    {
        "name": "Curse",
        "background": "static/Images/Backgrounds/green.png",
        "text": "Take 3 coins.<br>Discard cards targeting you without effect, returning non-Basic Actions to the Shop.",
        "definingColor": "green",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `player.numCoins += 3;
                    animationTime = 1600;
                    io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 3, players.length, player.playerNum);
                    players.forEach((other) => {
                        if (other.currentTarget == player.playerNum){
                            cursed(other, shop);
                        }
                    })`,
        "priority": 2,
        "cost": 5,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Players do not need to <b>Steal</b> from you, or even affect you with their card to be <i>Cursed</i>.", "If players attempt to <i>Curse</i> each other, the second one to resolve is returned to the Shop before it can affect any players."]
    },
    {
        "name": "Hijack",
        "background": "static/Images/Backgrounds/green_red_arrow.png",
        "text": "Take 3 coins.<br>Redirect any number<br>of cards targeting target player.<br><b>Steal -2</b>.",
        "definingColor": "red",
        "isWork": false,
        "isSteal": true,
        "isTargeting": true,
        "effect": ` player.numCoins += 3;
                    animationTime = 1600;
                    io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 3, players.length, player.playerNum);
                    player.isReady = false;
                    player.waitingOn = "hijackRedirects";
                    io.to(myGame.getGameDetails().roomCode).emit("hijackRedirects", players, player.playerID);`, 
                    // steal is resolved in 'finishedRedirecting' event listener ////
        "priority": 6,
        "cost": 6,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["You may <i>Hijack</i> this card as well, though you may not then <i>Hijack</i> cards targeting your new target."]
    },
    {
        "name": "Honor",
        "background": "static/Images/Backgrounds/yellow_arrow.png",
        "text": "Take up to 4 coins.<br>For each coin you did not take, target player takes 3.",
        "definingColor": "yellow",
        "isWork": false,
        "isSteal": false,
        "isTargeting": true,
        "effect":  `player.isReady = false;
                    player.waitingOn = "honor";
                    io.to(myGame.getGameDetails().roomCode).emit("honor", player, players[player.currentTarget]);`,
        "priority": 0,
        "cost": 5,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Coins earned from other sources cannot be used to <i>Honor<i>."]
    },
    {
        "name": "Impersonate",
        "background": "static/Images/Backgrounds/green_(red)_(blue)_(arrow).png",
        "text": "Choose a neighbor's card. This is that card. (If this becomes a One-Shot, return it to the Shop afterwards.)",
        "definingColor": "green",
        "isWork": "",
        "isSteal": "",
        "isTargeting": "",
        "effect":   `if(player.isImpersonating == false){
                        player.isReady = false;
                        player.waitingOn = "chooseImpersonate";
                        io.to(myGame.getGameDetails().roomCode).emit("chooseImpersonate", players.length, player.playerID);
                    }`,
        "priority": 1,
        "cost": 6,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Resolve the action you <i>Impersonate</i> in turn order.", "You may <i>Impersonate</i> an 'Impersonate' only if it is already <i>Impersonating</i> another card. Otherwise, it does nothing."]
    },
    {
        "name": "Pillage",
        "background": "static/Images/Backgrounds/red_arrow.png",
        "text": "<b>Steal +5</b>.<br>If you stole fewer<br>than 9 coins, take coins equal to the difference.",
        "definingColor": "red",
        "isWork": false,
        "isSteal": true,
        "isTargeting": true,
        "effect":  `const beforeCoins = player.numCoins;
                    const stealTime = steal(player, players[player.currentTarget], 5, players);
                    const coinsFromBank = 9 - (player.numCoins - beforeCoins);
                    animationTime = Math.max(200 * coinsFromBank + 1000, stealTime);
                    io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", coinsFromBank, players.length, player.playerNum);
                    player.numCoins += coinsFromBank;`,
        "priority": 0,
        "cost": 5,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": true,
        "FAQ": ["Take the full 9 coins if your <b>Steal</b> is blocked.",]
    },
    {
        "name": "Recruit",
        "background": "static/Images/Backgrounds/purple_blue.png",
        "text": "<b>Work</b>.<br>Cards you buy this<br>turn are added into your Hand.",
        "definingColor": "purple",
        "isWork": true,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `animationTime = work(player, workValue, 0, players);
                    player.hasRecruited = true;`,
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["This is not optional.", "If this brings the total number of cards in your hand to 20+, the game ends <strong>immediately</strong>."]
    },
    {
        "name": "Sabotage",
        "background": "static/Images/Backgrounds/green_red_arrow.png",
        "text": "Working yields no coins. If targeting a Worker, redirect clockwise until not.<br><b>Steal +2</b>.",
        "definingColor": "red",
        "isWork": false,
        "isSteal": true,
        "isTargeting": true,
        "effect":  `players.forEach((player) => {
                        player.isSabotaged = true;
                    })
                    for (let i = 0; i <= players.length; i++){
                        if (players[player.currentTarget].playedCard && players[player.currentTarget].playedCard.isWork && i < players.length){
                            const nextClockwise = (player.currentTarget + 1) % players.length;
                            if (nextClockwise != player.playerNum){
                                player.currentTarget = nextClockwise;
                            }
                            else{
                                player.currentTarget = (player.currentTarget + 2) % players.length;
                            }
                            const targetAtTime = player.currentTarget;
                            setTimeout(() => {
                                io.emit("displayRedirection", player.playerNum, targetAtTime, players.length);
                            }, 1000*(i+1))
                        }
                        
                        else{
                            animationTime = 1000*(i+1) + steal(player, players[player.currentTarget], 2, players, true);
                            setTimeout(() => {
                                steal(player, players[player.currentTarget], 2, players);
                            }, 1000*(i+1))
                            break;
                        }
                    }`,
        "priority": 7,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": true,
        "FAQ": ["Any modification to the <b>Work</b> still results in 0 coins.", "You can never redirect to target yourself.", "If you have redirected around all players, <b>Steal</b> from your original target."]
    },
    {
        "name": "Unionize",
        "background": "static/Images/Backgrounds/blue.png",
        "text": "<b>Work +1</b>.<br>All workers (including yourself) take 2 coins.",
        "definingColor": "blue",
        "isWork": true,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `const firstWorkTime = work(player, workValue, 1, players);
                    animationTime = firstWorkTime + 1400;
                    setTimeout(() => {
                        players.forEach((player) => {
                            if (player.playedCard && player.playedCard.isWork){
                                player.numCoins += 2;
                                io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 2, players.length, player.playerNum);
                            }
                        })
                    }, firstWorkTime)`, 
        "priority": 0,
        "cost": 5,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["If multiple players <i>Unionize</i>, Workers get 2 coins for each."]
    },
    {
        "name": "Whistle",
        "background": "static/Images/Backgrounds/green.png",
        "text": "Take a coin and a Card Swap token. Redirect any number of cards targeting a neighbor to you, and vice versa.",
        "definingColor": "green",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `player.numCoins++; 
                    animationTime = 1200;
                    io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 1, players.length, player.playerNum);
                    player.numCardSwaps++;
                    player.isReady = false;
                    player.waitingOn = "whistleRedirects";
                    io.to(myGame.getGameDetails().roomCode).emit("whistleRedirects", players, player.playerID);`,
        "priority": 3,
        "cost": 5,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Cards targeting you may be redirected to either neighbor.", "Cards targeting one neighbor cannot be redirected to the other."]
    },
    {
        "name": "Sacrifice",
        "background": "static/Images/Backgrounds/yellow.png",
        "text": "Discard your Hand.<br>Take 1 coin per card discarded.",
        "definingColor": "yellow",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `const numCards = player.countCards("hand")
                    player.numCoins += numCards;
                    animationTime = numCards * 200 + 1000;
                    io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", numCards, players.length, player.playerNum);
                    player.discardHand();`,
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["'Rest' is only discarded once."]
    },
    {
        "name": "Accuse",
        "background": "static/Images/Backgrounds/blue_arrow.png",
        "text": "<b>Work -1</b>.<br>If targeting a Thief, take 5 coins.",
        "definingColor": "blue",
        "isWork": true,
        "isSteal": false,
        "isTargeting": true,
        "effect":  `const workTime = work(player, workValue, -1, players); 
                    const potentialThief = players[player.currentTarget];
                    if(potentialThief.playedCard && (eval(potentialThief.playedCard.isSteal))){
                        player.numCoins+=5;
                        animationTime = 2000 + workTime;
                        setTimeout(() => {
                            io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 5, players.length, player.playerNum);
                        }, workTime)
                    }
                    else{
                        animationTime = workTime;
                    }`,
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["A player who <i>Retaliates</i>, is only a Thief if they are targeted by a Thief."]
    },
    {
        "name": "Abduct",
        "background": "static/Images/Backgrounds/yellow_arrow.png",
        "text": "Target player's card is discarded to your Hand. If it is a Basic Action, take 3 coins.",
        "definingColor": "yellow",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `players[player.currentTarget].isAbducted = true;
                    if (players[player.currentTarget].playedCard){
                        if (players[player.currentTarget].isImpersonating){
                            const impersonate = allActions.find((action) => action.name == "Impersonate");
                            player.buyCards([impersonate], 0, true);
                        }
                        else{
                            const abductedCard = allActions.find((action) => action.name == players[player.currentTarget].playedCard.name);
                            player.buyCards([abductedCard], 0, true);
                            }
                        if (players[player.currentTarget].playedCard.isBasicAction){
                            player.numCoins +=3;
                            animationTime = 1600;
                            io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 3, players.length, player.playerNum);
                        }
                    }`,
        "priority": 0,
        "cost": 3,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": true,
        "FAQ": ["The action still resolves as normal.", "If target is <i>Cursed</i> or decided to <i>Rest</i>, you get nothing.", "If multiple players <i>Abduct</i> the same target, all get copies."]
    },
    {
        "name": "Proselytize",
        "background": "static/Images/Backgrounds/blue_arrow.png",
        "text": "<b>Work -1</b>.<br>If target player played a Basic Action, you both take 4 coins.",
        "definingColor": "blue",
        "isWork": true,
        "isSteal": false,
        "isTargeting": true,
        "effect":  `const workTime = work(player, workValue, -1, players); 
                    if (players[player.currentTarget].playedCard && players[player.currentTarget].playedCard.isBasicAction){
                        players[player.currentTarget].numCoins += 4;
                        player.numCoins += 4;
                        animationTime = 1800 + workTime;
                        setTimeout(() => {
                            io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 4, players.length, player.currentTarget);
                            io.to(myGame.getGameDetails().roomCode).emit("animateCoinTransfer", 4, players.length, player.playerNum);
                        }, workTime)
                    }
                    else{
                        animationTime = workTime;
                    }`,
        "priority": 0,
        "cost": 6,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Basic Actions are any cards that started the game in your Hand (they will not have a cost)."]
    }
]