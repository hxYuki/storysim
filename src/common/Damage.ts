import { CharacterStatusCurentProperty, CharacterStatusProperty } from "./CharacterStatus";

export class Damage {
    raw: Partial<CharacterStatusCurentProperty> = {};



    // 伤害标记
    notKill = false;

    public static fromRaw(raw: Partial<CharacterStatusProperty>) {
        let damage = new Damage();
        // map raw to current
        Object.keys(raw).forEach(k => {
            const key = k as keyof CharacterStatusProperty;
            if (raw[key])
                damage.raw[StatusPropertyToCurrentProperty(key)] = raw[key]!;
        })
        // damage.raw = { HealthCurrent: raw.Health, SanityCurrent: raw.Sanity, StaminaCurrent: raw.Stamina };
        return damage;
    }
    // 数值取反
    public reverse() {
        Object.keys(this.raw).forEach(k => {
            const key = k as keyof CharacterStatusCurentProperty;
            this.raw[key] = -this.raw[key]!;
        })
    }
    public multiplyBy(multiplier: number) { 
        Object.keys(this.raw).forEach(k => {
            const key = k as keyof CharacterStatusCurentProperty;
            this.raw[key] = this.raw[key]! * multiplier;
        })
    }
}

function StatusPropertyToCurrentProperty(status: keyof CharacterStatusProperty): keyof CharacterStatusCurentProperty {
    return `${status}Current` as keyof CharacterStatusCurentProperty;
}