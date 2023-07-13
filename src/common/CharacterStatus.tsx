export type CharacterStatus = {
    Health: number;
    Sanity: number;
    Stamina: number;
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

export const createEmptyStatus = (): CharacterStatus => ({
    Health: 100,
    Sanity: 100,
    Stamina: 100,
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
