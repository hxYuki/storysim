import { CharacterStatus } from "./CharacterStatus";
import { ConditionToken, EventItem, SingleEvent } from "./events";

export interface GameContext {
    // player: PlayerContext;

    playerDetails: CharacterStatus;
    reachedTokens: ConditionToken[];
    // 当前进行的事件
    currentEvent: SingleEvent;

    // 在事件上下文的回调中用于获取该事件
    thisEvent?: EventItem;

    playerStatSet: (stat: keyof CharacterStatus, value: number) => void;
    playerStatsSet: (stats: Partial<CharacterStatus>) => void;

    tokenSet: (token: string, stackable?: boolean) => void;
    // 0: 不存在，>=1: 存在，层数
    tokenGet: (token: ConditionToken) => number;
    tokenExists: (token: ConditionToken) => boolean;
    tokenRemove: (token: ConditionToken, removeAll?: boolean) => void;
    achievementReached: (achievement: string) => void;
    breakChainEvent: () => void;
}

// 用于事件上下文的只读上下文（或许有用或许没用吧）
export interface ReadOnlyGameContext { }

export interface PlayerContext {
    playerDetails: CharacterStatus;
    playerStatSet: (stat: keyof CharacterStatus, value: number) => void;
    playerStatsSet: (stats: Partial<CharacterStatus>) => void;
}

export interface EventContext {

}