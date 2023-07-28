import { makePlayerPropertyCondition, makeTokenCondition } from "./Conditions";
import { EventChain, EventItem, EventThread, SingleEvent } from "./events";

import chance from 'chance';

// 硬要说的话是玩梗事件，而不是主线事件，但是玩得大了也就成了主线了吧
const mahoushoujoEvents: EventItem[] = [
    {
        type: 'single',
        thread: 'mahoushoujo',
        id: 'mahoushoujo-begin',
        text: '今天你在外面多逗留了一会，回家时稍稍有些晚了。\n夜色笼罩的街上，你看到前方有一团白色——它对你说话了。\n“请和我签订契约，成为魔法少女吧。这个世界需要你。”',
        additonal: [
            {
                'text': '“希望你能够再考虑一下，这个世界正处在危难之中，由人类的负面情绪纠缠形成的怪物可能就在暗中摧残这个城市。”',
                'conditions': [
                    makeTokenCondition('ContextEqualsTo', { token: 'mahoushoujo-begin-rejected', count: 1 }),
                ]
            }
        ],
        repeatable: true,
        conditions: [
            // 以下两种写法等价
            // (ctx) => {
            //     if (ctx.tokenExists({ token: 'mahoushoujo-begin-rejected', count: 5 }))
            //         return false;
            //     return true
            // },
            makeTokenCondition('ContextLessThan', { token: 'mahoushoujo-begin-rejected', count: 5 })
        ],
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
                behavior(ctx) {
                    ctx.tokenRemove('trival-person');
                    ctx.tokenSet('mahoushoujo');
                    ctx.thisEvent!.repeatable = false;
                    const status = ctx.playerDetails;
                    ctx.playerStatsSet({ Health: status.Health + 10, HealthCurrent: status.HealthCurrent + 10, 'Constitution': status.Constitution + 5, 'Dexterity': status.Dexterity + 3, 'Intuition': status.Intuition + 5 });
                    return true;
                },
            },
            {
                shortText: '拒绝',
                text: '你无视了它，继续走着自己的路。',
                behavior(ctx) {
                    ctx.tokenSet('mahoushoujo-begin-rejected', true)
                    return true;
                },
            }
        ]
    },
    {
        type: 'single',
        thread: 'mahoushoujo',
        id: 'mahoushoujo-daily-issue',
        text: '你感受到一股扭曲扩散而来的涟漪，附近有魔物作乱！',
        repeatable: true,
        conditions: [
            makeTokenCondition('ContextEqualsTo', 'mahoushoujo'),
        ],
        options: [
            {
                'shortText': '前去剿灭',
                behavior(ctx) {
                    // TODO: 此处应当进入战斗
                    return true;
                },
            },
            {
                'shortText': '我这样的人真的能做到什么吗',
                behavior(ctx) {

                    return true;
                },
            }
        ],
    },
    {
        type: 'single',
        thread: 'mahoushoujo',
        id: 'mahoushoujo-destiny',
        triggered: true,
        text: '体力在一点点流逝，但你并没有注意到；眼前渐渐模糊，扭曲的影子在周身起舞，耳畔充斥着难辨的呓语，胸口变得冰冷，思维已经破碎，啊，你听清了它们在说什么：…破坏…杀戮…痛苦…一切…所有人…绝望…',
        conditions: [
            makeTokenCondition('ContextEqualsTo', 'mahoushoujo'),

            makePlayerPropertyCondition('ContextLessThan', { SanityCurrent: 3 }),
        ],
        options: [
            {
                shortText: '抱住面前破碎的世界',
                responseText: '你感受到最后的情绪从体内弥漫开来，夷平了周遭的一切，但是已经无所谓了；或许会有谁来将你消灭吧，但是已经无所谓了',
                behavior(ctx) {
                    ctx.endGame();
                    return true;
                },
            }
        ],

    }
]
// 主线剧情事件
export const PrimaryEvents: EventItem[][] = [mahoushoujoEvents];

// 普通事件，不那么细致的事件？ 或许除了不会重复发生以外跟日常事件没什么区别
export const NormalEvents: EventItem[] = [];

// 日常事件
export const DailyEvents: EventItem[] = [
    {
        type: 'chain',
        id: '',
        index: 0,
        repeatable: true,
        events: [
            {
                type: 'single',
                id: '',
                text: '你走在大街上，听到人群吵嚷着什么',
                options: [
                    {
                        shortText: '凑过去看看',
                    }
                ]
            }, {
                type: 'single',
                id: '',
                text: '你费了好大力气挤进去，只见到一片狼藉，听说有邪教徒想要在这里向邪神献祭，一名路过的高手当机立断，见义勇为，邪教徒一死一重伤，剩下的杂鱼见状不妙直接溜了。',
                options: [
                    {
                        shortText: '可恨的邪教徒！',
                    },
                    {
                        shortText: '多亏了好心人呐。',
                    }
                ]
            }
        ],
    },
    {
        type: 'single',
        id: '',
        text: '据传，近日有市民在当地水库放生矿泉水，有群众称，当事人口中念念有辞：……水中……四万八…… 相关部门某水质专家表示：将持续关注当地水质变化，不建议市民效仿此类行为。',
    },
    {
        type: 'single',
        id: '',
        text: '“针对近日以来股市低迷的现状，专家建议，保持积极预期，近来市场波动只是技术性调整，长期来看仍处于上升周期，可以考虑适当加仓。节目的最后提醒您：投资需谨慎，理性投资，切勿盲目跟风。”',
    },
    {
        type: 'single',
        id: '',
        text: '某地夜，晴空中突然出现白光，一时如昼，专家表示：基本可以排除是光之国入侵地球的可能。'
    },
    {
        type: 'single',
        id: '',
        text: '',
    }
];

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
    }, [...DailyEvents]);
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
