import { Buff } from "./Buff";
import { CharacterStatus } from "./CharacterStatus";
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

}