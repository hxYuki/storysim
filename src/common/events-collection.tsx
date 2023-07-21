import { EventChain, EventItem, EventThread, SingleEvent } from "./events";

import chance from 'chance';

// 硬要说的话是玩梗事件，而不是主线事件，但是玩得大了也就成了主线了吧
// export const mahoushoujoEvents: EventItem[] = [
//     {
//         type: 'single',
//         text: '今天你在外面多逗留了一会，回家时稍稍有些晚了。\n夜色笼罩的街上，你看到前方有一团白色——它对你说话了。\n“请和我签订契约，成为魔法少女吧。这个世界需要你。”',
//         conditions: [],
//         options: [
//             {
//                 shortText: '什么东西',
//                 doNotEndEvent: true,
//                 responseText: '“我是魔法少女们的伙伴，为了对抗破坏这个世界的怪物‘失心魔’，寻找有资质的人，赋予他们力量。现在需要你的才能。”'
//             },
//             {
//                 shortText: '接受',
//                 text: '“好。”\n话音刚落，光芒从你的胸口中发出，又转瞬熄灭，那个白色的生物甩甩尾巴，消失了。',
//                 responseText: '你感受到了一股不同寻常的感受在体内扩散，或许这就是魔力吧。身体似乎更加轻盈有力。',
//                 behavior: 'mahoushoujo'
//             },
//             {
//                 shortText: '拒绝',
//                 text: '你无视了它，继续走着自己的路。',
//             }
//         ]
//     },
// ];
const mahoushoujoEvents: EventItem[] = [
    {
        type: 'single',
        thread: 'mahoushoujo',
        id: 'mahoushoujo-begin',
        text: '今天你在外面多逗留了一会，回家时稍稍有些晚了。\n夜色笼罩的街上，你看到前方有一团白色——它对你说话了。\n“请和我签订契约，成为魔法少女吧。这个世界需要你。”',
        repeatable: true,
        conditions: [(ctx) => {
            if (ctx.tokenExists('mahoushoujo-begin-rejected') > 5)
                return false;
            return true
        }],
        possibility: (ctx) => {
            if (ctx.playerDetails.Willpower < 5) return 1.2;
            else return 1;
        },
        options: [
            {
                shortText: '什么东西',
                doNotEndEvent: true,
                responseText: '“我是魔法少女们的伙伴，为了对抗破坏这个世界的怪物‘失心魔’，寻找有资质的人，赋予他们力量。现在需要你的才能。”',

                behavior(ctx) {
                    // 以下两种方式均可
                    (ctx.thisEvent as SingleEvent)!.options![0].responseText = '“你有着想要实现的东西吧，你有那个能力做到。”'
                    // this.responseText = '“你有着想要实现的东西吧，你有那个能力做到。”'

                    return false;
                }
            },
            {
                shortText: '接受',
                text: '“好。”\n话音刚落，光芒从你的胸口中发出，又转瞬熄灭，那个白色的生物甩甩尾巴，消失了。',
                responseText: '你感受到了一股不同寻常的感受在体内扩散，这就是魔力吗。身体似乎变得轻盈有力了。',
                behavior: 'mahoushoujo'
            },
            {
                shortText: '拒绝',
                text: '你无视了它，继续走着自己的路。',
                behavior(ctx) {
                    ctx.tokenSet('mahoushoujo-begin-rejected')
                    return true;
                },
            }
        ]
    },
]
// 主线剧情事件
export const PrimaryEvents: EventItem[][] = [mahoushoujoEvents];

// 普通事件，不那么细致的事件？ 或许除了不会重复发生以外跟日常事件没什么区别
export const NormalEvents: EventItem[] = [];

// 日常事件
export const DailyEvents: EventItem[] = [];

// 彩蛋性质事件，玩玩梗啦
export const NetaEvents: EventItem[] = [];


// TODO: 使用 seeded random 生成事件列表，包含数个主线事件，多个普通事件，大量日常事件，少量彩蛋事件
export const createEventCandidates = (eventCount = 20, rng: Chance.Chance): EventItem[] => {
    // let candidates: EventItem[] = [];
    // let rng = chance(seed);
    let pe = rng.pickset(PrimaryEvents, 3);

    // 将整条剧情事件加入列表。。决定事件时记录当前完成的事件的索引，由此开始
    return pe.reduce((acc, cur) => {
        return acc.concat(cur);
    }, []);
}


// export const getDependencies = (event: EventItem): EventItem[] => {
//     let dependencies: EventItem[] = [];
//     let conditions: string[] = [];
//     if (event as SingleEvent) {
//         conditions = (event as SingleEvent).conditions ?? [];
//     } else {
//         (event as EventChain).events.forEach(e => {
//             e.conditions?.forEach(c => {
//                 conditions.push(c);
//             });
//         });
//     }
// }
