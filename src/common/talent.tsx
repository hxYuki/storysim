import { BeforeGameContext } from "./game-context";

export type Talent = {
    id: number;
    cost: number;
    name: string;
    description: string;
    onApply: (ctx: BeforeGameContext) => void;
}