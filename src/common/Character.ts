import { Buff } from "./Buff";
import { CharacterStatus, CharacterStatusProperty } from "./CharacterStatus";
import { Relic } from "./relic";

export interface Character {
    // id 为 0 时表示玩家
    id: number;
    name: string;

    properties: CharacterStatus;
    inventory: Relic[];

    buffs: Buff[];
}

export class Character {

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