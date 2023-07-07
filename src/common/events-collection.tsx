
export const mahoushoujoEvents: EventItem[] = [
    {
        text: '今天你在外面多逗留了一会，回家时稍稍有些晚了。\n夜色笼罩的街上，你看到前方有一团白色——它对你说话了。\n“请和我签订契约，成为魔法少女吧。这个世界需要你。”',
        conditions: [],
        options: [
            {
                shortText: '什么东西',
                doNotEndEvent: true,
                responseText: '“我时魔法少女们的伙伴，为了对抗破坏这个世界的怪物‘无心魔’，寻找有资质的人，赋予他们力量。现在需要你的才能。”'
            },
            {
                shortText: '接受',
                text: '“好。”\n话音刚落，光芒从你的胸口中发出，又转瞬熄灭，你看到那个白色的生物甩甩尾巴，消失了。',
                responseText: '你感受到了一股不同寻常的感受在体内扩散，或许这就是魔力吧。身体似乎更加轻盈有力。',
                behavior: 'mahoushoujo'
            },
            {
                shortText: '拒绝',
                text: '你无视了它，继续走着自己的路。',
            }
        ]
    },
];

