import { WithCharacterContext } from "./game-context";

export type Relic = {
    id: number;
    name: string;
    description: string;
    // 主动使用效果
    use?: (ctx: WithCharacterContext) => void;
    // 获得被动效果
    hold: (ctx: WithCharacterContext) => void;
    // 失去移除效果
    lost: (ctx: WithCharacterContext) => void;
}