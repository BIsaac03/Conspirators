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
    numCardSwaps = 1;
    numCoins = 0;
    isImmune = false;
    isBewitched = false;
    isSabotaged = false;
    hasRecruited = false;
    isInGame = false;
    isReady = false;
    waitingOn = undefined;
    tutorialPhase = 1;

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

        ////// TESTING
        const ransack = allActions.find((action) => action.name == "Ransack");
        const bewitch = allActions.find((action) => action.name == "Bewitch!");
        const communalize = allActions.find((action) => action.name == "Communalize");
        const curse = allActions.find((action) => action.name == "Curse");
        const hijack = allActions.find((action) => action.name == "Hijack");
        const honor = allActions.find((action) => action.name == "Honor");
        const impersonate = allActions.find((action) => action.name == "Impersonate");
        const pillage = allActions.find((action) => action.name == "Pillage!");
        const recruit = allActions.find((action) => action.name == "Recruit");
        const sabotage = allActions.find((action) => action.name == "Sabotage!");
        const unionize = allActions.find((action) => action.name == "Unionize");
        const whistle = allActions.find((action) => action.name == "Whistle");
        const sacrifice = allActions.find((action) => action.name == "Sacrifice");
        const accuse = allActions.find((action) => action.name == "Accuse");
        const abduct = allActions.find((action) => action.name == "Abduct!");
        const proselytize = allActions.find((action) => action.name == "Proselytize");

        this.hand.push([ransack, 4]);
        this.hand.push([honor, 4]);
        this.hand.push([hijack, 4]);
        this.hand.push([recruit, 4]);
        this.hand.push([impersonate, 4]);
        this.hand.push([unionize, 4]);
        this.hand.push([whistle, 4]);
        this.hand.push([communalize, 4]);
        this.hand.push([curse, 4]);
        this.hand.push([bewitch, 4]);
        this.hand.push([sabotage, 4]);
        this.hand.push([pillage, 4]);
        this.hand.push([sacrifice, 4]);
        this.hand.push([accuse, 4]);
        this.hand.push([abduct, 4]);
        this.hand.push([proselytize, 4]);
        //////
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
        if (this.playedCard){
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
            this.playedCard = undefined;
        }
    }
    buyCards(boughtCards, cost){
        boughtCards.forEach((card)=> {
            if (!this.hasRecruited){
                const actionInDiscard = this.discard.find((entry) => entry[0].name == card.name);
                if (!actionInDiscard){
                    this.discard.push([card, 1])
                }
                else{
                    actionInDiscard[1]++;
                }
            }
            else{
                const actionInHand = this.hand.find((entry) => entry[0].name == card.name);
                if (!actionInHand){
                    this.hand.push([card, 1])
                }
                else{
                    actionInHand[1]++;
                }
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