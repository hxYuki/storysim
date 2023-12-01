import { Character } from "./Character";
import { StartedGameContext } from "./game-context";


// 用于保存、构建战斗场景
export interface Scene {
    id: number;
    name: string;

    enemies: Character[];
    allies: Character[];

    // 初始化：设置场地 Buff、添加/禁用Action等
    setup: (ctx: StartedGameContext) => void;

    // 角色进行一定的操作触发结束战斗，仅用于回调，如根据战斗结果设置属性、Buff、奖励等
    // 触发机制可以在 setup 中为角色设置 Action
    // 例：击败所有敌人、逃跑、死亡、作为连续场景时切换到下一个场景、解密等满足某种特定条件的情况
    cleanup: (ctx: StartedGameContext) => void;

    // 活动场景中运行时操作
    runtime?: SceneRuntime;
}

export interface SceneRuntime {
    addEnemy: (enemy: Character | Character[]) => void;
    removeEnemy: (enemy: Character | Character[]) => void;
    addAlly: (ally: Character | Character[]) => void;
    removeAlly: (ally: Character | Character[]) => void;

    writeBattleRecord: (str: string) => void;

    advanceCharacterAction: (character: Character, percent: number) => void;
}

export const DemoScene: Scene = {
    id: -1,
    name: "DemoScene",
    enemies: [
        new Character(-1, 'Dummy')
    ],
    allies: [],
    setup: (ctx: StartedGameContext) => { },
    cleanup: (ctx: StartedGameContext) => { },
}
