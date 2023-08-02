import { GameContext } from "./game-context";

export type Talent = {
    id: number;
    cost: number;
    name: string;
    description: string;
    apply: (ctx: GameContext) => void;
}