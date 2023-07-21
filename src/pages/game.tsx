import gameStyles from './Game.module.css'
// import '../index.css'
import { Component, For, Show, createEffect, createSignal, onMount } from 'solid-js'

import { createEventCandidates } from '../common/events-collection'
import { CharacterStatus, createEmptyStatus } from '../common/CharacterStatus'
import { GameContext } from '../common/game-context'
import { EventItem, EventChain, OptionItem, SingleEvent, weightedPickEvent, ConditionToken } from '../common/events'

import chance from 'chance'

const GamePage: Component = () => {

    const chanceInstance = chance('TODO: initialize seed later');

    const defaultStatus = createEmptyStatus();
    // 基础（最大）属性值 与 当前属性值
    const [status, setStatus] = createSignal<CharacterStatus>(defaultStatus);
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
    // 当前正在进行的事件链的索引
    // const [currentEventChainIndex, setCurrentEventChainIndex] = createSignal<number>(0);
    // 当前已经满足的事件条件标记
    const [reachedTokens, setReachedTokens] = createSignal<ConditionToken[]>([]);

    // 生成用于各种操作闭包的上下文参数
    const makeGameContext = (eventThis?: EventItem): GameContext => ({
        playerDetails: status(),
        reachedTokens: reachedTokens(),
        currentEvent: currentEventItem() as SingleEvent,

        thisEvent: eventThis,

        tokenSet: insertToken,
        tokenExists(token) {
            // TODO: implement
            return 0;
        },
        tokenRemove: (token: ConditionToken) => {
            // TODO: implement

        },
        playerStatSet: (stat, value) => {
            setCurrentStatus(s => {
                return { ...s, [stat]: value }
            })
        },
        playerStatsSet: (stats) => {
            setCurrentStatus(s => {
                return { ...s, ...stats }
            })
        },

        achievementReached: (achievement: string) => { },
        breakChainEvent: () => { },
    })

    const insertToken = (token: ConditionToken) => {
        setReachedTokens(t => [...t, token]);
    }
    const insertHistory = (text: string, isChoice: boolean) => {
        setHistory(h => [...h, { text, isChoice }]);
    }
    const nextEvent = () => {
        let nextEvent: SingleEvent;
        const currentEvent = currentEventItem();
        // 事件链
        if (currentEvent && currentEvent.type === 'chain' && currentEvent.events.length > currentEvent.index) {

            nextEvent = currentEvent.events[currentEvent.index];
            // setCurrentEventChainIndex(i => i + 1);
            currentEvent.index++;
        }
        // 获取下一个事件
        else {
            let candidates = availableEvents()
                // .map((e, i) => ({ events: e, progress: availableEventProgress()[i], index: i }))
                .filter((event) =>
                    event.repeatable || !reachedTokens().includes(event.id)
                )
                .filter(
                    (event) => {
                        if ((event.type === 'chain') && event.index >= event.events.length) return false;
                        return true;
                    });
            const picked = weightedPickEvent(candidates, makeGameContext(), chanceInstance);

            if (picked.type === 'single') {
                nextEvent = picked;
            } else {
                nextEvent = picked.events[picked.index++];
            }
        }
        insertHistory(nextEvent.text, false);

        setCurrentEventItem(nextEvent);
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
        const events = createEventCandidates(20, chanceInstance);
        setAvailableEvents(events);

    })

    return <>
        <StatusBar />
        <EventsHistoryBar history={history()} />
        <ActionBar options={(currentEventItem() as SingleEvent)?.options} handler={handleOption} />
    </>
}
export default GamePage;

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
            <button onClick={() => props.handler()} class='rounded-lg p-2 border'>继续</button>
        }>

            <For each={props.options}>{(option) =>
                <button onClick={() => props.handler(option)} class={` rounded-lg p-2 ${option.doNotEndEvent ? 'border-dotted border-2' : 'border'}`}>{option.shortText}</button>
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

const StatusBar = () => {
    return <>
        <ul class={gameStyles.StatusBox}>
            <PercentBar name='Health' maxValue={100} current={100} />
            <PercentBar name='Sanity' maxValue={100} current={100} />
            <PercentBar name='Stamina' maxValue={100} current={100} />
        </ul>
        <ul class={gameStyles.StatusBox}>
            <Status name="Constitution" value={123} />
            <Status name="Dexterity" value={456} />
            <Status name="Intelligence" value={789} />
            <Status name="Luck" value={789} />
            <Status name="Intuition" value={789} />
            <Status name="Willpower" value={789} />
            {/* ... */}
        </ul></>
}

interface HealthBarProps {
    name: string;
    maxValue: number;
    current: number;
}

const PercentBar = ({ name, maxValue, current }: HealthBarProps) => {
    const percentage = Math.floor(
        (current / maxValue) * 100);

    return (
        <div style={{ position: 'relative', display: 'flex', 'align-items': 'center', 'margin': '10px' }}>
            <div style={{ 'margin-right': '10px' }}>
                <span>{name}: </span>
            </div>
            <div style={{ flex: 1, width: '100px' }}>
                <div style={{ width: '100%', height: '20px', 'background-color': 'gray', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', 'z-index': 1 }}>
                        {current}/{maxValue}
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

const Status = ({ name, value }: StatusProps) => {
    return (
        <li class={gameStyles.StatusItem}>
            <span style={{ color: 'gray' }}>{name}: </span>
            <span style={{ color: 'white' }}>{value}</span>
        </li>
    );
};