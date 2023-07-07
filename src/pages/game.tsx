import gameStyles from './Game.module.css'
// import '../index.css'
import { Component, For, createSignal, onMount } from 'solid-js'

import { mahoushoujoEvents } from '../common/events-collection'

type CharacterStatus = {
    Health: number,
    Sanity: number,
    Stamina: number,
    Moral: number,
    Money: number,
    Age: number,

    Constitution: number,
    Dexterity: number,
    Intelligence: number,
    Intuition: number,
    Luck: number,
    Willpower: number,

    Speed: number,
}

const GamePage: Component = () => {

    const [status, setStatus] = createSignal<CharacterStatus>();
    const [history, setHistory] = createSignal<EventHistoryItem[]>([
        { text: '你醒来了', isChoice: false }
    ]);

    const [currentEvent, setCurrentEvent] = createSignal<SingleEvent>(
        mahoushoujoEvents[0] as SingleEvent
    );

    return <>
        <StatusBar />
        <EventsHistoryBar history={history()} />
        <ActionBar options={currentEvent()?.options} />
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
        <For each={p.history}>{(event) => <EventItem text={event.text} rightAligned={event.isChoice} />}</For>
    </ul>
}

interface ActionBarProps {
    options?: OptionItem[];
}
const ActionBar: Component<ActionBarProps> = (props) => {

    return <div class='flex flex-row justify-around w-2/3 border rounded-lg p-5'>
        <For each={props.options}>{(option) =>
            <button class={` rounded-lg p-2 ${option.doNotEndEvent ? 'border-dotted border-2' : 'border'}`}>{option.shortText}</button>
        }</For>
    </div>
}

interface EventItemProps {
    text: string;
    rightAligned?: boolean;
}
const EventItem: Component<EventItemProps> = (props) => {
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
            <PercentBar name='Santy' maxValue={100} current={100} />
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