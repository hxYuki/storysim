import { Character } from "./Character";

export interface Dice {
    diceClasses: string[];

    dice(diceContext: DiceContext, base: number, requirement: number): DiceResult;

    withTags(...tags: string[]): Dice;
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

function withTags(dice: Dice, ...tags: string[]): Dice {
    const newDice = Object.create(dice);
    newDice.diceClasses = [...dice.diceClasses, ...tags];
    return newDice;
}

function Clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
class CharacterSpeedDice implements Dice {
    diceClasses = ['speed-dice'];
    withTags(...tags: string[]): Dice {
        return withTags(this, ...tags);
    }

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

// 角色属性检定骰
// 适用 自身 -- 目标属性 模式
// 正的属性差距 与 大成功概率 关系为 (1+x)/(20+x)
// 负的属性差距 与 大失败概率 关系为 x/20
class CharacterPropertyDice implements Dice {
    diceClasses = ['damage-dice'];
    withTags(...tags: string[]): Dice {
        return withTags(this, ...tags);
    }
    dice(diceContext: DiceContext, base: number, requirement: number): DiceResult {
        const valueMod = diceContext.valueModifier.filter(m => this.diceClasses.includes(m.applyTo));
        const limitMod = diceContext.limitModifier.filter(m => this.diceClasses.includes(m.applyTo));

        const d = (base + valueMod.reduce((acc, cur) => acc + cur.amount, 0)) - (requirement + limitMod.reduce((acc, cur) => acc + cur.amount, 0));
        // 当属性差距达到20，必定会大失败
        const dice = diceContext.chanceInstance.natural({ min: 1, max: Math.max(20 + d, 20) });

        const result = dice <= Math.max(1 - d, 1) ? 'screwed' :
            dice <= 5 ? 'fail' :
                dice <= 19 ? 'success' : 'terrific';

        const efficient = result == 'terrific' ? 2 :
            result == 'screwed' ? 0.2 : d > 0 ? 1 + d * 0.2 / 5 : 1 + d * 0.1 / 5

        const reasons: [string[], string[]] = [[], []];
        for (const m of valueMod) {
            if (m.amount > 0) {
                reasons[0].push(m.description);
            } else {
                reasons[1].push(m.description);
            }
        }
        for (const m of limitMod) {
            if (m.amount < 0) {
                reasons[0].push(m.description);
            } else {
                reasons[1].push(m.description);
            }
        }

        return {
            result,
            value: efficient,
            reasons
        }
    }
}
export const CharacterPropertyCheckDice = new CharacterPropertyDice();