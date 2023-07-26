import { GameContext } from "./game-context";

export type Relic = {
    id: number;
    name: string;
    description: string;
    // 主动使用效果
    use?: (ctx: GameContext) => void;
    // 获得被动效果
    hold: (ctx: GameContext) => void;
    // 失去移除效果
    lost: (ctx: GameContext) => void;
}