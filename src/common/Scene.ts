import { TextBuilder } from "../pages/game";
import { Character } from "./Character";
import { EscapedBuff } from "./CharacterAction";
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

    endConditions: BattleEndCondition[];

    // 活动场景中运行时操作，由系统自动生成
    runtime?: SceneRuntime;
}

// 判断战斗结束条件，具有返回值时结束场景战斗
export type BattleEndCondition = (ctx: StartedGameContext) => ConditionReturn | undefined;

export type BattleResult = 'Win' | 'Lose' | 'Escaped' | 'Other';

export type ConditionReturn = { result: BattleResult, text: string, addtionals?: any };

export interface SceneRuntime {
    addEnemy: (enemy: Character | Character[]) => void;
    removeEnemy: (enemy: Character | Character[]) => void;
    addAlly: (ally: Character | Character[]) => void;
    removeAlly: (ally: Character | Character[]) => void;

    writeBattleRecord: (str: string) => void;
    textBuilder: TextBuilder;

    advanceCharacterAction: (character: Character, percent: number) => void;

    battleEnd: (BattleResult: ConditionReturn) => void;
}

export const playerDiedEnd: BattleEndCondition = (ctx) => {
    if (ctx.player.properties().HealthCurrent <= 0) {
        return { result: 'Lose', text: '你死了。' };
    }
};
export const allEnemiesDiedEnd: BattleEndCondition = (ctx) => {
    if (ctx.currentScene?.enemies.length === 0) {
        return { result: 'Win', text: '敌人已被歼灭。' };
    }
};
export const playerEscapedEnd: BattleEndCondition = (ctx) => {
    // TODO: 逃跑条件？
    // TODO: 逃跑成功后给角色添加 `不可选中` 的 Buff，使 Action 选择目标时不会返回该角色，最后无法选择目标时将成为 NOPAction
    // 逃跑：经过一定回合准备（取决于判定），但是未必需要等到调用条件判定。。。
    if (ctx.player.buffs().some(b=>b.id === EscapedBuff.id)) {
        return { result: 'Escaped', text: '逃跑' };
    }
};

export const DemoScene: Scene = {
    id: -1,
    name: "DemoScene",
    enemies: [
        new Character(-1, 'Dummy')
    ],
    allies: [],
    setup: (ctx: StartedGameContext) => { },
    cleanup: (ctx: StartedGameContext) => { },

    endConditions: [allEnemiesDiedEnd, playerDiedEnd],
}

export const SCENE_LIST: Scene[] = [DemoScene];
