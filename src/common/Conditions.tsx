import { CharacterStatus } from "./CharacterStatus";
import { ConditionToken } from "./events";
import { StartedGameContext } from "./game-context";

export type Comparison = 'ContextEqualsTo' | 'ContextNotEqualsTo' | 'ContextGreaterThan' | 'ContextLessThan' | 'ContextGreaterOrEqualsTo' | 'ContextLessOrEqualsTo';
export type BidirectionalComparison = 'ContextInBetween' | 'ContextNotInBetween';


type PARAM_MAP = Record<Comparison, Partial<CharacterStatus>> & Record<BidirectionalComparison, Partial<{ [CK in keyof CharacterStatus]: [CharacterStatus[CK], CharacterStatus[CK]] }>>;
type PARAM_KEY<T extends Comparison | BidirectionalComparison> = PARAM_MAP[T];
export function makePlayerPropertyCondition<
    OP extends Comparison | BidirectionalComparison,
    CD extends PARAM_KEY<OP>
>(operator: OP, conditions: CD) {
    return (ctx: StartedGameContext) => {
        return Object.keys(conditions).map(key => {
            const value = conditions[key as keyof CharacterStatus]!;
            const ctxValue = ctx.playerDetails[key as keyof CharacterStatus];
            switch (operator) {
                case 'ContextEqualsTo':
                    return ctxValue === value;
                case 'ContextNotEqualsTo':
                    return ctxValue !== value;
                case 'ContextGreaterThan':
                    return ctxValue > (value as number);
                case 'ContextLessThan':
                    return ctxValue < (value as number);
                case 'ContextGreaterOrEqualsTo':
                    return ctxValue >= (value as number);
                case 'ContextLessOrEqualsTo':
                    return ctxValue <= (value as number);
                case 'ContextInBetween':
                    // const v = value as [number, number];
                    return ctxValue >= (value as [number, number])[0] && ctxValue <= (value as [number, number])[1];
                case 'ContextNotInBetween':
                    return ctxValue < (value as [number, number])[0] || ctxValue > (value as [number, number])[1];
            }

        }).every(x => x === true);
    }
}

export function makeTokenCondition(operator: Comparison, token: ConditionToken) {
    return (ctx: StartedGameContext) => {
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
