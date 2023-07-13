import { GameContext } from "./game-context";
import chance from 'chance';

export type EventItem = SingleEvent | EventChain | EventThread;
export type EventChain = {
    type: 'chain';
    events: SingleEvent[];

    // 将要进行的事件索引
    index: number;
} & EventProperty;

// 与事件链不同，不一定会连续进行
export type EventThread = {
    type: 'collection';
    events: SingleEvent[];

    // 将要进行的事件索引
    index: number;
    // 将要进行的事件，可以用于计算概率权重等
    next: SingleEvent;
}
export type ConditionToken = string;
export type Condition = ((ctx: GameContext) => boolean) | ConditionToken;
export type Conditional = {
    conditions?: Condition[];
}

export type OptionBehavior = ((ctx: GameContext) => boolean) | ConditionToken | ConditionToken[];
export type OptionItem = {
    // 选项文本
    shortText: string;
    // 会在事件框中（描述玩家的行为）出现的文本
    text?: string;

    // 选择选项后在事件框 作为反馈 出现的文本
    responseText?: string;

    doNotEndEvent?: boolean;
    // behavior 返回 false 时，事件也不会结束？
    behavior?: OptionBehavior;
    // 当 behavior 中运行函数时设置token，或许需要在此声明以简化后续处理
    dynamicTokens?: ConditionToken[];
} & Conditional;

// 满足条件的事件不是一定会出现（要求玩家处理）
// 事件在游戏开始时生成一个列表，包含本次游戏会发生的事件，需要保证 使用ConditionToken的事件，其依赖的Token事件也在这个列表中 
export type SingleEvent = {
    type: 'single';
    text: string;
    additonal?: ({ text: string } & Conditional)[];

    options?: OptionItem[];
} & Conditional & EventProperty;

export type EventProperty = {
    // triggered为true的事件在满足条件时立即触发
    triggered?: boolean;

    // repeatable 为 true 的事件可以重复触发
    repeatable?: boolean;

    // active 为 true 的事件由玩家手动触发
    active?: boolean;

    // 事件出现几率影响因子，增加或减少事件出现的可能性
    // 影响出现几率的百分比，所有事件的基础权重为 1，返回0.2即提升20% 即权重为 1.2
    possibility?: (ctx: GameContext) => number;
}

export function weightedPickEvent(events: EventItem[], ctx: GameContext, rng: Chance.Chance): EventItem {
    let cal = events.map(e => {
        if (e.type === 'collection')
            return { event: e, weight: e.next.possibility ? e.next.possibility(ctx) : 1 };
        else
            return { event: e, weight: e.possibility ? e.possibility(ctx) : 1 };
    });
    let totalWeight = cal.reduce((acc, cur) => acc + cur.weight, 0);
    let rnd = rng.floating({ min: 0, max: totalWeight });
    for (const item of cal) {
        if (rnd < item.weight) {
            return item.event;
        }
        rnd -= item.weight;
    }
    return cal[cal.length - 1].event;
}