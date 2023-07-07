interface GameContext {
    playerDetails: unknown;
    reachedTokens: unknown;
    currentEvent: unknown;

    playerStatSet: (stat: string, value: number) => void;
    tokenSet: (token: string) => void;
    achievementReached: (achievement: string) => void;
}