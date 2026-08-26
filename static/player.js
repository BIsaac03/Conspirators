import {allActions} from "./actions.js";

export class Player{
    constructor(ID, name, color, numPlayers){
        this.playerID = ID;
        this.playerName = name;
        this.playerColor = color;
        this.playerNum = numPlayers;
    }

    hand = [];
    discard = [];
    playedCard = undefined;
    currentTarget = undefined;
    numCardSwaps = 0;
    numRedirects = 0;
    numCoins = 0;
    numCoinsInVault = 0;
    isImmune = false;
    isInGame = false;
    isReady = false;
    waitingOn = undefined;

    createStartingHand(selectedBAs){
        const steal = allActions.find((action) => action.name == "Steal");
        const work = allActions.find((action) => action.name == "Work");
        const defend = allActions.find((action) => action.name == "Defend");
        const retaliate = allActions.find((action) => action.name == "Retaliate");
        const rest = allActions.find((action) => action.name == "Rest");

        this.hand.push([steal, 3]);
        this.hand.push([work, 3]);
        this.hand.push([defend, 2]);
        this.hand.push([retaliate, 1]);
        this.hand.push([rest, 1]);
        this.hand.push([selectedBAs[0], 1]);
        this.hand.push([selectedBAs[1], 1])

    }

    confirmAction(card, target, isFinal){
        this.playedCard = card;
        this.currentTarget = target;

        if (isFinal){
            const indexOfSelectedAction = this.hand.findIndex((entry) => entry[0].name == card.name);
            if (this.hand[indexOfSelectedAction][1] === 1){
                this.hand.splice(indexOfSelectedAction, 1);
            }
            else{
                this.hand[indexOfSelectedAction][1]--;
            }
        }
    }
    discardPlayedCard(){
        // return Rest to hand
        if (this.playedCard.name === "Rest"){
            this.hand.push([this.playedCard, 1]);
        }
        // discard other played cards
        else{
            const actionInDiscard = this.discard.find((entry) => entry[0].name == this.playedCard.name);
            if (!actionInDiscard){
                this.discard.push([this.playedCard, 1])
            }
            else{
                actionInDiscard[1]++;
            }
        }
    }
    buyCards(boughtCards, cost){
        boughtCards.forEach((card)=> {
            const actionInDiscard = this.discard.find((entry) => entry[0].name == card.name);
            if (!actionInDiscard){
                this.discard.push([card, 1])
            }
            else{
                actionInDiscard[1]++;
            }
        })
        this.numCoins -= cost;
        if (boughtCards.length == 2){
            this.numCoins++;
        }
        else if (boughtCards.length == 3){
            this.numCoins += 3;
        }
    }

    prepareToRetrieveCards(numCardsToRetrieve, io){
        this.isReady = false;
        this.waitingOn = "retrieveCards";
        io.emit("retrieveCards", this.playerID, numCardsToRetrieve);
    }
    retrieveSelectedCards(cards){
        cards.forEach((entry) => {
            const actionInDiscard = this.discard.find((action) => action.name === entry[0]);
            const actionInHand = this.hand.find((action) => action.name == entry[0]);
            // remove card from discard
            if (actionInDiscard[1] === entry[1]){
                const index = this.discard.indexOf(actionInDiscard);
                this.discard.splice(index, 1);
            }
            else{
                actionInDiscard[1] -= entry[1];
            }
            // add card to hand
            if (!actionInHand){
                this.hand.push([entry])
            }
            else{
                actionInHand[1] += entry[1];
            }
        })
    }
}