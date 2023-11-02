import { CharacterStatusProperty } from "./CharacterStatus";

export class Damage {
    raw: Partial<CharacterStatusProperty> = {};

    // 伤害标记
    notKill = false;


    // 数值取反
    reverse() {
        Object.keys(this.raw).forEach(k => {
            const key = k as keyof CharacterStatusProperty;
            this.raw[key] = -this.raw[key]!;
        })
    }
}