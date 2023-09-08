import { Character } from "./Character";
import { StartedGameContext } from "./game-context";


// 用于保存、构建战斗场景
export interface Scene {
    enemies: Character[];
    allies: Character[];

    // 初始化：设置场地 Buff、添加/禁用Action等
    setup: (ctx: StartedGameContext) => void;

    // 角色进行一定的操作触发结束战斗，仅用于回调，如根据战斗结果设置属性、Buff、奖励等
    // 触发机制可以在 setup 中为角色设置 Action
    // 例：击败所有敌人、逃跑、死亡、作为连续场景时切换到下一个场景、解密等满足某种特定条件的情况
    exit: (ctx: StartedGameContext) => void;
}