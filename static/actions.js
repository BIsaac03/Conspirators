export const allActions = [
// BASIC ACTIONS    
    {
        "name": "Steal",
        "background": "static/Images/Backgrounds/red_arrow.png",
        "text": "<b>Steal</b>.",
        "isWork": false,
        "isSteal": true,
        "isTargetting": true,
        "effect": `steal(player, players[player.currentTarget], 0, players)`,
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
    {
        "name": "Work",
        "background": "static/Images/Backgrounds/blue.png",
        "text": "<b>Work</b>.",
        "isWork": true,
        "isSteal": false,
        "isTargetting": false,
        "effect": `work(player, workValue, 0)`,
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
    {
        "name": "Defend",
        "background": "static/Images/Backgrounds/green.png",
        "text": "Take 2 coins. You cannot be stolen from.",
        "isWork": false,
        "isSteal": false,
        "isTargetting": false,
        "effect":  `player.numCoins += 2; 
                    player.isImmune = true`,
        "priority": 4,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
    {
        "name": "Retaliate",
        "background": "static/Images/Backgrounds/green_(red)_arrow.png",
        "text": "Take 3 coins.<br> Targeted player cannot steal from you. On try, <b>Steal</b>.",
        "isWork": false,
        "isSteal": `if(players[player.currentTarget].playedCard.name != "Retaliate && players[player.currentTarget].playedCard.isSteal)`,
        "isTargetting": true,
        "effect":  `player.numCoins += 3;
                    if(players[player.currentTarget].playedCard.isSteal){
                        steal(player, players[player.currentTarget], 0, players)
                    }`,
        "priority": 5,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
    {
        "name": "Rest",
        "background": "static/Images/Backgrounds/purple.png",
        "text": "Return half of your discarded cards to your hand (rounded down). This card is discarded to your hand.",
        "isWork": false,
        "isSteal": false,
        "isTargetting": false,
        "effect": `player.prepareToRetrieveCards(2, io)`, //!! change to reflect half of discard
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
// VariableBasicActions
    {
        "name": "Bless",
        "background": "static/Images/Backgrounds/yellow_arrow.png",
        "text": "<b>Work Value</b>.<br>Return 2 discarded cards to your hand. Targeted player returns their played card to their hand instead of discarding.",
        "isWork": false,
        "isSteal": false,
        "isTargetting": true,
        "effect":  `player.numCoins += workValue; 
                    player.rest(2);`, // !! targeted player returns played card to hand
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": true,
        "isOneShot": false,
    },
    {
        "name": "Cooperate",
        "background": "static/Images/Backgrounds/blue_arrow.png",
        "text": "<b>Work -2</b>.<br>Targeted player takes 5 coins. They may give you up to 4 of them.",
        "isWork": true,
        "isSteal": false,
        "isTargetting": true,
        "effect":  `work(player, workValue, -2); 
                    players[player.currentTarget].numCoins += 5; 
                    players[player.currentTarget].isReady = false;
                    players[player.currentTarget].waitingOn = "donate";
                    donate(players[player.currentTarget], player, 4);`,
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": true,
        "isOneShot": false,
    },
    {
        "name": "Help",
        "background": "static/Images/Backgrounds/blue_arrow.png",
        "text": "<b>Work +1</b>.<br>Targeted player takes a coin.",
        "isWork": true,
        "isSteal": true,
        "isTargetting": true,
        "effect":  `work(player, workValue, 1); 
                    players[player.currentTarget].numCoins += 1;`,
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": true,
        "isOneShot": false,
    },
    {
        "name": "Prepare",
        "background": "static/Images/Backgrounds/yellow.png",
        "text": "Take 3 Card Swap tokens.",
        "isWork": true,
        "isSteal": false,
        "isTargetting": false,
        "effect":  `player.numCardSwaps += 3;`,
        "priority": 0,
        "cost": 0,
        "isBasicAction": true,
        "isSecondaryBA": true,
        "isOneShot": false,
    },
    {
        "name": "Ransack",
        "background": "static/Images/Backgrounds/red_arrow.png",
        "text": "<b>Steal -1</b>.<br>Neighbors of targeted player each take 2 coins.",
        "isWork": false,
        "isSteal": true,
        "isTargetting": true,
        "effect":   `steal(player, players[player.currentTarget], -1, players);
                    players[(player.currentTarget + 1) % players.length].numCoins++;
                    players[(player.currentTarget - 1 + players.length) % players.length].numCoins++;`,
        "priority": 0,
        "cost": 3,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
    {
        "name": "Bewitch!",
        "background": "static/Images/Backgrounds/purple_blue.png",
        "text": "<b>Work +4</b>.<br>All other players become <i>Bewitched</i> (can only play Basic Actions next turn).",
        "isWork": true,
        "isSteal": false,
        "isTargetting": false,
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
    },
    {
        "name": "Communalize",
        "background": "static/Images/Backgrounds/green_blue_arrow.png",
        "text": "<b>Work +2</b>.<br>Both you and targeted player take a Card Swap token and cannot be stolen from.",
        "isWork": true,
        "isSteal": false,
        "isTargetting": true,
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
    },
    {
        "name": "Curse",
        "background": "static/Images/Backgrounds/green.png",
        "text": "Take 3 coins.<br>Discard cards targeting you without effect, returning non-Basic Actions to the Shop.",
        "isWork": false,
        "isSteal": false,
        "isTargetting": false,
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
    },
    {
        "name": "Hijack",
        "background": "static/Images/Backgrounds/green_red_arrow.png",
        "text": "Take 3 coins.<br>Redirect any number<br>of cards targeting targeted player.<br><b>Steal -2</b>.",
        "isWork": false,
        "isSteal": true,
        "isTargetting": true,
        "effect":   `player.numCoins += 3;
                    player.isReady = false;
                    player.waitingOn = "hijackRedirects";
                    io.emit("hijackRedirects", player.playerID);
                    steal(player, players[player.currentTarget], -2, players);`, // !! steal after redirects RESOLVED
        "priority": 6,
        "cost": 6,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
    {
        "name": "Honor",
        "background": "static/Images/Backgrounds/yellow_arrow.png",
        "text": "Take up to 4 coins.<br>For each coin you did not take, targeted player takes 2.",
        "isWork": "fales",
        "isSteal": false,
        "isTargetting": true,
        "effect": ``, //!! take up to 4, give targeted player 2* difference
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
    {
        "name": "Impersonate",
        "background": "static/Images/Backgrounds/green_(red)_(blue)_(arrow).png",
        "text": "Choose a neighbor's card. This is that card. (If this becomes a One-Shot, return it to the Shop afterwards.)",
        "isWork": "",
        "isSteal": "",
        "isTargetting": "",
        "effect": ``,   // !! select card to copy and update stats
        "priority": 1,
        "cost": 6,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
    {
        "name": "Pillage!",
        "background": "static/Images/Backgrounds/red_arrow.png",
        "text": "<b>Steal +5</b>.<br>If you stole fewer<br>than 9 coins, take the difference from the bank.",
        "isWork": false,
        "isSteal": true,
        "isTargetting": true,
        "effect":   `const beforeCoins = player.numCoins;
                    steal(player, players[player.currentTarget], 5, players);
                    player.numCoins = beforeCoins + 9`,
        "priority": 0,
        "cost": 5,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": true,
    },
    {
        "name": "Recruit",
        "background": "static/Images/Backgrounds/purple_blue.png",
        "text": "<b>Work</b>.<br>Cards you buy this<br>turn are added into your hand.",
        "isWork": true,
        "isSteal": false,
        "isTargetting": false,
        "effect":   `work(player, workValue);
                    player.hasRecruited = true;`,
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
    {
        "name": "Sabotage!",
        "background": "static/Images/Backgrounds/green_red_arrow.png",
        "text": "Workers receive no coins. If targeting a Worker, redirect clockwise until not.<br><b>Steal +2</b>.",
        "isWork": false,
        "isSteal": true,
        "isTargetting": true,
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
    },
    {
        "name": "Unionize",
        "background": "static/Images/Backgrounds/blue.png",
        "text": "<b>Work +1</b>.<br>All workers (including yourself) take 2 coins.",
        "isWork": true,
        "isSteal": false,
        "isTargetting": false,
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
    },
    {
        "name": "Whistle",
        "background": "static/Images/Backgrounds/green.png",
        "text": "Take a coin and a Card Swap token. Redirect any number of cards targeting a neighbor to you, and vice versa.",
        "isWork": false,
        "isSteal": false,
        "isTargetting": false,
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
    },
    {
        "name": "Sacrifice",
        "background": "static/Images/Backgrounds/yellow.png",
        "text": "Discard your hand.<br>Take 1 coin per card discarded.",
        "isWork": false,
        "isSteal": false,
        "isTargetting": false,
        "effect":  ``, // !! discard hand, get coins
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
    {
        "name": "Accuse",
        "background": "static/Images/Backgrounds/blue_arrow.png",
        "text": "<b>Work -1</b>.<br>If targeting a Thief, take 5 coins.",
        "isWork": true,
        "isSteal": false,
        "isTargetting": true,
        "effect":  `work(player, workValue, -1); 
                    if(players[player.currentTarget].playedCard.isSteal){
                        player.numCoins+=5
                    }`,
        "priority": 0,
        "cost": 4,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": false,
    },
    {
        "name": "Abduct!",
        "background": "static/Images/Backgrounds/yellow.png",
        "text": "Take any card from<br>the Shop and add it<br>to your hand.",
        "isWork": false,
        "isSteal": false,
        "isTargetting": false,
        "effect":  ``, // !! take action from shop
        "priority": 0,
        "cost": 3,
        "isBasicAction": false,
        "isSecondaryBA": false,
        "isOneShot": true,
    },
    {
        "name": "Proselytize",
        "background": "static/Images/Backgrounds/blue_arrow.png",
        "text": "<b>Work -1</b>.<br>If targeted player played a Basic Action, you both take 4 coins.",
        "isWork": true,
        "isSteal": false,
        "isTargetting": true,
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
    }
]