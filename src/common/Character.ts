import { createSignal, on } from "solid-js";
import { Buff, BuffStage } from "./Buff";
import { CharacterBaseProperty, CharacterStatus, CharacterStatusCurentProperty, CharacterStatusProperty, SocialProperty, createEmptyStatus } from "./CharacterStatus";
import { DiceContext, DiceModifier } from "./Dice";
import { CharacterOperation, WithCharacterContext } from "./game-context";
import { Relic } from "./relic";
import { AttackAction, CharacterAction, DefendAction, DodgeAction, EscapeAction } from "./CharacterAction";
import { Damage } from "./Damage";

export interface Character {
    // id 为 0 时表示玩家
    id: number;
    name: string;

    properties: () => CharacterStatus;
    inventory: () => Relic[];

    buffs: () => Buff[];

    actionList: () => CharacterAction[];

    selectActionAuto: (allies?: Character[], enemies?: Character[], reactFor?: CharacterAction) => CharacterAction;
}

export class Character implements CharacterOperation {
    propertyGS;
    inventoryGS;
    buffsGS;
    actionListGS;

    diceModifiers: DiceModifier[] = [];
    // private propSetter;
    constructor(id?: number, name?: string, defaultStatus?: CharacterStatus, autoSelection?: (allies?: Character[], enemies?: Character[]) => CharacterAction) {
        this.id = id ?? 0;
        this.name = name ?? '玩家';
        this.propertyGS = createSignal<CharacterStatus>(defaultStatus ?? createEmptyStatus());
        this.inventoryGS = createSignal<Relic[]>([]);
        this.buffsGS = createSignal<Buff[]>([]);
        this.actionListGS = createSignal<CharacterAction[]>([AttackAction, DefendAction, DodgeAction, EscapeAction]);
        this.properties = this.propertyGS[0];
        this.inventory = this.inventoryGS[0];
        this.buffs = this.buffsGS[0];
        this.actionList = this.actionListGS[0];

        this.selectActionAuto = autoSelection ?? ((allies?: Character[], enemies?: Character[]) => {
            const actions = this.actionListGS[0]().filter(a => !a.disabled);


            return actions[0];
        })
    }

    bindContext(maker: () => WithCharacterContext) {
        this.ctxMaker = maker;
    }
    ctxMaker?: () => WithCharacterContext;

    replaceActionList(actions: CharacterAction[]) {
        this.actionListGS[1](actions);
    }

    statSet(stat: keyof CharacterStatus, value: number) {
        this.propertyGS[1](s => ({ ...s, [stat]: value }))
    };
    statsSet(newProps: Partial<CharacterStatus>) {
        this.propertyGS[1](s => ({
            ...s,
            ...newProps
        }));
    }
    statsModifyBy(offsets: Partial<CharacterStatus>) {
        Object.keys(offsets).forEach(k => {
            const key = k as keyof CharacterStatus;
            offsets[key] = offsets[key]! + this.propertyGS[0]()[key];
        })
        this.propertyGS[1](s => ({
            ...s,
            ...offsets
        }));
    }
    statsModifyWithLowerbound(offsets: Partial<CharacterStatus>, lowerbound = 1) {
        Object.keys(offsets).forEach(k => {
            const key = k as keyof CharacterStatus;
            offsets[key] = Math.max(lowerbound, offsets[key]! + this.propertyGS[0]()[key]);
        })
        this.propertyGS[1](s => ({
            ...s,
            ...offsets
        }));
    }

    addActions(actions: CharacterAction[]) {
        this.actionListGS[1](actions => [...actions, ...actions]);
    }
    removeActions(actionsId: number[]) {
        this.actionListGS[1](actions => actions.filter(a => !actionsId.includes(a.id)));
    }
    disableActions(actionsId: number[]) {
        this.actionListGS[1](actions => actions.map(a => {
            if (actionsId.includes(a.id)) {
                return {
                    ...a,
                    disabled: true,
                }
            }
            return a;
        }));
    }
    enableActions(actionsId: number[]) {
        this.actionListGS[1](actions => actions.map(a => {
            if (actionsId.includes(a.id)) {
                return {
                    ...a,
                    disabled: false,
                }
            }
            return a;
        }));
    }

    isEscaping() {
        return this.buffsGS[0]().some(b => b.id === 'escape-trying');
    }


    // 由自身向目标施加伤害/治疗, 根据自身buff对数值进行修饰
    dealDamage(target: Character, damage: Damage) {
        let ctx = this.ctxMaker!();
        ctx.damageDealing = damage;
        this.triggerBuff('damage-dealing', ctx);
        damage = this.dealingDamageModifier.reduce((dmg, mod) => mod(dmg), damage);

        damage = target.takeDamage(damage, this);

        this.removeOutDatedBuff();
        ctx = this.ctxMaker!();
        ctx.damageDealt = damage;
    }
    dealHealing(target: Character, damage: Damage) {

        target.takeHealing(damage, this);
    }

    // 接受来自目标的伤害/治疗, 根据自身buff对数值进行修饰
    takeDamage(damage: Damage, from: Character) {
        let ctx = this.ctxMaker!();
        ctx.damageTaking = damage;
        ctx.damageSource = from;

        this.onBeforeTakeDamage.forEach(cb => cb(ctx, from, damage));
        // this.buffs().filter(b => b.stage === 'damage-taking').forEach(b => b.onEffect(ctx));
        this.triggerBuff('damage-taking', ctx);

        damage = this.takingDamageModifier.reduce((dmg, mod) => mod(dmg), damage);

        // 伤害，将造成角色状态值下降
        damage.reverse();

        if (damage.notKill) {
            this.statsModifyWithLowerbound(damage.raw);
        } else
            this.statsModifyBy(damage.raw);

        this.removeOutDatedBuff();
        ctx = this.ctxMaker!();
        ctx.damageTaken = damage;

        this.onAfterTakeDamage.forEach(cb => cb(ctx, from, damage));

        return damage;
    };
    takeHealing(damage: Damage, from: Character) {

        this.statsModifyWithLowerbound(damage.raw);
    };

    beforeMove(ctx: WithCharacterContext) {

        this.triggerBuff('before-action');
        this.onBeforeMove.forEach(cb => cb(ctx));
        this.removeOutDatedBuff();
    }
    afterMove(ctx: WithCharacterContext) {

        this.triggerBuff('after-action');
        this.onAfterMove.forEach(cb => cb(ctx));
        this.removeOutDatedBuff();
    }
    addMoveCallback(when: 'before' | 'after', cb: (ctx: WithCharacterContext) => void) {
        if (when === 'before')
            this.onBeforeMove.push(cb);
        else
            this.onAfterMove.push(cb);
    }
    removeMoveCallback(when: 'before' | 'after', cb: (ctx: WithCharacterContext) => void) {
        if (when === 'before')
            this.onBeforeMove = this.onBeforeMove.filter(c => c !== cb);
        else
            this.onAfterMove = this.onAfterMove.filter(c => c !== cb);
    }
    // type CharacterCallback = (ctx: WithCharacterContext) => void;
    onBeforeMove: ((ctx: WithCharacterContext) => void)[] = [];
    onAfterMove: ((ctx: WithCharacterContext) => void)[] = [];

    onBeforeTakeDamage: ((ctx: WithCharacterContext, from: Character, dmg: Damage) => void)[] = [];
    onAfterTakeDamage: ((ctx: WithCharacterContext, from: Character, dmg: Damage) => void)[] = [];

    takingDamageModifier: ((dmg: Damage) => Damage)[] = [];
    dealingDamageModifier: ((dmg: Damage) => Damage)[] = [];

    applyBuff(buff: Buff) {
        this.buffsGS[1](bs => [...bs, buff]);

        buff.onApply?.(this.ctxMaker!())
    }
    removeBuff(buff: Buff | Buff[]) {
        if (!Array.isArray(buff)) {
            buff = [buff]
        }
        let buffs = buff as Buff[];

        this.buffsGS[1](bs => bs.filter(b => !buffs.includes(b)));
        buffs.forEach(b => b.onRemove?.(this.ctxMaker!()));
    }

    triggerBuff(stage: BuffStage, ctx?: WithCharacterContext) {
        this.buffs().filter(b => b.stage === stage).forEach(b => {
            if (b.remainingTime)
                b.remainingTime -= 1;
            b.onEffect(ctx ?? this.ctxMaker!());
        });
        // this.removeOutDatedBuff();
    }
    removeOutDatedBuff() {
        let toRemove = this.buffs().filter((b) => b.remainingTime! <= 0);
        this.removeBuff(toRemove);
    }

    addRelic(relic: Relic) { }
    dropRelic(relic: Relic) { }
}
