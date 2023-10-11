import { Character } from "./Character";

export interface Dice {
    diceClasses: string[];

    dice(diceContext: DiceContext, base: number, requirement: number): DiceResult;
}

export type DiceModifier = {
    type: 'value' | 'limit';
    applyTo: string;
    amount: number;
    description: string;
}

export interface DiceContext {
    valueModifier: DiceModifier[];
    limitModifier: DiceModifier[];
    chanceInstance: Chance.Chance;
}

export interface DiceResult {
    result: 'terrific' | 'success' | 'fail' | 'screwed';
    value: number;
    // TODO: 或许可以进一步封装 Reason
    reasons: [string[], string[]];
}

function Clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
class CharacterSpeedDice implements Dice {
    diceClasses = ['speed-dice'];

    dice(diceContext: DiceContext, base: number, requirement: number): DiceResult {
        const appliedMods = diceContext.valueModifier.filter(m => this.diceClasses.includes(m.applyTo));

        const value = Clamp(diceContext.chanceInstance.d20() + appliedMods.reduce((acc, cur) => acc + cur.amount, 0), 1, 20);

        const result = value <= 1 ? 'screwed' :
            value <= 5 ? 'fail' :
                value <= 19 ? 'success' : 'terrific';


        const reasons: [string[], string[]] = [[], []];
        appliedMods.forEach(m => {
            if (m.amount > 0) {
                reasons[0].push(m.description);
            } else {
                reasons[1].push(m.description);
            }
        })

        return {
            result,
            value: result === 'terrific' ? 2 : result === 'success' ? 1 : result === 'fail' ? 0.75 : 0.5,
            reasons
        }
    }
}
export const CharacterInitalSpeedDice = new CharacterSpeedDice();