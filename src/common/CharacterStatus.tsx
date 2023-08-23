export type CharacterStatus = CharacterStatusProperty & CharacterStatusCurentProperty & SocialProperty & CharacterBaseProperty & {
    Speed: number;
};

export type CharacterStatusProperty = {
    Health: number;
    Sanity: number;
    Stamina: number;
}
export type CharacterStatusCurentProperty = {
    HealthCurrent: number;
    SanityCurrent: number;
    StaminaCurrent: number;
}

export type SocialProperty = {
    Moral: number;
    Money: number;
    Age: number;
}

export type CharacterBaseProperty = {
    Constitution: number;
    Dexterity: number;
    Intelligence: number;
    Intuition: number;
    Luck: number;
    Willpower: number;
}

// export class MaxCurrentValue

export const createEmptyStatus = (): CharacterStatus => ({
    Health: 100,
    HealthCurrent: 100,
    Sanity: 100,
    SanityCurrent: 100,
    Stamina: 100,
    StaminaCurrent: 100,
    Moral: 0,
    Money: 0,
    Age: 0,

    Constitution: 1,
    Dexterity: 1,
    Intelligence: 1,
    Intuition: 1,
    Luck: 1,
    Willpower: 1,

    Speed: 1,
})
