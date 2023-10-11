import { Character } from "./Character";
import { StartedGameContext } from "./game-context";

// 角色在战斗中可以进行的操作
// 或许与场景强相关，在别处定义的行动应当遵循一定原则：避免影响“场景”的安排、发展
// 或许可以抽象为几种类型，如：攻击、防御、强化、弱化、治疗
export interface CharacterAction {
    id: number
    name: string;
    type: ActoinType;
    description: string;

    act(ctx: StartedGameContext, targets: Character[]): void;

    targetChoosingAuto(ctx: StartedGameContext): Character[];

    disabled?: boolean;
    disabledText?: string;
}
export type ActoinType = 'escape' | 'attack' | 'defend' | 'dodge' | 'enhance' | 'weaken' | 'heal' | 'special';
export interface AttackAction extends CharacterAction {
    type: 'attack';
}
export interface DefendAction extends CharacterAction {
    type: 'defend';
}
export interface DodgeAction extends CharacterAction {
    type: 'dodge';
}
export interface EnhanceAction extends CharacterAction {
    type: 'enhance';
}
export interface WeakenAction extends CharacterAction {
    type: 'weaken';
}
export interface HealAction extends CharacterAction {
    type: 'heal';
}
export interface SpecialAction extends CharacterAction {
    type: 'special';
}

// TODO：各类型行动 目标选择函数 默认实现

export const NOPAction: CharacterAction = {
    id: -1,
    name: '无操作',
    type: 'special',
    description: '什么都不做。',
    act: (ctx, targets) => {
        ctx.currentScene?.runtime?.writeBattleRecord(`${ctx.currentCharacter?.name}呆在原地，一动也不动。`)
    },
    targetChoosingAuto: (ctx) => []
}

export const EscapeAction: CharacterAction = {
    id: 0,
    name: '逃跑',
    type: 'escape',
    description: '虽然不一定总是好用，但至少一个轻松的选择。',
    disabledText: '总会有事情是避无可避，必须面对的。',
    act: (ctx, targets) => {
        // TODO:
        ctx.player.disableActions([0]);
    },
    targetChoosingAuto: (ctx) => []
}

export const AttackAction: AttackAction = {
    id: 1,
    name: '攻击',
    type: 'attack',
    description: '进行打击。',
    act: (ctx, targets) => {
        // TODO:
    },
    targetChoosingAuto: (ctx) => []
}

export const DefendAction: CharacterAction = {
    id: 2,
    name: '防御',
    type: 'defend', // 无条件减伤，根据判定决定幅度
    description: '抵挡将要来袭的打击。',
    act: (ctx, targets) => { },
    targetChoosingAuto: (ctx) => []
}

export const DodgeAction: CharacterAction = {
    id: 3,
    name: '闪避',
    type: 'dodge', // 判定，完全躲避伤害并提供额外的反击机会
    description: '躲避将要来袭的打击。',
    act: (ctx, targets) => { },
    targetChoosingAuto: (ctx) => []
}