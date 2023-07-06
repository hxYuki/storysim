import gameStyles from './Game.module.css'
// import '../index.css'
import { Component, createSignal, onMount } from 'solid-js'

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

    return <>
        <StatusBar />
        <EventsBar />
    </>
}
export default GamePage;

const EventsBar: Component = () => {

    const [events, setEvents] = createSignal<string[]>([])
    return <ul class='flex flex-col w-2/3 border rounded-lg p-5 space-y-2 overflow-y-auto'>
        <EventItem text='You are born' />
        <EventItem text='You are born' rightAligned />

    </ul>
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
            <PercentBar name='Health' maxHealth={100} currentHealth={100} />
            <PercentBar name='Santy' maxHealth={100} currentHealth={100} />

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
    maxHealth: number;
    currentHealth: number;
}

const PercentBar = ({ name, maxHealth, currentHealth }: HealthBarProps) => {
    const percentage = Math.floor(
        (currentHealth / maxHealth) * 100);

    return (
        <div style={{ position: 'relative', display: 'flex', 'align-items': 'center', 'margin': '10px' }}>
            <div style={{ 'margin-right': '10px' }}>
                <span>{name}: </span>
            </div>
            <div style={{ flex: 1, width: '100px' }}>
                <div style={{ width: '100%', height: '20px', 'background-color': 'gray', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', 'z-index': 1 }}>
                        {currentHealth}/{maxHealth}
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