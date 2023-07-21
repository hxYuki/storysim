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
    tokenSet: (token: string) => void;
    // 0: 不存在，>=1: 存在，堆叠层数
    tokenExists: (token: string) => number;
    tokenRemove: (token: string) => void;
    achievementReached: (achievement: string) => void;
    breakChainEvent: () => void;
}

export interface PlayerContext {
    playerDetails: CharacterStatus;
    playerStatSet: (stat: keyof CharacterStatus, value: number) => void;
    playerStatsSet: (stats: Partial<CharacterStatus>) => void;
}

export interface EventContext {

}