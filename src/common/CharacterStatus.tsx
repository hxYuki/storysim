export type CharacterStatus = {
    Health: number;
    HealthCurrent: number;
    Sanity: number;
    SanityCurrent: number;
    Stamina: number;
    StaminaCurrent: number;

    Moral: number;
    Money: number;
    Age: number;

    Constitution: number;
    Dexterity: number;
    Intelligence: number;
    Intuition: number;
    Luck: number;
    Willpower: number;

    Speed: number;
};

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
