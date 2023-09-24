import { CharacterStatus } from "./CharacterStatus";
import { DiceContext } from "./Dice";
import { ConditionToken, EventItem, SingleEvent } from "./events";
import { Character } from './Character';
import { Scene } from "./Scene";

export type GameContext = BeforeGameContext | StartedGameContext | AfterGameContext;
export interface BeforeGameContext {
    gameState: 'talent-choose' | 'property-upgrade'
    // availablePropertyPoints: number;

    pushGameState(): void;
    tokensToAdd(tokens: ConditionToken[]): void;
    setPropertyUpgradePointsModification(modification: number): void;
    setPropertyModification(modification: Partial<CharacterStatus>): void;
}
export interface StartedGameContext {
    // player: PlayerContext;
    gameState: 'game-start'
    chanceInstance: Chance.Chance;
    createDiceContext: (character: Character) => DiceContext;
    player: Character;

    currentScene: Scene | undefined;

    // playerDetails: CharacterStatus;
    reachedTokens: ConditionToken[];
    // 当前进行的事件
    currentEvent: SingleEvent;

    // 在事件上下文的回调中用于获取该事件
    thisEvent?: EventItem;

    time: () => number;

    startBattle: (sceneId: number) => void;
    endBattle: () => void;

    tokenSet: (token: string, stackable?: boolean) => void;
    // 0: 不存在，>=1: 存在，层数
    tokenGet: (token: ConditionToken) => number;
    tokenExists: (token: ConditionToken) => boolean;
    tokenRemove: (token: ConditionToken, removeAll?: boolean) => void;
    achievementReached: (achievement: string) => void;
    breakChainEvent: () => void;

    endGame(): void;
}

export interface AfterGameContext {
    gameState: 'game-end'

    newGame(): void;
}
// 用于事件上下文的只读上下文（或许有用或许没用吧）
export interface ReadOnlyGameContext { }

export interface CharacterOperation {
    //     // properties: CharacterStatus;
    statSet: (stat: keyof CharacterStatus, value: number) => void;
    statsSet: (stats: Partial<CharacterStatus>) => void;

}

export interface EventContext {

}

export interface TokenContext { }

export interface GameProcessContext {

}