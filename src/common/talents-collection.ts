import { Talent } from "./talent";


export const TalentsCollection: Talent[] = [
    {
        id: 1,
        name: "天缺天予",
        cost: -1,
        description: "减少可分配属性，但可额外选择天赋",
        onApply(ctx) {
            ctx.setPropertyUpgradePointsModification(-2);
        },
    },
    {
        id: 2,
        name: "身强体健",
        cost: 1,
        description: "增加体质",
        onApply(ctx) {
            ctx.setPropertyModification({ Constitution: 3 });
        }
    },
    {
        id: 3,
        name: "才气过人",
        cost: 1,
        description: "增加智力",
        onApply(ctx) {
            ctx.setPropertyModification({ Intelligence: 3 });
        }
    },
    {
        id: 4,
        name: "快速反射",
        cost: 1,
        description: "你的反应速度快于常人，提升灵巧",
        onApply(ctx) {
            ctx.setPropertyModification({ Dexterity: 3 });
        }
    },
    {
        id: 5,
        name: "通灵",
        cost: 1,
        description: "你与非物质世界有着不寻常的联系，灵感大幅提升。",
        onApply(ctx) {
            ctx.setPropertyModification({ Intuition: 3 });
        }
    },
    {
        id: 6,
        name: "学姐的缎带",
        cost: 1,
        description: "一个温柔强大的学姐送给你的礼物，只是她后来不知为何失踪了。",
        onApply(ctx) {
            // TODO: 必定会遭遇 魔法少女 事件
            ctx.tokensToAdd(["attracts-incubator"]);
        }
    },
];

export function createTalentCandidates(count: number, rng: Chance.Chance) {
    return rng.pickset(TalentsCollection, count);
}