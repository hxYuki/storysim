import { writeSignal } from "solid-js/types/reactive/signal";
import { Buff, BuffStage } from "./Buff";
import { Character } from "./Character";
import { Damage } from "./Damage";
import { CharacterPropertyCheckEfficientDice } from "./Dice";
import { StartedGameContext, WithCharacterContext } from "./game-context";

// 角色在战斗中可以进行的操作
// 或许与场景强相关，在别处定义的行动应当遵循一定原则：避免影响“场景”的安排、发展
// 或许可以抽象为几种类型，如：攻击、防御、强化、弱化、治疗
export interface CharacterAction {
    id: number
    name: string;
    type: ActoinType;
    description: string;

    act(ctx: WithCharacterContext, targets: Character[]): void;

    // 当 needTarget 为 true，选择目标返回空数组时，行动会被替换为 NOTargetAction
    needsTarget?: boolean;
    targetChoosingAuto(ctx: WithCharacterContext, triggeredBy?: Character, filters?: ((c: Character) => boolean)[]): Character[];

    disabled?: boolean;
    disabledText?: string;

    textBuildTemplate?: string;
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

const SelfTargetActionTemplate: string = '{SourceName} 使用了 {ActionName}。';

// TODO：各类型行动 目标选择函数 默认实现

export const NoTargetAction: CharacterAction = {
    id: -2,
    name: '无目标',
    type: 'special',
    description: '未找到目标的失败行动。',
    act: (ctx, targets) => {
        // ctx.currentScene?.runtime?.writeBattleRecord(`${ctx.currentCharacter.name}呆在原地，一动也不动。`)
    },
    targetChoosingAuto: (ctx, triggeredBy) => [],

    textBuildTemplate: '{SourceName} 使用了 {ActionName}，但是没有找到目标。',
}
export const NoTargetActionFromAction: (action: CharacterAction) => CharacterAction = (action) => {
    return {
        ...NoTargetAction,
        name: action.name,
    }
}
export const NOPAction: CharacterAction = {
    id: -1,
    name: '无操作',
    type: 'special',
    description: '什么都不做。',
    act: (ctx, targets) => {
    },
    targetChoosingAuto: (ctx, triggeredBy) => [],

    textBuildTemplate: '',
}

class EscapeTryingBuff extends Buff {
    static id = "escape-trying";
    name = "逃跑尝试";
    stage: BuffStage = 'before-action';
    onEffect = (ctx: WithCharacterContext) => {
        if (this.remainingTime! > 1)
            ctx.currentScene!.runtime!.writeBattleRecord(`${ctx.currentCharacter.name} 正在努力逃跑。`);
    }
    onApply = (ctx: WithCharacterContext) => {
        ctx.currentCharacter.disableActions(ctx.currentCharacter.actionList().map(a => a.id));
    }
    onRemove = (ctx: WithCharacterContext) => {
        ctx.currentCharacter.enableActions(ctx.currentCharacter.actionList().map(a => a.id));
        ctx.currentScene!.runtime!.battleEnd({ result: 'Escaped', text: '逃跑' });
    }

    constructor(perparationTurn = 3) {
        super();
        this.remainingTime = perparationTurn;
    }
}

// TODO: 实现，Buff 标识一个角色已经逃跑，不会成为一般行动目标
export class EscapedBuff extends Buff {
    static id = 'escaped';
}

export const EscapeAction: CharacterAction = {
    id: 0,
    name: '逃跑',
    type: 'escape',
    description: '虽然不一定总是好用，但至少一个轻松的选择。',
    disabledText: '总会有事情是避无可避，必须面对的。',
    act: (ctx, targets) => {
        // TODO: 判定逃跑 离开战斗
        // ctx.player.disableActions([0]);
        ctx.currentCharacter.applyBuff(new EscapeTryingBuff());
    },
    targetChoosingAuto: (ctx, triggeredBy) => [],

    textBuildTemplate: SelfTargetActionTemplate,
}

export const AttackAction: AttackAction = {
    id: 1,
    name: '攻击',
    type: 'attack',
    description: '进行打击。',
    act: (ctx, targets) => {
        const diceCtx = ctx.createDiceContext();

        const damageEfficient = CharacterPropertyCheckEfficientDice.withTags('damage', 'health', 'attack').dice(diceCtx, ctx.currentCharacter.properties().Constitution, targets[0].properties().Constitution);

        const damage = Math.floor(damageEfficient.value * ctx.currentCharacter.properties().Constitution);

        ctx.currentCharacter.dealDamage(targets[0], Damage.fromRaw({ Health: damage }));
    },
    needsTarget: true,
    targetChoosingAuto: (ctx, triggeredBy, filters) => {
        if (triggeredBy)
            return [triggeredBy];

        const source = ctx.currentScene!.enemies.filter(c => filters?.every(f => f(c)) ?? true);

        return ctx.currentScene ? [source[0]] : [];
    }
}

class DefendDamageReduce extends Buff {
    static id = "defend-damage-reduce";
    name = "防御减伤";
    constructor(ratio: number) {
        super();
        this.ratio = ratio;
    }
    remainingTime = 1;
    ratio: number;
    dmgReducer = (damage: Damage) => {
        damage.multiplyBy(this.ratio)
        return damage;
    };
    onApply = (ctx: WithCharacterContext) => {
        ctx.currentCharacter.takingDamageModifier.push(this.dmgReducer)
    }
    onRemove = (ctx: WithCharacterContext) => {
        ctx.currentCharacter.takingDamageModifier = ctx.currentCharacter.takingDamageModifier.filter(f => f !== this.dmgReducer);
    }
}
export const DefendAction: CharacterAction = {
    id: 2,
    name: '防御',
    type: 'defend', // 无条件减伤，根据判定决定幅度
    description: '抵挡将要来袭的打击。',
    act: (ctx, targets) => {
        const diceCtx = ctx.createDiceContext();
        const result = CharacterPropertyCheckEfficientDice.withTags('defend').dice(diceCtx, ctx.currentCharacter.properties().Constitution, ctx.currentCharacter.properties().Constitution);
        const ratio = 0.1 + result.value * 0.35;

        targets[0].applyBuff(new DefendDamageReduce(ratio));
    },
    targetChoosingAuto: (ctx, triggeredBy) => [ctx.currentCharacter],

    textBuildTemplate: SelfTargetActionTemplate,
}


class DodgePreparation extends Buff {
    static id = "dodge-preparation";
    name = "闪避预兆";
    stage: BuffStage = 'damage-taking'

    damageReducer = (damage: Damage) => {
        damage.multiplyBy(0);
        return damage;
    }

    onEffect = (ctx: WithCharacterContext) => {
        // this.remainingTime--;
        const diceCtx = ctx.createDiceContext();
        const result = CharacterPropertyCheckEfficientDice
            .withTags('dodge')
            .dice(diceCtx, ctx.currentCharacter.properties().Dexterity, ctx.damageSource!.properties().Dexterity);

        if (result.result === 'success' || result.result === 'terrific') {
            ctx.currentCharacter.takingDamageModifier.push(this.damageReducer);
            ctx.currentScene!.runtime!.textBuilder.addText("ActionResult", "闪避");
            ctx.currentScene!.runtime!.textBuilder.setTemplate('{SourceName} 对 {TargetName} 使用了 {ActionName}，但是被 {ActionResult} 了！');
            // ctx.currentScene!.runtime!.writeBattleRecord(`${ctx.currentCharacter.name}闪避了${ctx.damageSource!.name}的攻击。`);

        }
        if (result.result === 'terrific') {
            // TODO: 反击
            ctx.currentScene!.runtime!.advanceCharacterAction(ctx.currentCharacter, 1);
            ctx.currentScene!.runtime!.textBuilder.addText("ActionResult", "完美闪避");
            ctx.currentScene!.runtime!.textBuilder.setTemplate('{SourceName} 对 {TargetName} 使用了 {ActionName}，但是被 {ActionResult} ！{TargetName} 抓到了破绽！');
            // ctx.currentScene?.runtime?.writeBattleRecord(`${ctx.currentCharacter.name}并进行了反击。`)

        }
    }
    onRemove = (ctx: WithCharacterContext) => {
        // ctx.currentCharacter.takingDamageModifier = ctx.currentCharacter.takingDamageModifier.filter(f => f !== this.damageReducer);
    }


    constructor() {
        super();
    }
    remainingTime = 1;
}
export const DodgeAction: CharacterAction = {
    id: 3,
    name: '闪避',
    type: 'dodge', // 判定，完全躲避伤害并提供额外的反击机会
    description: '躲避将要来袭的打击。',
    act: (ctx, targets) => {
        ctx.currentCharacter.applyBuff(new DodgePreparation());
    },
    targetChoosingAuto: (ctx, triggeredBy) => [ctx.currentCharacter],

    textBuildTemplate: SelfTargetActionTemplate,
}
