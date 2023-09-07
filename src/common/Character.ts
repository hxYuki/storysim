import { createSignal } from "solid-js";
import { Buff } from "./Buff";
import { CharacterBaseProperty, CharacterStatus, CharacterStatusCurentProperty, CharacterStatusProperty, SocialProperty, createEmptyStatus } from "./CharacterStatus";
import { DiceContext } from "./Dice";
import { CharacterOperation } from "./game-context";
import { Relic } from "./relic";
import { CharacterAction } from "./CharacterAction";

export interface Character {
    // id 为 0 时表示玩家
    id: number;
    name: string;

    properties: () => CharacterStatus;
    inventory: () => Relic[];

    buffs: () => Buff[];

    actionList: () => CharacterAction[];
}

export class Character implements CharacterOperation {
    propertyGS;
    inventoryGS;
    buffsGS;
    // private propSetter;
    constructor(id?: number, name?: string, defaultStatus?: CharacterStatus) {
        this.id = id ?? 0;
        this.name = name ?? '玩家';
        this.propertyGS = createSignal<CharacterStatus>(defaultStatus ?? createEmptyStatus());
        this.inventoryGS = createSignal<Relic[]>([]);
        this.buffsGS = createSignal<Buff[]>([]);
        this.properties = this.propertyGS[0];
        this.inventory = this.inventoryGS[0];
        this.buffs = this.buffsGS[0];
    }
    createDiceContext(): DiceContext {
        throw new Error("Method not implemented.");
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

    addActions(actions: CharacterAction[]) { }
    removeActions(actions: number[]) { }
    disableActions(actionsId: number[]) { }

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