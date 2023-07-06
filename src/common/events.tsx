
type EventItem = SingleEvent | SingleEvent[];
type ConditionToken = string;
type Condition = (() => boolean) | ConditionToken;
type Conditional = {
    conditions?: Condition[];
}

type OptionBehavior = (() => boolean) | ConditionToken | ConditionToken[];
type OptionItem = {
    // 选项文本
    shortText: string;
    // 会在事件框中出现的文本
    text: string;

    // doNotEndEvent?: boolean;
    // behavior 返回 false 时，事件不会结束
    behavior: OptionBehavior;
} & Conditional;

// 满足条件的事件不是一定会出现（要求玩家处理）
// 事件在游戏开始时生成一个列表，包含本次游戏会发生的事件，需要保证 使用ConditionToken的事件，其依赖的Token事件也在这个列表中 
type SingleEvent = {
    text: string;
    additonal: ({ text: string } & Conditional)[];

    // triggered为true的事件在满足条件时立即触发
    triggered?: boolean;

    // repeatable 为 true 的事件可以重复触发
    repeatable?: boolean;

    // active 为 true 的事件由玩家手动触发
    active?: boolean;

    options?: OptionItem[];
} & Conditional;