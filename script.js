import {allActions} from "./static/actions.js";


const players = [];

function makePlayer(selectedBAs){
    const createStartingHand = (selectedBAs) => {
        const steal = allActions.find(action => action.name == "Steal");
        const work = allActions.find(action => action.name == "Work");
        const defend = allActions.find(action => action.name == "Defend");
        const reciprocate = allActions.find(action => action.name == "Reciprocate");
        const rest = allActions.find(action => action.name == "Rest");

        let BA1 = undefined;
        let BA2 = undefined;
        if (selectedBAs.length == 0){
            let variableBAs = allActions.filter(action => action.isVariableBasicAction == "true");
            for (let i = 0; i < 2; i++){
                `BA${i}` = variableBAs.splice(Math.floor(Math.random()*variableBAs.length), 1)[0];
            }
        }
        else{
            BA1 = selectedBAs[0];
            BA2 = selectedBAs[1];
        }

        return [[steal, 3], [work, 3], [defend, 1], [reciprocate, 1], [rest, 1], [BA1, 1], [BA2, 1]];
    }

    const hand = createStartingHand(selectedBAs);
    const discard = [];
    let playedCard = undefined;
    let numCardSwaps
    let numCoins = 0;
    let investedCoins = 0;
    let stealResistance = 0;
    const playerNum = players.length;

    return {hand, discard, playedCard, numCardSwaps, numCoins, investedCoins, stealResistance, playerNum}
}

function makeForSale(presetCards){
    const forSale = [];

    if (presetCards != undefined){
        for (let i = 0; i < presetCards.length; i++){
            forSale.push([presetCards[i], 4]);
        }
    }

    else{
        const purchasableActions = allActions.filter(action => action.isBasicAction == "false");
        for (let i = forSale.length; i < 12; i++){
            const uniqueCard = purchasableActions.splice(Math.floor(Math.random()*purchasableActions.length), 1)[0];
            forSale.push([uniqueCard[i], 4]);
        }
    }

    return forSale;
}

function establishWorkValue(playedCards){
    let numWorkers = 0;
    for (let i = 0; i < playedCards.length; i++){
        if (playedCards[0].isWork == true){
            numWorkers++;
        }
    }

    let workValue = playedCards.length - numWorkers + Math.min(1, numWorkers - 1);
    return workValue;
}

function resolveOrderedActions(players){
    const workValue = establishWorkValue(playedCard);
    // adjust iterations to equal number of IN-GAME ordered cards-1
    for (let i = 1; i < 5; i++){
        for (let j = 0; j < players.length; j++)
        if (players[j].playedCards[0].priority == i){
            // !!!! resolve card effects
        }
    }
}

function resolveUnorderedActions(players){
    for (let i = 0; i < players.length; i++){
        const player = players.find(player => player.playerNum == i);
        eval(players[i].effect)
    }
}

function work(worker, modification){
    worker.numCoins += (workValue + modification);
}

function steal(stealer, stealFrom, modification){
    const coinsToSteal = Math.min(4 + modification, stealFrom.numCoins); // should vary based on number of steals
    stealer.numCoins += coinsToSteal;
    stealFrom.numCoins -= coinsToSteal;
}

function rest(player, modification){
    let numActionsToReturn = Math.ceil(player.discard.length/2);
    if (modification == undefined){
        numActionsToReturn = modification;
    }
    // allow player to return up to numActionsToReturn
}

function donate(giver, receiver, maxCoins){

}