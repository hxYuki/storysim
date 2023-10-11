import { Component, For, Index, Match, Show, Switch, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { PercentBar, useEventHistoryBar } from '../game'
import { Scene } from '../../common/Scene'
import { StartedGameContext } from '../../common/game-context';
import { Character } from '../../common/Character';
import { CharacterAction } from '../../common/CharacterAction';
import { CharacterInitalSpeedDice } from '../../common/Dice';


const ActDistance = 100;
export interface BattlePageProps {
    scene: Scene | undefined;
    makeContext: () => StartedGameContext
}
export const BattlePage: Component<BattlePageProps> = (props) => {
    const [HistoryBar, addHistory] = useEventHistoryBar()


    const [player, setPlayer] = createSignal<Character>(new Character());
    const [enemies, setEnemies] = createSignal<Character[]>();
    const [allies, setAllies] = createSignal<Character[]>()
    const [actions, setActions] = createSignal<CharacterAction[]>([]);

    const [copiedCtx, setCopiedCtx] = createSignal<StartedGameContext>();

    const unitActionDistance: Map<Character, number> = new Map();

    const initializeSpeed = (unit: Character) => {
        const diceCtx = props.makeContext().createDiceContext(unit);
        const diceRes = CharacterInitalSpeedDice.dice(diceCtx, 0, 0)
        unit.statSet('Speed', diceRes.value * unit.properties().Dexterity);
    }

    const gameLoop = () => {
        const ctx = props.makeContext();

        // const playerSpeed = player().properties().Speed
        let playerDistanceLeft = unitActionDistance.get(player())!
        while (playerDistanceLeft > 0) {
            // let it = unitActionDistance.keys()
            for (const unit of unitActionDistance) {
                let distanceLeft = unit[1] - unit[0].properties().Speed;
                while (distanceLeft <= 0) {
                    // 该单位行动
                    // TODO: 选择行动（AI）、选择目标（随机）、速度相近目标回应
                    const action = unit[0].selectActionAuto();
                    if (action) {
                        action.act(ctx.withCharacter(unit[0]), action.targetChoosingAuto(ctx));
                    }
                    // TODOEND

                    distanceLeft += ActDistance;
                }
                unitActionDistance.set(unit[0], distanceLeft)
            }
            playerDistanceLeft = unitActionDistance.get(player())!
        }
        // TODO： 玩家行动、选择目标、速度相近目标回应

        unitActionDistance.set(player(), playerDistanceLeft + ActDistance);
    }

    function addEnemy(enemy: Character | Character[]) {
        if (enemy instanceof Character)
            enemy = [enemy]

        setEnemies([...enemies() ?? [], ...enemy]);
        enemy.forEach((e) => { unitActionDistance.set(e, ActDistance); initializeSpeed(e); });
    }
    function removeEnemy(enemy: Character | Character[]) {
        if (enemy instanceof Character)
            enemy = [enemy]

        setEnemies(enemies()?.filter((e) => (enemy as Character[]).indexOf(e) === -1));
        enemy.forEach((e) => unitActionDistance.delete(e));
    }
    function addAlly(ally: Character | Character[]) {
        if (ally instanceof Character)
            ally = [ally]
        setAllies([...allies() ?? [], ...ally]);
        ally.forEach((a) => { unitActionDistance.set(a, ActDistance); initializeSpeed(a); });
    }
    function removeAlly(ally: Character | Character[]) {
        if (ally instanceof Character) {
            ally = [ally]
        }
        setAllies(allies()?.filter((a) => (ally as Character[]).indexOf(a) === -1));
        ally.forEach((a) => unitActionDistance.delete(a));
    }

    const initSceneRuntime = () => {
        if (props.scene) {
            props.scene.runtime = {
                addEnemy,
                removeEnemy,
                addAlly,
                removeAlly,
                writeBattleRecord(str) {
                    addHistory(str, false);
                },
            }
        }
    }
    onMount(() => {
        initSceneRuntime();

        const en = props.scene?.enemies.map((enemy) => enemy.name).join('、') ?? '敌人'
        addHistory(`遭遇了${en}!`, false)

        const ctx = props.makeContext();
        // 备份角色行动表，以便于在战斗结束后恢复
        setActions([...ctx.player.actionList()]);


        setPlayer(ctx.player);

        props.scene?.setup(ctx);
        // setAllies(props.scene?.allies);
        addAlly(props.scene?.allies ?? [])
        // setEnemies(props.scene?.enemies);
        addEnemy(props.scene?.enemies ?? [])

        setCopiedCtx(ctx);
    })
    onCleanup(() => {
        const ctx = props.makeContext();

        // 恢复角色行动表
        ctx.player.replaceActionList(actions());

        props.scene?.cleanup(ctx);
    })

    const playerAct = (action: CharacterAction) => {
        const ctx = props.makeContext();
        action.act(ctx.withCharacter(player()), action.targetChoosingAuto(ctx));

        // TODO: gameLoop 互动
        // gameLoop();
    }

    return (
        <>
            <h1>{props.scene?.name ?? '遭遇战斗！'}</h1>
            <HistoryBar />
            <div class='flex flex-row justify-start items-center w-2/3'>
                <CharacterInfoItem character={player()} />
                <Index each={allies()}>{(ally, index) => <CharacterInfoItem character={ally()} />}</Index>
            </div>
            <div class='flex flex-row justify-start items-center flex-wrap'>
                <Index each={props.makeContext().player.actionList()}>{
                    (action, index) =>
                        <button class={`rounded-lg p-2 m-1 border flex-auto basis-1/4 ${action().disabled ? 'bg-gray-300' : ''}`}
                            onClick={[playerAct, action()]}
                            disabled={action().disabled}>{action().name}</button>
                }</Index>
            </div >
        </>
    )
}

interface CharacterInfoItemProps {
    character: Character | undefined
}
const CharacterInfoItem: Component<CharacterInfoItemProps> = (props) => {
    return <Show when={props.character} >
        <div class='flex flex-row items-center'>
            <span>{props.character!.name}</span>
            <div>
                <PercentBar name='健康' maxValue={props.character!.properties().Health} current={props.character!.properties().HealthCurrent} />
                <PercentBar name='精神' maxValue={props.character!.properties().Sanity} current={props.character!.properties().SanityCurrent} />
                <PercentBar name='耐力' maxValue={props.character!.properties().Stamina} current={props.character!.properties().StaminaCurrent} />
            </div>
        </div>
    </Show>;
}
