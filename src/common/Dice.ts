import { Character } from "./Character";

export interface Dice {
    diceClasses: string[];

    dice(diceContext: DiceContext, base: number, requirement: number): DiceResult;
}

export interface DiceContext {
    valueModifier: Record<string, number>[];
    limitModifier: Record<string, number>[];
}

export interface DiceResult {
    result: 'terrific' | 'success' | 'fail' | 'screwed';
    // TODO: 或许可以进一步封装 Reason
    reasons: [string[], string[]];
}