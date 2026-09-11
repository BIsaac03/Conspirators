export const allActions = [
// BASIC ACTIONS    
    {
        "name": "Steal",
        "background": "static/Images/Backgrounds/red_arrow.png",
        "text": "<b>Steal</b>.",
        "isWork": false,
        "isSteal": true,
        "isTargeting": true,
        "effect": `steal(player, players[player.currentTarget], 0, players)`,
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
        "isWork": true,
        "isSteal": false,
        "isTargeting": false,
        "effect": `work(player, workValue, 0)`,
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
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `player.numCoins += 2; 
                    player.isImmune = true`,
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
        "isWork": false,
        "isSteal": `if(players[player.currentTarget].playedCard.name != "Retaliate && players[player.currentTarget].playedCard.isSteal)`,
        "isTargeting": true,
        "effect":  `player.numCoins += 3;
                    if(players[player.currentTarget].playedCard.isSteal){
                        steal(player, players[player.currentTarget], 0, players)
                    }`,
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
        "text": "Return half of your discarded cards to your hand (rounded down). This card is discarded to your hand.",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":   `const numToRetrieve = Math.floor(player.countCards("discard") / 2);
                    player.prepareToRetrieveCards(numToRetrieve, io)`,
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["This does NOT count as one of the cards in your discard for its calculation."]
    },
    {
        "name": "Cooperate",
        "background": "static/Images/Backgrounds/blue_arrow.png",
        "text": "<b>Work -2</b>.<br>Target player takes 5 coins. They may give you up to 4 of them.",
        "isWork": true,
        "isSteal": false,
        "isTargeting": true,
        "effect":  `work(player, workValue, -2); 
                    players[player.currentTarget].numCoins += 5; 
                    players[player.currentTarget].isReady = false;
                    players[player.currentTarget].waitingOn = "cooperate";
                    players[player.currentTarget].cooperatingWith = player.playerNum;
                    io.emit("cooperate", players[player.currentTarget], player);`,
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
        "isWork": true,
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
        "isWork": false,
        "isSteal": true,
        "isTargeting": true,
        "effect":   `steal(player, players[player.currentTarget], -1, players);
                    players[(player.currentTarget + 1) % players.length].numCoins += 2;
                    players[(player.currentTarget - 1 + players.length) % players.length].numCoins += 2;`,
        "priority": 0,
        "cost": 3,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Neighbors receive coins even if your <b>Steal</b> is blocked.", "If you are a neighbor, you take coins."]
    },
    {
        "name": "Bewitch",
        "background": "static/Images/Backgrounds/purple_blue.png",
        "text": "<b>Work +4</b>.<br>All other players become <i>Bewitched</i> (can only play Basic Actions next turn).",
        "isWork": true,
        "isSteal": false,
        "isTargeting": false,
        "effect":   `work(player, workValue, 4)
                    players.forEach((other) => {
                        if (other.playerID != player.playerID){
                            other.isBewitched = true;
                        } 
                    })`,
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": true,
        "FAQ": ["Basic Actions are any cards that started the game in your hand (they will not have a cost).", "If multiple Bewitches are played in a round everyone is still only <i>Bewitched</i> for a single round."]
    },
    {
        "name": "Communalize",
        "background": "static/Images/Backgrounds/green_blue_arrow.png",
        "text": "<b>Work +2</b>.<br>Both you and target player take a Card Swap token and cannot be stolen from.",
        "isWork": true,
        "isSteal": false,
        "isTargeting": true,
        "effect":  `work(player, workValue, 2); 
                    player.numCardSwaps++;
                    player.isImmune = true;
                    players[player.currentTarget].numCardSwaps++;
                    players[player.currentTarget].isImmune = true;`,
        "priority": 4,
        "cost": 7,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["If this card is redirected, the immunity from Thieves is redirected with it."]
    },
    {
        "name": "Curse",
        "background": "static/Images/Backgrounds/green.png",
        "text": "Take 3 coins.<br>Discard cards targeting you without effect, returning non-Basic Actions to the Shop.",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":   `player.numCoins += 3;
                    players.forEach((other) => {
                        if (other.currentTarget == player.playerNum){
                            cursed(other);
                        }
                    })`,
        "priority": 2,
        "cost": 5,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Players do not need to be <b>Stealing</b> from you, or even affecting you with their card to be Cursed."]
    },
    {
        "name": "Hijack",
        "background": "static/Images/Backgrounds/green_red_arrow.png",
        "text": "Take 3 coins.<br>Redirect any number<br>of cards targeting target player.<br><b>Steal -2</b>.",
        "isWork": false,
        "isSteal": true,
        "isTargeting": true,
        "effect": ` player.numCoins += 3;
                    player.isReady = false;
                    player.waitingOn = "hijackRedirects";
                    io.emit("hijackRedirects", player.playerID);
                    steal(player, players[player.currentTarget], -2, players);`, // !! steal after redirects RESOLVED
        "priority": 6,
        "cost": 6,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["You may redirect this card as well, though you may NOT then redirect cards targetng your new target."]
    },
    {
        "name": "Honor",
        "background": "static/Images/Backgrounds/yellow_arrow.png",
        "text": "Take up to 4 coins.<br>For each coin you did not take, target player takes 2.",
        "isWork": false,
        "isSteal": false,
        "isTargeting": true,
        "effect": ` player.isReady = false;
                    player.waitingOn = "honor";
                    io.emit("honor", player, players[player.currentTarget]);`,
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": undefined
    },
    {
        "name": "Impersonate",
        "background": "static/Images/Backgrounds/green_(red)_(blue)_(arrow).png",
        "text": "Choose a neighbor's card. This is that card. (If this becomes a One-Shot, return it to the Shop afterwards.)",
        "isWork": "",
        "isSteal": "",
        "isTargeting": "",
        "effect":   `player.isReady = false;
                    player.waitingOn = "chooseImpersonate";
                    io.emit("chooseImpersonate", players.length, player.playerID);`,
        "priority": 1,
        "cost": 6,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["You may Impersonate a card already Impersonating another card.", "If you Impersonate an Impersonate which has not yet Impersonated a card, this card does nothing."]
    },
    {
        "name": "Pillage",
        "background": "static/Images/Backgrounds/red_arrow.png",
        "text": "<b>Steal +5</b>.<br>If you stole fewer<br>than 9 coins, take the difference from the bank.",
        "isWork": false,
        "isSteal": true,
        "isTargeting": true,
        "effect":   `const beforeCoins = player.numCoins;
                    steal(player, players[player.currentTarget], 5, players);
                    player.numCoins = beforeCoins + 9`,
        "priority": 0,
        "cost": 5,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": true,
        "FAQ": undefined
    },
    {
        "name": "Recruit",
        "background": "static/Images/Backgrounds/purple_blue.png",
        "text": "<b>Work</b>.<br>Cards you buy this<br>turn are added into your hand.",
        "isWork": true,
        "isSteal": false,
        "isTargeting": false,
        "effect":   `work(player, workValue);
                    player.hasRecruited = true;`,
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": undefined
    },
    {
        "name": "Sabotage",
        "background": "static/Images/Backgrounds/green_red_arrow.png",
        "text": "Working yields no coins. If targeting a Worker, redirect clockwise until not.<br><b>Steal +2</b>.",
        "isWork": false,
        "isSteal": true,
        "isTargeting": true,
        "effect":   `players.forEach((player) => {
                        player.isSabotaged = true;
                        let tries = 0;
                        while (players[player.currentTarget].playedCard.isWork && tries < players.length){
                            tries++;
                            const nextClockwise = (player.currentTarget + 1) % players.length;
                            if (nextClockwise != player.playerNum){
                                player.currentTarget = nextClockwise;
                            }
                            else{
                                tries++
                                player.currentTarget = (player.currentTarget + 2) % players.length
                            }
                        }
                        steal(player, players[player.currentTarget], 2, players);
                    })`, // !! visually display redirects
        "priority": 7,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": true,
        "FAQ": ["Any modification to the <b>Work</b> still results in 0 coins.", "You can never redirect to target yourself", "If you have redirected around all players, <b>Steal</b> from your original target."]
    },
    {
        "name": "Unionize",
        "background": "static/Images/Backgrounds/blue.png",
        "text": "<b>Work +1</b>.<br>All workers (including yourself) take 2 coins.",
        "isWork": true,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `work(player, workValue, 1);
                    players.forEach((player) => {
                        if (player.playedCard.isWork){
                            player.numCoins += 2;
                        }
                    })`, 
        "priority": 0,
        "cost": 5,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": undefined
    },
    {
        "name": "Whistle",
        "background": "static/Images/Backgrounds/green.png",
        "text": "Take a coin and a Card Swap token. Redirect any number of cards targeting a neighbor to you, and vice versa.",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `player.numCoins++; 
                    player.numCardSwaps++;
                    player.isReady = false;
                    player.waitingOn = "whistleRedirects";
                    io.emit("whistleRedirects", player.playerID);`,
        "priority": 3,
        "cost": 5,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Cards targeting you may be redirected to either neighbor.", "Cards targeting one neighbor CANNOT be redirected to the other."]
    },
    {
        "name": "Sacrifice",
        "background": "static/Images/Backgrounds/yellow.png",
        "text": "Discard your hand.<br>Take 1 coin per card discarded.",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":  `player.numCoins += player.countCards("hand");
                    player.discardHand();`,
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Rest is only discarded once."]
    },
    {
        "name": "Accuse",
        "background": "static/Images/Backgrounds/blue_arrow.png",
        "text": "<b>Work -1</b>.<br>If targeting a Thief, take 5 coins.",
        "isWork": true,
        "isSteal": false,
        "isTargeting": true,
        "effect":  `work(player, workValue, -1); 
                    if(players[player.currentTarget].playedCard.isSteal){
                        player.numCoins+=5
                    }`,
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["If your target played Retaliate but has yet to be stolen from, they are not yet a Thief."]
    },
    {
        "name": "Abduct",
        "background": "static/Images/Backgrounds/yellow.png",
        "text": "Take any card from<br>the Shop and add it<br>to your hand.",
        "isWork": false,
        "isSteal": false,
        "isTargeting": false,
        "effect":  ``, // !! take action from shop
        "priority": 0,
        "cost": 3,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": true,
        "FAQ": ["This does NOT count toward any rebate you may earn when buying cards"]
    },
    {
        "name": "Proselytize",
        "background": "static/Images/Backgrounds/blue_arrow.png",
        "text": "<b>Work -1</b>.<br>If target player played a Basic Action, you both take 4 coins.",
        "isWork": true,
        "isSteal": false,
        "isTargeting": true,
        "effect":  `work(player, workValue, -1); 
                    if (players[player.currentTarget].playedCard.isBasicAction){
                        players[player.currentTarget].numCoins += 4;
                        player.numCoins += 4;
                    }`,
        "priority": 0,
        "cost": 6,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
        "FAQ": ["Basic Actions are any cards that started the game in your hand (they will not have a cost)."]
    }
]