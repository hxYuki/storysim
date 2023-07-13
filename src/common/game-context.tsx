import { CharacterStatus } from "./CharacterStatus";
import { ConditionToken, SingleEvent } from "./events";

export interface GameContext {
    playerDetails: CharacterStatus;
    reachedTokens: ConditionToken[];
    currentEvent: SingleEvent;

    playerStatSet: (stat: keyof CharacterStatus, value: number) => void;
    playerStatsSet: (stats: Partial<CharacterStatus>) => void;
    tokenSet: (token: string) => void;
    achievementReached: (achievement: string) => void;
    breakChainEvent: () => void;
}