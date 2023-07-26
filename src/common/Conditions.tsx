import { CharacterStatus } from "./CharacterStatus";
import { ConditionToken } from "./events";
import { GameContext } from "./game-context";

export type Comparison = 'ContextEqualsTo' | 'ContextNotEqualsTo' | 'ContextGreaterThan' | 'ContextLessThan' | 'ContextGreaterOrEqualsTo' | 'ContextLessOrEqualsTo';
export function makePlayerPropertyCondition(operator: Comparison, conditions: Partial<CharacterStatus>) {
    return (ctx: GameContext) => {
        return Object.keys(conditions).map(key => {
            const value = conditions[key as keyof CharacterStatus]!;
            const ctxValue = ctx.playerDetails[key as keyof CharacterStatus];
            switch (operator) {
                case 'ContextEqualsTo':
                    return ctxValue === value;
                case 'ContextNotEqualsTo':
                    return ctxValue !== value;
                case 'ContextGreaterThan':
                    return ctxValue > value;
                case 'ContextLessThan':
                    return ctxValue < value;
                case 'ContextGreaterOrEqualsTo':
                    return ctxValue >= value;
                case 'ContextLessOrEqualsTo':
                    return ctxValue <= value;
            }
        }).every(x => x === true);
    }
}

export function makeTokenCondition(operator: Comparison, token: ConditionToken) {
    return (ctx: GameContext) => {
        const value = typeof token === 'string' ? 1 : token.count;
        const ctxValue = ctx.tokenGet(token);
        switch (operator) {
            case 'ContextEqualsTo':
                return ctxValue === value;
            case 'ContextNotEqualsTo':
                return ctxValue !== value;
            case 'ContextGreaterThan':
                return ctxValue > value;
            case 'ContextLessThan':
                return ctxValue < value;
            case 'ContextGreaterOrEqualsTo':
                return ctxValue >= value;
            case 'ContextLessOrEqualsTo':
                return ctxValue <= value;
        }
    }
}
