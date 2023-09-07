import { StartedGameContext } from "./game-context";


export interface CharacterAction {
    id: number
    name: string;
    description: string;

    act(ctx: StartedGameContext): void;

    disabled?: boolean;
    disabledText?: string;
}

export const EscapeAction: CharacterAction = {
    id: 0,
    name: '逃跑',
    description: '虽然不一定总是好用，但至少一个轻松的选择。',
    disabledText: '总会有事情是避无可避，必须面对的。',
    act: (ctx) => {
        // TODO:

    }
}