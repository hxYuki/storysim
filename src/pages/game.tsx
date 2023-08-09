import gameStyles from './Game.module.css'
// import '../index.css'
import { Component, For, Match, Show, Switch, createEffect, createSignal, onMount } from 'solid-js'
import { createStore } from "solid-js/store";
import type { StoreNode, Store, SetStoreFunction } from "solid-js/store";

import { createEventCandidates } from '../common/events-collection'
import { CharacterBaseProperty, CharacterStatus, createEmptyStatus } from '../common/CharacterStatus'
import { BeforeGameContext, StartedGameContext } from '../common/game-context'
import { EventItem, EventChain, OptionItem, SingleEvent, weightedPickEvent, ConditionToken, StackableToken, filterReadyEvents, conditionsCheck } from '../common/events'

import chance from 'chance'
import { Talent } from '../common/talent';
import { createTalentCandidates } from '../common/talents-collection';
import { Relic } from '../common/relic';
import { Buff } from '../common/Buff';

// 经过 1 年所消耗的时间
const AgeTimeUnit = 10;

const GamePage: Component = () => {

    const chanceInstance = chance('TODO: initialize seed later');
    const defaultStatus = createEmptyStatus();

    // 基础（最大）属性值 与 当前属性值
    const [currentStatus, setCurrentStatus] = createSignal<CharacterStatus>(defaultStatus);

    const [timeAccumulated, setTimeAccumulated] = createSignal<number>(0);
    // 物品栏
    const [inventory, setInventory] = createSignal<Relic[]>([]);

    // 持久化效果
    const [buffs, setBuffs] = createSignal<Buff[]>([]);
    const [buffsToAdd, setBuffsToAdd] = createSignal<Buff[]>([]);

    const [history, setHistory] = createSignal<EventHistoryItem[]>([]);

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
    type GameState = 'talent-choose' | 'property-upgrade' | 'game-start' | 'game-end';
    const [gameState, setGameState] = createSignal<GameState>('talent-choose');

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
                setPropertyModification(modification) {
                    Object.keys(modification).forEach(k => {
                        const key = k as keyof CharacterStatus;
                        modification[key] = modification[key]! + currentStatus()[key];
                    })
                    setCurrentStatus(s => ({
                        ...s,
                        ...modification
                    }));
                },
                tokensToAdd(tokens) {
                    tokens.forEach(nt => {
                        insertToken(nt);
                    })

                },
                pushGameState() {
                    if (currentState === 'talent-choose') {
                        setGameState('property-upgrade');
                    }
                    if (currentState === 'property-upgrade') {
                        setGameState('game-start');
                    }
                    throw new Error('invalid game state used');
                },
            }
        }

        throw new Error('game context not available');
    }
    const makeGameContext = (eventThis?: EventItem): StartedGameContext => ({
        gameState: 'game-start',
        playerDetails: currentStatus(),
        reachedTokens: reachedTokens(),
        currentEvent: currentSingleEvent()!,

        thisEvent: eventThis,
        time() {
            return timeAccumulated();
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
        playerStatSet: (stat, value) => {
            setCurrentStatus(s => ({ ...s, [stat]: value }))
        },
        playerStatsSet: (stats) => {
            setCurrentStatus(s => ({ ...s, ...stats }))
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
    const insertHistory = (text: string, isChoice: boolean) => {
        setHistory(h => [...h, { text, isChoice }]);
    }
    const nextEvent = () => {
        let nextEvent: SingleEvent;
        const currentEvent = currentEventItem();

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
                <EventsHistoryBar history={history()} />
                <ActionBar options={currentSingleEvent()?.options} handler={handleOption} gameContext={makeGameContext()} />
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
            if (value < 1 || value > 30) return;
            if (value > baseProperty()[property]) {
                if (availablePoints() <= 0) return;
                setAvailablePoints(p => p - 1);
            } else {
                setAvailablePoints(p => p + 1);
            }

            setBaseProperty(p => ({ ...p, [property]: value }))
        }
    }
    createEffect(() => {
        setBaseProperty(props.baseProperty);
    })
    createEffect(() => {
        setAvailablePoints(props.availablePoints);
    })

    return <>
        <div class='flex flex-col items-center justify-center'>
            <div class='text-3xl p-5'>属性提升 - 可用点数 {availablePoints()}</div>
            <div class='flex flex-col items-center justify-center space-y-2'>
                <UpgradePropertyItem name='力量' value={baseProperty().Constitution} setter={makePropertySetter('Constitution')} />
                <UpgradePropertyItem name='灵巧' value={baseProperty().Dexterity} setter={makePropertySetter('Dexterity')} />
                <UpgradePropertyItem name='智力' value={baseProperty().Intelligence} setter={makePropertySetter('Intelligence')} />
                <UpgradePropertyItem name='意志' value={baseProperty().Willpower} setter={makePropertySetter('Willpower')} />
                <UpgradePropertyItem name='直觉' value={baseProperty().Intuition} setter={makePropertySetter('Intuition')} />
                <UpgradePropertyItem name='幸运' value={baseProperty().Luck} setter={makePropertySetter('Luck')} />
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

    function handleChoose(p: { talent: Talent, index: number }) {
        const newChosen: [Talent, boolean][] = chosen().map((t, i) => {
            if (i === p.index) {
                return [t[0], !t[1]];
            }
            return t;
        });
        const thisChosen = newChosen[p.index];
        const prevCost = chosen().filter(t => t[1]).map(t => t[0].cost).reduce((a, b) => a + b, 0);
        const thisChosenCost = thisChosen[1] ? thisChosen[0].cost : -thisChosen[0].cost;

        if (prevCost + thisChosenCost <= props.talentPoints) {
            setChosen(newChosen);
            setCurrentTalentPoints(props.talentPoints - prevCost - thisChosenCost);
        }
        else {
            // TODO: 提示失败原因：超出点数
        }
    }

    return <>
        <div class='flex flex-col items-center justify-center'>
            <h1 class='text-3xl p-5'>选择天赋 - 可用点数: {currentTalentPoints()}</h1>
            <div class='flex flex-row flex-wrap space-x-5'>
                <For each={chosen()}>
                    {(talent, index) => <TalentItem talent={talent[0]} chosen={talent[1]} index={index()} onChosen={handleChoose} />}
                </For>
            </div>
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

interface EventHistoryItem {
    text: string;
    isChoice: boolean;
}
interface EventsHistoryBarProps {
    history: EventHistoryItem[];
}
const EventsHistoryBar: Component<EventsHistoryBarProps> = (p) => {
    return <ul class='flex flex-col w-2/3 border rounded-lg p-5 space-y-2 overflow-y-auto'>
        <For each={p.history}>{(event) => <EventHistoryItem text={event.text} rightAligned={event.isChoice} />}</For>
    </ul>
}

interface ActionBarProps {
    options?: OptionItem[];
    handler: (option?: OptionItem) => void;
    gameContext: StartedGameContext
}
const ActionBar: Component<ActionBarProps> = (props) => {

    return <div class='flex flex-row justify-around w-2/3 border rounded-lg p-5'>
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
    return <>
        <ul class={gameStyles.StatusBox}>
            <PercentBar name='Health' maxValue={props.playerCurrentStatus.Health} current={props.playerCurrentStatus.HealthCurrent} />
            <PercentBar name='Sanity' maxValue={props.playerCurrentStatus.Sanity} current={props.playerCurrentStatus.SanityCurrent} />
            <PercentBar name='Stamina' maxValue={props.playerCurrentStatus.Stamina} current={props.playerCurrentStatus.StaminaCurrent} />
        </ul>
        <ul class={gameStyles.StatusBox}>
            <Status name="Constitution" value={props.playerCurrentStatus.Constitution} />
            <Status name="Dexterity" value={props.playerCurrentStatus.Dexterity} />
            <Status name="Intelligence" value={props.playerCurrentStatus.Intelligence} />
            <Status name="Luck" value={props.playerCurrentStatus.Luck} />
            <Status name="Intuition" value={props.playerCurrentStatus.Intuition} />
            <Status name="Willpower" value={props.playerCurrentStatus.Willpower} />
            {/* ... */}
        </ul></>
}

interface HealthBarProps {
    name: string;
    maxValue: number;
    current: number;
}

const PercentBar: Component<HealthBarProps> = (props) => {
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
                            'background-color': 'green',
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
