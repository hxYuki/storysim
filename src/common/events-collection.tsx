import { makePlayerPropertyCondition, makeTokenCondition } from "./Conditions";
import { EventChain, EventItem, SingleEvent } from "./events";

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
        text: '某日在驿站看到一个熟悉的背影，你迫不及待的上前打招呼，请问....你是？ 啊，不好意思认错人了。你灰溜溜得离开这个尴尬之地，此地不宜久留，得换个驿站',
    },
    {
        type: 'single',
        id: '',
        text: '走过路过不要错过啦，你好施主我看我与你有缘，不如让贫道给你测测运势。哎哎哎，小兄弟你别走啊，啊价格都好说，别不信啊，我给你免费测个。邋遢的道士掐指一算，你五行缺水家道贫寒，心眼不大没钱还喜欢装阔气...啊小兄弟别走啊',
    },
    {
        type: 'single',
        id: '',
        text: '夏日的月圆之夜，空中还有飞着一闪一闪的萤火虫，燥热的心倒也平静了不少，【里隍】相传蓝萤火虫可以治疗任何[热病]，若是能遇上一只确实能大大地捞上一笔',
    },
    {
        type: 'single',
        id: '',
        text: '最近总有一些流言说末日要来了，一位老婆婆拉着你的衣角，啊小伙子啊小伙子你是【末日】么，我听说他年纪轻轻还是个青天大老爷么，我们家的地被张员外抢了去了牛也被抢了去了，你能帮帮我么？啊你不是末日啊，快滚快滚，少在这里装模做样',
    },
    {
        type: 'single',
        id: '',
        text: '小老弟你也是来看花魁的吧，识相点的快点走开，一会儿花魁游街了，那可是从【天予都】来的，一年就这么一回，男人们都从四面八方过来一睹其真容，听说听了她的歌声能忘掉世间的一切烦恼...',
    },
    {
        type: 'single',
        id: '',
        text: '小路上的野狗闻着你行李里的肉味了，跟了你一路，也没见你给它点东西吃，终是悻悻离开',
    },
    {
        type: 'single',
        id: '',
        text: '少侠你看，这可是限量版的武功秘籍啊，祖上一脉单传，可惜到了我手上，小女子父母早早去世，上有一个孤苦伶仃的爷爷在那边山上种茶叶，下有一个弟弟不学无术，我看你侠义心肠不如买点爷爷种得茶叶吧，买1斤我带你去旁边茶馆亲自沏茶给你喝，买3斤我带你去旁边驿站亲自沏茶给你喝，买5斤我把这秘籍也一并送你。没钱？啊没钱还不快滚啊下头男',
    },
    {
        type: 'single',
        id: '',
        text: '相传【迷乐林】里有有一种毛色非常非常诱人的动物，小巧而迅速，【黄公子】开高价求这玩意儿，猎人们不是给他弄的金色猫咪就是黑白兔子，他府上据说已经能开个动物园了，全是味儿，气得黄老爷新买了座东城的宅子搬走了。',
    },
    {
        type: 'single',
        id: '',
        text: '某市夜里发生多起爆炸，引起多处建筑物倒塌，目前暂无人员伤亡报道，经确认，爆炸系管道老化煤气泄漏所致。',
    },
    {
        type: 'single',
        id: '',
        text: '近日我地出现一起人群大规模无意识群集事件，大量人员聚集于一所废弃的医院，当事人均称对事情经过没有相关印象，场地周围发现了疑似新开封的洁厕剂、消毒液瓶子，事情的原委正在调查中。本节目温馨提醒您切勿将两种物品混用，以免发生危险。',
        // 
        // additonal: [
        //     {
        //         text: '',
        //         conditions: [
        //             makeTokenCondition('ContextEqualsTo', 'mahoushoujo'),
        //         ]
        //     }
        // ]
    },
    {
        type: 'single',
        id: '',
        text: '一男子在一货用卡车经过时突然发作，欲冲向车前，幸而被在旁热心群众制止，路人称，当事人当时高喊着“泥头车之神”、“保佑”、“许愿”诸如此类的话语，经调查，暂且排除是某种新型宗教的可能。',
    },
    {
        type: 'single',
        id: '',
        text: '“震惊，一逃犯落网，竟是为了去听演唱会。被捕逃犯称，自己是该歌手十年老粉。”',
    },
    {
        type: 'single',
        id: '',
        text: '据专家称，有内部消息表明，房价仍有上涨空间，此轮小幅下降将是最后的购置良机，建议有相关需求的市民抓住此次机会。',
    }, {
        type: 'single',
        id: '',
        text: '你听到了某些奇怪的声音：好饿啊，真的好饿啊，为什么会想吃东西，我昨天不是刚吃了一顿了么怎么今天又饿了呀，得去找点东西吃去。',
    }, {
        type: 'single',
        id: '',
        text: '有个人贩子被当街抓住了，你赶紧凑上前去围观，除了看到被打得半死的人贩子，还有幸听到这该死的勾东西小可爱碧阳的玩意儿出生的东溪...不绝于耳的国粹。',
    }, {
        type: 'single',
        id: '',
        text: '你倚靠在林中一颗老树下，枝繁叶茂，忽然树上掉下来一截树枝，这是为什么呢，需要研究一下么，想了半天没有任何想法，反正是个东西都会掉到低处，把草帽掩了掩眼睛，睡了过去',
    }, {
        type: 'single',
        id: '',
        text: '相传五行相生相克，但也并不全对，如果你的火足够大能烧得东西足够多也不是不能烧他个三天三夜，就一口井的水怎么能扑灭那么大的火呢',
    }, {
        type: 'single',
        id: '',
        text: '你看到一个只穿着一件儿破衣的男子眼里泛着红光与四周充满杀气,手拿着刃都是破的菜刀迎面走来，你并没有搭理还有更重要的事情要去做，这人恩怨就交给别人处理吧',
    }, {
        type: 'single',
        id: '',
        text: '踢踏踢踏雨滴打在瓦片上，远处已被雨水雾气所遮蔽，不停的雷声与不断地闪电惊动了几座城的人，这这难道是有人在斗法么，雷法的最高境界也不过如此吧。',
    },
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
