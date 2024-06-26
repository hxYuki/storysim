import gameStyles from './Game.module.css'
// import '../index.css'
import { Component, For, Match, Show, Switch, createEffect, createSignal, onMount } from 'solid-js'
import { createStore } from "solid-js/store";
import type { StoreNode, Store, SetStoreFunction } from "solid-js/store";

import { createEventCandidates } from '../common/events-collection'
import { CharacterBaseProperty, CharacterStatus, createEmptyStatus } from '../common/CharacterStatus'
import { BeforeGameContext, StartedGameContext, WithCharacterContext } from '../common/game-context'
import { EventItem, EventChain, OptionItem, SingleEvent, weightedPickEvent, ConditionToken, StackableToken, filterReadyEvents, conditionsCheck } from '../common/events'

import chance from 'chance'
import { Talent } from '../common/talent';
import { createTalentCandidates } from '../common/talents-collection';
import { Relic } from '../common/relic';
import { Buff } from '../common/Buff';
import { Character } from '../common/Character';
import { BattlePage } from './subpages/Battle';
import { ConditionReturn, DemoScene, Scene, SCENE_LIST } from '../common/Scene';
import { Result } from 'postcss';

// 经过 1 年所消耗的时间
const AgeTimeUnit = 10;

const GamePage: Component = () => {

    const chanceInstance = chance('TODO: initialize seed later');
    const defaultStatus = createEmptyStatus();

    const player = new Character();
    // 基础（最大）属性值 与 当前属性值
    const [currentStatus, setCurrentStatus] = player.propertyGS;
    // 持久化效果
    const [buffsToAdd, setBuffsToAdd] = createSignal<Buff[]>([]);
    const [buffs, setBuffs] = player.buffsGS;

    // 成员函数也不能保证自己的 context (this), 所以需要绑定
    const updatePlayerStatus = player.statsSet.bind(player);
    const updatePlayerStatusBy = player.statsModifyBy.bind(player);

    const [timeAccumulated, setTimeAccumulated] = createSignal<number>(0);

    const [HistoryBar, insertHistory] = useEventHistoryBar();

    // 候选事件列表
    const [availableEvents, setAvailableEvents] = createSignal<EventItem[]>([]);

    // 当前正在进行的事件
    const [currentEventItem, setCurrentEventItem] = createSignal<EventItem>();
    const [currentSingleEvent, setCurrentSingleEvent] = createSignal<SingleEvent>();

    // 当前已经满足的事件条件标记
    const [reachedTokens, setReachedTokens] = createSignal<ConditionToken[]>([]);
    function findToken<T extends ConditionToken, R extends (T extends StackableToken ? StackableToken : ConditionToken)>(token: T): R | undefined {
        if (typeof token === 'string') {
            return reachedTokens().find(t => t === token || (typeof t === 'object' && t.token === token)) as R;
        } else {
            return reachedTokens().find(t => typeof t === 'object' && t.token === token.token) as R;
        }
    }

    // 游戏开始前阶段
    type GameState = 'talent-choose' | 'property-upgrade' | 'game-start' | 'game-end' | 'battle';
    const [gameState, setGameState] = createSignal<GameState>('talent-choose');

    const [battleScene, setBattleScene] = createSignal<Scene>();

    // 玩家自由分配属性点数
    const [propertyPoints, setPropertyPoints] = createSignal<number>(5);
    // 生成用于各种操作闭包的上下文参数
    const makeBeforeGameContext = (): BeforeGameContext => {
        const currentState = gameState();
        if (currentState === 'talent-choose' || currentState === 'property-upgrade') {
            return {
                gameState: currentState,

                setPropertyUpgradePointsModification(modification) {
                    setPropertyPoints(p => p + modification);
                },
                setPropertyModification: updatePlayerStatusBy,
                tokensToAdd(tokens) {
                    tokens.forEach(nt => {
                        insertToken(nt);
                    })

                },
                pushGameState() {
                    if (currentState === 'talent-choose') {
                        setGameState('property-upgrade');
                    } else if (currentState === 'property-upgrade') {
                        setGameState('game-start');
                    }
                    else
                        throw new Error('invalid game state used');
                },
            }
        }

        throw new Error('game context not available');
    }
    const makeGameContext = (eventThis?: EventItem): StartedGameContext => ({
        gameState: 'game-start',
        chanceInstance: chanceInstance,
        createDiceContext(character) {

            // const characterBuff = character.diceModifiers.filter(m => m.type ==='value')
            // throw new Error('Method not implemented.');

            return {
                chanceInstance,
                valueModifier: character.diceModifiers.filter(m => m.type === 'value'),
                limitModifier: character.diceModifiers.filter(m => m.type === 'limit'),
            }
        },
        player: player,
        currentScene: battleScene(),
        // currentCharacter: undefined,
        withCharacter(character) {
            character = character ?? player;

            const withChar: WithCharacterContext = { ...this, currentCharacter: character, createDiceContext: (char?: Character) => char ? this.createDiceContext(char) : this.createDiceContext(character!) };
            if (this.currentScene) {
                withChar.currentScene = { ...this.currentScene }
                // 为场景中的角色应用 队友/敌人
                if (this.currentScene.enemies.includes(character)) {
                    const enemy = [this.player, ...this.currentScene.allies]
                    const ally = this.currentScene.enemies.filter(e => e !== character);
                    withChar.currentScene = { ...this.currentScene, enemies: enemy, allies: ally };
                }
                if (this.currentScene.allies.includes(character)) {
                    const ally = [this.player, ...this.currentScene.allies.filter(e => e !== character)]
                    const enemy = this.currentScene.enemies;
                    withChar.currentScene = { ...this.currentScene, allies: ally, enemies: enemy };
                }
            }
            return withChar;
        },

        reachedTokens: reachedTokens(),
        currentEvent: currentSingleEvent()!,

        thisEvent: eventThis,
        time() {
            return timeAccumulated();
        },

        startBattle: (sceneId: number) => {
            const scene = SCENE_LIST.find(s => s.id === sceneId);
            if (!scene) throw new Error('invalid scene id');

            setBattleScene(scene);
            setGameState('battle');
        },
        startBattkeWith: (scene: Scene) => {
            setBattleScene(scene);
            setGameState('battle');
        },
        endBattle: (result: ConditionReturn) => {
            // TODO: 处理战斗结果，或许应该传递给调用开始战斗的事件
            setBattleScene(undefined);
            setGameState('game-start');

        },

        tokenSet(token, stackable = false) {
            const t = findToken(token) as StackableToken;
            if (t) {
                this.tokenRemove(token);
                // if (typeof t === 'string') {
                //     insertToken({ token, count: 2 });
                // } else {
                insertToken({ token: t.token, count: t.count + 1 });
                // }
            } else
                // if (stackable) {
                insertToken({ token, count: 1 });
            // } else
            // insertToken(token);
        },
        tokenGet(token) {
            const t = findToken(token);
            return typeof t === 'string' ? 1 : (t?.count ?? 0)
        },
        tokenExists(token) {
            const item = findToken(token);
            if (!item) return false;

            if (typeof token === 'string') {
                return true;
            } else {
                if ((item as StackableToken).count >= token.count) {
                    return true;
                } else {
                    return false;
                }

            }
        },
        tokenRemove: (token: ConditionToken, removeAll = false) => {
            if (removeAll) {
                removeToken(token);
            } else {
                const item = findToken(token);
                if (!item) return;

                removeToken(item);
                if (typeof item === 'object' && item.count > 1) {
                    insertToken({ token: item.token, count: item.count - 1 });
                }
            }
        },

        achievementReached: (achievement: string) => {
            console.error('TODO: achievementReached', 'not implemented');
        },
        breakChainEvent: () => {
            console.error('TODO: breakChainEvent', 'not implemented');
        },

        endGame() {
            console.error('TODO: endGame', 'not implemented');
        },
    })

    const insertToken = (token: ConditionToken) => {
        const ot = findToken(token);
        setReachedTokens(t => [...t.filter(x => x !== ot), token]);
    }
    const removeToken = (token: ConditionToken) => {
        const ot = findToken(token);
        setReachedTokens(t => t.filter(t => t !== ot));
    }



    const nextEvent = () => {
        let nextEvent: SingleEvent;
        const currentEvent = currentEventItem();

        const currentSingle = currentSingleEvent();
        if (currentSingle) {
            // 事件结束 累计时间，结算 buff 效果
            // const timeAcc = timeAccumulated();
            setTimeAccumulated(t => t + (currentSingle.timeCost ?? 1));
            player.statsSet({ 'Age': Math.floor(timeAccumulated() / AgeTimeUnit) })

            const ctx = makeGameContext().withCharacter()

            const ended = buffs().filter(b => b.stage === '').map(b => ({
                buff: b,
                isOver: b.tick(ctx)
            })).filter(b => b.isOver).map(b => b.buff);

            ended.forEach(b => {
                b.onRemove?.(ctx);
            })
            setBuffs(b => b.filter(b => !ended.includes(b)));
        }

        if (currentEvent && currentEvent.id !== '') {
            insertToken(currentEvent.id);
        }
        // 事件链
        if (currentEvent && currentEvent.type === 'chain' && currentEvent.events.length > currentEvent.index) {

            nextEvent = currentEvent.events[currentEvent.index++];
            // setCurrentEventChainIndex(i => i + 1);
            // currentEvent.index++;
        }
        // 获取下一个事件
        else {
            let candidates = filterReadyEvents(availableEvents(), makeGameContext());
            console.log('candidates', candidates)
            const picked = weightedPickEvent(candidates, makeGameContext(), chanceInstance);

            setCurrentEventItem(picked);

            if (picked.type === 'single') {
                nextEvent = picked;
            } else {
                picked.index = 0;
                nextEvent = picked.events[picked.index++];
            }
        }
        insertHistory(nextEvent.text, false);
        nextEvent.additonal?.forEach(a => {
            if (conditionsCheck(a.conditions, makeGameContext()))
                insertHistory(a.text, false)
        });

        setCurrentSingleEvent(nextEvent);
    }
    // TODO: 移动到 ActionBar组件内，组件现在接受一个Context可以进行操作
    const handleOption = (option?: OptionItem) => {
        if (!option) {
            nextEvent();
            return;
        }

        if (option.text && option.text.length > 0) {
            insertHistory(option.text, true);
        }
        if (option.responseText && option.responseText.length > 0) {
            insertHistory(option.responseText, false);
        }

        let behaviorResult = true;
        if (option.behavior) {
            if (typeof option.behavior === 'string') {
                insertToken(option.behavior);
            }
            else if (typeof option.behavior === 'function') {
                behaviorResult = option.behavior(makeGameContext(currentEventItem()!));
            }
            else if ('count' in option.behavior) {
                insertToken(option.behavior)
            } else {
                option.behavior.forEach(b => {
                    insertToken(b);
                })
            }
        }

        if (option.doNotEndEvent || !behaviorResult) {
            return;
        } else {
            nextEvent();
        }
    }

    const finishTalentChoose = (talents: Talent[]) => {
        const ctx = makeBeforeGameContext();
        talents.forEach(t => {
            t.onApply(ctx)
        })
        ctx.pushGameState();
    }
    const finishPropertyUpgrade = (property: CharacterBaseProperty) => {
        setCurrentStatus(s => ({ ...s, ...property }));
        const ctx = makeBeforeGameContext();
        ctx.pushGameState();
    }

    onMount(() => {
        // TODO: 为每局游戏生成一个 seed， 作为全局的随机数发生器
        chanceInstance.seed = "Genenrate a seed";
        const talents = createTalentCandidates(8, chanceInstance);
        setTalentCadidates(talents);
        const events = createEventCandidates(20, chanceInstance);
        setAvailableEvents(events);

        // FIXME: 测试场景，完成后移除
        // makeGameContext().startBattle(DemoScene.id);
    })

    const [talentCadidates, setTalentCadidates] = createSignal<Talent[]>([]);

    return <>
        <Switch>
            <Match when={gameState() === 'talent-choose'}>
                <TelentChoosePage talents={talentCadidates()} talentPoints={3} finish={finishTalentChoose} />
            </Match>
            <Match when={gameState() === 'property-upgrade'}>
                <PropertyUpgradePage availablePoints={propertyPoints()} baseProperty={currentStatus()} finish={finishPropertyUpgrade} />
            </Match>
            <Match when={gameState() === 'game-start'}>
                <StatusBar playerCurrentStatus={currentStatus()} />
                <HistoryBar />
                <ActionBar options={currentSingleEvent()?.options} handler={handleOption} gameContext={makeGameContext()} />
            </Match>
            <Match when={gameState() === 'battle'}>
                <BattlePage scene={battleScene()} makeContext={makeGameContext.bind(this)} />
            </Match>
        </Switch>
    </>
}
export default GamePage;

interface PropertyUpgradePageProps {
    availablePoints: number;
    baseProperty: CharacterBaseProperty;
    finish: (property: CharacterBaseProperty) => void;
}
const PropertyUpgradePage: Component<PropertyUpgradePageProps> = (props) => {
    const [baseProperty, setBaseProperty] = createSignal<CharacterBaseProperty>(props.baseProperty);
    const [availablePoints, setAvailablePoints] = createSignal<number>(props.availablePoints);

    const makePropertySetter = (property: keyof CharacterBaseProperty) => {
        return (value: number) => {
            if (value < props.baseProperty[property] || value > 30) {
                if (value > 30)
                    setError('难道你想成为神吗？')
                else
                    setError('属性值不能低于初始值')
                return;
            }

            if (value > baseProperty()[property]) {
                if (availablePoints() <= 0) {
                    setError('可用点数不足')
                    return;
                }
                setAvailablePoints(p => p - 1);
            } else {
                setAvailablePoints(p => p + 1);
            }
            setError(undefined);
            setBaseProperty(p => ({ ...p, [property]: value }))
        }
    }

    const [error, setError] = createSignal<string | undefined>(undefined);

    createEffect(() => {
        setBaseProperty(props.baseProperty);
    })
    createEffect(() => {
        setAvailablePoints(props.availablePoints);
    })

    return <>
        <div class='flex flex-col items-center justify-center'>
            <div class='text-3xl p-5'>属性提升 - 可用点数 {availablePoints()}</div>
            <Show when={error()}>
                <p class={`mb-5 w-96 text-red-400 ${gameStyles['float-item']}`}>{error()}</p>
            </Show>
            <div class='flex flex-col items-center justify-center space-y-2'>
                <UpgradePropertyItem name='体质' value={baseProperty().Constitution} setter={makePropertySetter('Constitution')} />
                <UpgradePropertyItem name='灵巧' value={baseProperty().Dexterity} setter={makePropertySetter('Dexterity')} />
                <UpgradePropertyItem name='智力' value={baseProperty().Intelligence} setter={makePropertySetter('Intelligence')} />
                <UpgradePropertyItem name='幸运' value={baseProperty().Luck} setter={makePropertySetter('Luck')} />
                <UpgradePropertyItem name='直觉' value={baseProperty().Intuition} setter={makePropertySetter('Intuition')} />
                <UpgradePropertyItem name='意志' value={baseProperty().Willpower} setter={makePropertySetter('Willpower')} />
            </div>
            <button class='p-2 mt-5 rounded bg-blue-500 text-white' onclick={() => { props.finish(baseProperty()) }}>确认选择</button>
        </div>
    </>
}

interface UpgradePropertyItemProps {
    name: string;
    value: number;
    setter: (v: number) => void;
}
const UpgradePropertyItem: Component<UpgradePropertyItemProps> = (props) =>
(
    <div class='flex flex-row space-x-2'>
        <div class='text-xl'>{props.name}:&nbsp;</div>
        <button class='text-xl border rounded w-7 h-7' onclick={() => { props.setter(props.value - 1) }}>
            <div class={`${gameStyles.shortline} w-full h-full`} ></div>
        </button>
        <div class='text-xl'>{props.value}</div>
        <button class='text-xl border rounded w-7 h-7' onclick={() => { props.setter(props.value + 1) }}>
            <div class={`${gameStyles.crossline} w-full h-full`} ></div>
        </button>
    </div>
)

interface TalentChoosePageProps {
    talents: Talent[];
    talentPoints: number;
    // chosen: Talent[];
    finish: (talents: Talent[]) => void;
}
const TelentChoosePage: Component<TalentChoosePageProps> = (props) => {
    const [chosen, setChosen] = createSignal<[Talent, boolean][]>(props.talents.map(t => [t, false]));

    const [currentTalentPoints, setCurrentTalentPoints] = createSignal(props.talentPoints);

    const [currentChosen, setCurrentChosen] = createSignal<Talent[]>([]);

    createEffect(() => {
        setChosen(() => props.talents.map(t => [t, false]))
    });
    createEffect(() => {
        setCurrentChosen(() => chosen().filter(t => t[1]).map(t => t[0]));
    })

    const [lastChoose, setLastChoose] = createSignal<Talent>();
    const [error, setError] = createSignal<string | undefined>(undefined);

    function handleChoose(p: { talent: Talent, index: number }) {
        const newChosen: [Talent, boolean][] = chosen().map((t, i) => {
            if (i === p.index) {
                return [t[0], !t[1]];
            }
            return t;
        });
        const thisChosen = newChosen[p.index];

        setLastChoose(thisChosen[0]);

        const prevCost = chosen().filter(t => t[1]).map(t => t[0].cost).reduce((a, b) => a + b, 0);
        const thisChosenCost = thisChosen[1] ? thisChosen[0].cost : -thisChosen[0].cost;

        if (prevCost + thisChosenCost <= props.talentPoints) {
            setChosen(newChosen);
            setCurrentTalentPoints(props.talentPoints - prevCost - thisChosenCost);

            setError(undefined);
        }
        else {
            if (!thisChosen[1]) {
                setError('取消选择后点数不足');
            } else {
                setError('剩余天赋点数不足');
            }

        }
    }

    return <>
        <div class='flex flex-col items-center justify-center'>
            <h1 class='text-3xl m-5'>选择天赋 - 可用点数: {currentTalentPoints()}</h1>
            <Show when={error()}>
                <p class={`mb-5 w-96 text-red-400 ${gameStyles['float-item']}`}>{error()}</p>
            </Show>
            <div class='flex flex-row flex-wrap space-x-5'>
                <For each={chosen()}>
                    {(talent, index) => <TalentItem talent={talent[0]} chosen={talent[1]} index={index()} onChosen={handleChoose} />}
                </For>
            </div>

            <Show when={lastChoose()}>
                <div class='mt-5'>
                    <p class='border rounded p-3 w-96 text-gray-400 border-gray-500'>{lastChoose()?.description}</p>
                </div>
            </Show>
            <button class='p-2 mt-5 rounded bg-blue-500 text-white' onclick={() => {
                props.finish(currentChosen());
            }}>确认选择</button>
        </div >
    </>
}

interface TalentItemProps {
    talent: Talent;
    chosen: boolean;
    index: number;
    onChosen: (p: { talent: Talent, index: number }) => void;
}
const TalentItem: Component<TalentItemProps> = (props) => {

    return <button class={`flex flex-col items-center rounded border p-2 pt-1`} onClick={[props.onChosen, { talen: props.talent, index: props.index }]}>
        <span class={`text-lg ${props.chosen ? gameStyles.underline : ''}`}>{props.talent.name}</span>
    </button>
}


export type TemplatePositionText = 'SourceName' | 'TargetName' | 'ActionName' | 'ActionResult';

type ParseTemplate<T extends string, R extends {}> =
    T extends `${infer Before}{${infer Actual}}${infer After}` ?
    ParseTemplate<`${After}`, R & (IsTemplateString<Actual> extends true ? { [K in Actual]: Actual } : never)> : R;

type IsTemplateString<Str extends string> = Str extends TemplatePositionText ? true : false;

export type TextBuilder = {
    isBuilding: () => boolean;
    addText: (position: TemplatePositionText, text: string) => TextBuilder;
    text: (position: TemplatePositionText) => string | undefined;
    setTemplate: <S extends ParseTemplate<S, {}> extends never ? never : string>(textTemplate: S) => TextBuilder;
    commitBuild: (isChoice: boolean) => TextBuilder;
};

// type MatchTemplateString<T extends string, R extends string[]> = T extends `${infer Before}{${infer Actual}}${infer After}` ? MatchTemplateString<`${After}`, [...R, Actual]> : R;

export function useEventHistoryBar():
    [
        Component,
        (text: string, isChoice: boolean) => void,
        TextBuilder
    ] {
    const [history, setHistory] = createSignal<EventHistoryItem[]>([]);

    let eventHistoryContainer: HTMLUListElement | undefined;
    const insertHistory = (text: string, isChoice: boolean) => {
        setHistory(h => [...h, { text, isChoice }]);

        if (eventHistoryContainer) {
            eventHistoryContainer.scrollTop = eventHistoryContainer.scrollHeight;
        }
    }

    let textParams: Partial<{ [K in TemplatePositionText]: string }> = {};
    let textTemplate = '';
    let isCurrentBuilding = false;

    const builder: TextBuilder = {
        isBuilding: () => isCurrentBuilding,
        addText: (position: TemplatePositionText, text: string) => {
            isCurrentBuilding = true;
            textParams[position] = text;
            return builder;
        },
        text: (position: TemplatePositionText) => {
            return textParams[position] ?? undefined
        },
        setTemplate: <S extends ParseTemplate<S, {}> extends never ? never : string>(t: S) => {
            isCurrentBuilding = true;
            textTemplate = t;
            return builder;
        },
        commitBuild: (isChoice: boolean) => {
            if (!isCurrentBuilding) {
                console.error('尚未开始构建文本');
                throw "尚未开始构建文本";
            }
            const text = textTemplate.replace(/{(\w+)}/g, (match, p1) => {
                let result = textParams[p1 as TemplatePositionText];
                if (!result) {
                    console.error('commitBuild', textParams, textTemplate);
                    throw "无法匹配到模板，缺少必要参数";
                }
                return result;
            })
            textParams = {};
            textTemplate = '';
            isCurrentBuilding = false;
            if (text !== '')
                insertHistory(text, isChoice);
            
            return builder;
        }
    };


    // setTemplate('asd {SourceName}, {TargetName}, {ActionName},{ActionName} asd{1123')
    return [
        () => <EventsHistoryBar ref={eventHistoryContainer} history={history()} />,
        insertHistory,
        builder
    ]


}

interface EventHistoryItem {
    text: string;
    isChoice: boolean;
}
interface EventsHistoryBarProps {
    history: EventHistoryItem[];
    ref?: HTMLUListElement;
}
const EventsHistoryBar: Component<EventsHistoryBarProps> = (p) => {
    return <ul ref={p.ref} class='flex flex-col w-2/3 border rounded-lg p-5 space-y-2 overflow-y-auto ml-auto mr-auto'>
        <For each={p.history}>{(event) => <EventHistoryItem text={event.text} rightAligned={event.isChoice} />}</For>
    </ul>
}

interface ActionBarProps {
    options?: OptionItem[];
    handler: (option?: OptionItem) => void;
    gameContext: StartedGameContext
}
const ActionBar: Component<ActionBarProps> = (props) => {

    return <div class='flex flex-row justify-around w-2/3 border rounded-lg p-5 flex-shrink-0'>
        <Show when={props.options && props.options.length > 0} fallback={
            <button onClick={[props.handler, null]} class='rounded-lg p-2 border'>继续</button>
        }>

            <For each={props.options}>{(option) =>
                conditionsCheck(option.conditions, props.gameContext) &&
                (<button onClick={[props.handler, option]} class={` rounded-lg p-2 ${option.doNotEndEvent ? 'border-dotted border-2' : 'border'}`}>{option.shortText}</button>)

            }</For>
        </Show>
    </div>
}

interface EventHistoryItemProps {
    text: string;
    rightAligned?: boolean;
}
const EventHistoryItem: Component<EventHistoryItemProps> = (props) => {
    const [show, setShow] = createSignal(false);
    onMount(() => {
        setShow(true);
    })
    return (
        <li
            class={`list-none border rounded-md text-left w-3/4 p-2 ${props.rightAligned ? 'translate-x-1/3' : 'translate-x-0'} transition-opacity duration-500 ${show() ? 'opacity-100' : 'opacity-0'}`}
        // classList={{ 'translate-x-1/3': props.rightAligned }}
        >{props.text}</li>
    )
}

interface StatusBarProps {
    // playerMaxStatus: CharacterStatus;
    playerCurrentStatus: CharacterStatus;
}
const StatusBar: Component<StatusBarProps> = (props) => {
    return <div class='flex-shrink-0'>
        <ul class={gameStyles.StatusBox}>
            <PercentBar name='健康' maxValue={props.playerCurrentStatus.Health} current={props.playerCurrentStatus.HealthCurrent} />
            <PercentBar name='精神' maxValue={props.playerCurrentStatus.Sanity} current={props.playerCurrentStatus.SanityCurrent} />
            <PercentBar name='耐力' maxValue={props.playerCurrentStatus.Stamina} current={props.playerCurrentStatus.StaminaCurrent} />
            <li class='m-3'>
                <span style={{ color: 'gray' }}>年龄: </span>
                <span>{props.playerCurrentStatus.Age}</span>
            </li>
        </ul>
        <ul class={gameStyles.StatusBox}>
            <Status name="体质" value={props.playerCurrentStatus.Constitution} />
            <Status name="灵巧" value={props.playerCurrentStatus.Dexterity} />
            <Status name="智力" value={props.playerCurrentStatus.Intelligence} />
            <Status name="幸运" value={props.playerCurrentStatus.Luck} />
            <Status name="直觉" value={props.playerCurrentStatus.Intuition} />
            <Status name="意志" value={props.playerCurrentStatus.Willpower} />
            {/* ... */}
        </ul></div>
}

export interface PercentBarProps {
    name: string;
    maxValue: number;
    current: number;
}

export const PercentBar: Component<PercentBarProps> = (props) => {
    const percentage = Math.floor(
        (props.current / props.maxValue) * 100);

    return (
        <div style={{ position: 'relative', display: 'flex', 'align-items': 'center', 'margin': '10px' }}>
            <div style={{ 'margin-right': '10px' }}>
                <span>{props.name}: </span>
            </div>
            <div style={{ flex: 1, width: '100px' }}>
                <div style={{ width: '100%', height: '20px', 'background-color': 'gray', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', 'z-index': 1 }}>
                        {props.current}/{props.maxValue}
                    </span>
                    <div
                        style={{
                            width: `${percentage}%`,
                            height: '100%',
                            'background-color': `green`,
                            position: 'relative',
                            'z-index': 0,
                        }}
                    />
                </div>
            </div>
            {/* <div>
                <span>{percentage}%</span>
            </div> */}
        </div>
    );
};

interface StatusProps {
    name: string;
    value: number;
}

const Status: Component<StatusProps> = (props) => {
    return (
        <li class={gameStyles.StatusItem}>
            <span style={{ color: 'gray' }}>{props.name}: </span>
            <span style={{ color: 'white' }}>{props.value}</span>
        </li>
    );
};
