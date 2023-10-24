import { createSignal } from "solid-js";
import { Buff } from "./Buff";
import { CharacterBaseProperty, CharacterStatus, CharacterStatusCurentProperty, CharacterStatusProperty, SocialProperty, createEmptyStatus } from "./CharacterStatus";
import { DiceContext, DiceModifier } from "./Dice";
import { CharacterOperation } from "./game-context";
import { Relic } from "./relic";
import { AttackAction, CharacterAction, DefendAction, DodgeAction, EscapeAction } from "./CharacterAction";

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



    // 由自身向目标施加伤害/治疗
    damage(target: Character, damages: Partial<CharacterStatusProperty>) {

    }
    heal(target: Character, damages: Partial<CharacterStatusProperty>) {

    }

    // takeDamage;
    // takeHealing;

    applyBuff(buff: Buff) { }
    removeBuff(buff: Buff) { }

    addRelic(relic: Relic) { }
    dropRelic(relic: Relic) { }
}