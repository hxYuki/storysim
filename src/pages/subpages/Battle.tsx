import { Component, For, Index, Match, Show, Switch, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { PercentBar, useEventHistoryBar } from '../game'
import { Scene } from '../../common/Scene'
import { StartedGameContext } from '../../common/game-context';
import { Character } from '../../common/Character';
import { CharacterAction } from '../../common/CharacterAction';


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

    const [copiedCtx, setCopiedCtx] = createSignal<StartedGameContext>()

    const initSceneRuntime = () => {
        if (props.scene) {
            props.scene.runtime = {
                addEnemy(enemy) {
                    setEnemies([...enemies() ?? [], enemy]);
                },
                removeEnemy(enemy) {
                    setEnemies(enemies()?.filter((e) => e !== enemy));
                },
                addAlly(ally) {
                    setAllies([...allies() ?? [], ally]);
                },
                removeAlly(ally) {
                    setAllies(allies()?.filter((a) => a !== ally));
                }
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
        setAllies(props.scene?.allies);
        setEnemies(props.scene?.enemies);

        setCopiedCtx(ctx);
    })
    onCleanup(() => {
        const ctx = props.makeContext();

        // 恢复角色行动表
        ctx.player.replaceActionList(actions());

        props.scene?.cleanup(ctx);
    })

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
                            onClick={[action().act, props.makeContext()]}
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
