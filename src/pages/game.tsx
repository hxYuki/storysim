import gameStyles from './Game.module.css'
// import '../index.css'
import { Component, For, Match, Show, Switch, createEffect, createSignal, onMount } from 'solid-js'
import { createStore } from "solid-js/store";
import type { StoreNode, Store, SetStoreFunction } from "solid-js/store";

import { createEventCandidates } from '../common/events-collection'
import { CharacterStatus, createEmptyStatus } from '../common/CharacterStatus'
import { GameContext } from '../common/game-context'
import { EventItem, EventChain, OptionItem, SingleEvent, weightedPickEvent, ConditionToken, StackableToken, filterReadyEvents, conditionsCheck } from '../common/events'

import chance from 'chance'
import { Talent } from '../common/talent';
import { createTalentCandidates } from '../common/talents-collection';

const GamePage: Component = () => {

    const chanceInstance = chance('TODO: initialize seed later');

    const defaultStatus = createEmptyStatus();
    // 基础（最大）属性值 与 当前属性值
    // const [status, setStatus] = createSignal<CharacterStatus>(defaultStatus);
    const [currentStatus, setCurrentStatus] = createSignal<CharacterStatus>(defaultStatus);

    const [history, setHistory] = createSignal<EventHistoryItem[]>([
        { text: '你醒来了', isChoice: false }
    ]);

    // 候选事件列表
    const [availableEvents, setAvailableEvents] = createSignal<EventItem[]>([]);
    // 对应索引的事件线的下一个事件的索引
    // const [availableEventProgress, setAvailableEventProgress] = createSignal<number[]>([]);

    // 当前正在进行的事件
    // const [currentEventIndex, setCurrentEventIndex] = createSignal<number>(-1);
    const [currentEventItem, setCurrentEventItem] = createSignal<EventItem>();
    const [currentSingleEvent, setCurrentSingleEvent] = createSignal<SingleEvent>();

    // 当前正在进行的事件链的索引
    // const [currentEventChainIndex, setCurrentEventChainIndex] = createSignal<number>(0);

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


    // 生成用于各种操作闭包的上下文参数
    const makeGameContext = (eventThis?: EventItem): GameContext => ({
        playerDetails: currentStatus(),
        reachedTokens: reachedTokens(),
        currentEvent: currentSingleEvent()!,

        thisEvent: eventThis,

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

    onMount(() => {
        // TODO: 为每局游戏生成一个 seed， 作为全局的随机数发生器
        chanceInstance.seed = "Genenrate a seed";
        const talents = createTalentCandidates(10, chanceInstance);
        setTalentCadidate(talents);
        const events = createEventCandidates(20, chanceInstance);
        setAvailableEvents(events);

    })

    const [talentCadidate, setTalentCadidate] = createSignal<Talent[]>([]);

    return <>
        <Switch>
            <Match when={gameState() === 'talent-choose'}>
                <TelentChoosePage talents={talentCadidate()} talentPoints={3} />
            </Match>
            <Match when={gameState() === 'game-start'}>
                <StatusBar playerCurrentStatus={currentStatus()} />
                <EventsHistoryBar history={history()} />
                <ActionBar options={currentSingleEvent()?.options} handler={handleOption} />
            </Match>
        </Switch>
    </>
}
export default GamePage;

interface TalentChoosePageProps {
    talents: Talent[];
    talentPoints: number;
    // chosen: Talent[];
}
const TelentChoosePage: Component<TalentChoosePageProps> = (props) => {
    const [chosen, setChosen] = createSignal<[Talent, boolean][]>(props.talents.map(t => [t, false]));

    function handleChosen(p: { talent: Talent, index: number }) {
        const newChosen: [Talent, boolean][] = chosen().map((t, i) => {
            if (i === p.index) {
                return [t[0], !t[1]];
            }
            return t;
        });
        const thisChosen = newChosen[p.index];
        const prevCost = chosen().filter(t => t[1]).map(t => t[0].cost).reduce((a, b) => a + b, 0);
        const thisChosenCost = thisChosen[1] ? thisChosen[0].cost : -thisChosen[0].cost;

        if (prevCost + thisChosenCost <= props.talentPoints)
            setChosen(newChosen);
    }

    return <>
        <div class='flex flex-col items-center justify-center'>
            <h1 class='text-3xl p-5'>选择天赋</h1>
            <div class='flex flex-row flex-wrap space-x-5'>
                <For each={chosen()}>
                    {(talent, index) => <TalentItem talent={talent[0]} chosen={talent[1]} index={index()} onChosen={handleChosen} />}
                </For>
                {/* <button class='flex flex-col items-center rounded border p-2 pt-1'>
                    <span class='text-lg'>天赋1</span>
                </button>
                <button class={`flex flex-col items-center rounded border p-2 pt-1`}>
                    <span class={`text-lg ${gameStyles.underline}`}>天赋2</span>
                </button> */}
            </div>
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
}
const ActionBar: Component<ActionBarProps> = (props) => {

    return <div class='flex flex-row justify-around w-2/3 border rounded-lg p-5'>
        <Show when={props.options && props.options.length > 0} fallback={
            <button onClick={[props.handler, null]} class='rounded-lg p-2 border'>继续</button>
        }>

            <For each={props.options}>{(option) =>
                <button onClick={[props.handler, option]} class={` rounded-lg p-2 ${option.doNotEndEvent ? 'border-dotted border-2' : 'border'}`}>{option.shortText}</button>
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
