import { Component, For, Index, Match, Show, Switch, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { PercentBar, useEventHistoryBar } from '../game'
import { Scene } from '../../common/Scene'
import { StartedGameContext, WithCharacterContext } from '../../common/game-context';
import { Character } from '../../common/Character';
import { CharacterAction, NOPAction } from '../../common/CharacterAction';
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

    const characterWaitToAct: Character[] = [];
    let playerTriggeredBy: Character | undefined;

    const initializeSpeed = (unit: Character) => {
        const diceCtx = props.makeContext().createDiceContext(unit);
        const diceRes = CharacterInitalSpeedDice.dice(diceCtx, 0, 0)
        unit.statSet('Speed', diceRes.value * unit.properties().Dexterity);
    }

    function excuteAction(action: CharacterAction, ctx: WithCharacterContext, triggeredBy: Character | undefined, character: Character) {
        const targets = action.targetChoosingAuto(ctx, triggeredBy);

        // 因为回应其他单位提前行动的单位的该次行动不再会触发行动目标的回应
        const readyTargets = triggeredBy ? [] :
            targets.filter(t => unitActionDistance.get(t)! <= t.properties().Speed).sort((a, b) => {
                return unitActionDistance.get(a)! / a.properties().Speed - unitActionDistance.get(b)! / b.properties().Speed;
            });

        action.act(ctx, targets);

        // TODO: 触发行动 文本合并、 行动效果文本
        addHistory(`${character.name} 对 ${targets.map(t => t.name).join('、')} 使用了 ${action.name}`, false);

        const playerIndex = readyTargets.indexOf(ctx.player);
        if (playerIndex !== -1 && playerIndex < readyTargets.length - 1) {
            // 玩家在本次行动中可行动，且不是最后一个行动的单位
            characterWaitToAct.push(...readyTargets.slice(playerIndex + 1));

            readyTargets.slice(0, playerIndex + 1).forEach((t) => {
                CharacterMove(t, character);
            });

        }
        readyTargets.forEach((t) => {
            CharacterMove(t, character);
        });
    }

    const CharacterMove = (character: Character, triggeredBy?: Character) => {
        if (triggeredBy?.properties().HealthCurrent ?? 1 <= 0) {
            // 如果触发者已死亡，不再提前行动
            return;
        }

        if (character === player()) {
            StartPlayerMove(triggeredBy);
        } else {
            CharacterAutoMove(character, triggeredBy);
        }
        if (character.properties().Speed < unitActionDistance.get(character)!) {
            throw new Error('不应该行动的角色，请检查');
        }
        if (triggeredBy) {
            unitActionDistance.set(character, ActDistance)
        } else {
            unitActionDistance.set(character, ActDistance - (unitActionDistance.get(character)! - character.properties().Speed))
        }
        // 恢复角色速度
        character.statSet('Speed', character.properties().Dexterity)
    }

    const CharacterAutoMove = (character: Character, triggeredBy?: Character) => {
        const ctx = props.makeContext().withCharacter(character);

        const action = character.selectActionAuto();
        excuteAction(action, ctx, triggeredBy, character);
    }

    const [isPlayerMove, setIsPlayerMove] = createSignal(false);
    const [isRunning, setIsRunning] = createSignal(false);

    const StartPlayerMove = (triggeredBy?: Character) => {
        // 等待玩家输入行动
        setIsPlayerMove(true);
        playerTriggeredBy = triggeredBy;

    }
    const FinishPlayerMove = (action: CharacterAction) => {
        if (isPlayerMove()) {

        } else {
            throw new Error('错误触发：玩家不在行动中');
        }
        // TODO
        const ctx = props.makeContext().withCharacter(player());
        excuteAction(action, ctx, playerTriggeredBy, player());
        // action.act(ctx.withCharacter(player()), action.targetChoosingAuto(ctx));

        // 最后进行剩余角色行动
        characterWaitToAct.splice(0, characterWaitToAct.length).forEach((c) => {
            CharacterMove(c, playerTriggeredBy);
        });

        setIsPlayerMove(false);
    }
    const keepMove = () => {
        while (!isPlayerMove()) {
            nextMove();
        }
    }
    const nextMove = () => {
        setIsRunning(true);
        const ctx = props.makeContext();

        let unitTime: [Character, number][] = [];
        for (const unit of unitActionDistance) {
            unitTime.push([unit[0], unit[1] / unit[0].properties().Speed]);
        }
        // 单位行动用时 升序排序
        unitTime.sort((a, b) => a[1] - b[1]);

        while (unitActionDistance.get(unitTime[0][0])! > unitTime[0][0].properties().Speed) {
            for (const unit of unitActionDistance) {
                unitActionDistance.set(unit[0], unit[1] - unitTime[0][0].properties().Speed);
            }
        }

        // unitTime[0] 行动
        const characterToAct = unitTime[0][0];
        CharacterMove(characterToAct);

        setIsRunning(false);
    }

    function setCharacterActionDistance(characters: Character[]) {
        characters.forEach((e) => { unitActionDistance.set(e, ActDistance); initializeSpeed(e); });
    }
    function removeCharacterActionDistance(characters: Character[]) {
        characters.forEach((e) => { unitActionDistance.delete(e); });
    }

    function addEnemy(enemy: Character | Character[]) {
        if (enemy instanceof Character)
            enemy = [enemy]

        setEnemies([...enemies() ?? [], ...enemy]);
        setCharacterActionDistance(enemy);
    }

    function removeEnemy(enemy: Character | Character[]) {
        if (enemy instanceof Character)
            enemy = [enemy]

        setEnemies(enemies()?.filter((e) => (enemy as Character[]).indexOf(e) === -1));
        removeCharacterActionDistance(enemy);
    }
    function addAlly(ally: Character | Character[]) {
        if (ally instanceof Character)
            ally = [ally]
        setAllies([...allies() ?? [], ...ally]);
        setCharacterActionDistance(ally);
    }
    function removeAlly(ally: Character | Character[]) {
        if (ally instanceof Character) {
            ally = [ally]
        }
        setAllies(allies()?.filter((a) => (ally as Character[]).indexOf(a) === -1));
        removeCharacterActionDistance(ally);
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

    let gameloopTimer: number | undefined;
    onMount(() => {
        initSceneRuntime();

        const en = props.scene?.enemies.map((enemy) => enemy.name).join('、') ?? '敌人'
        addHistory(`遭遇了${en}!`, false)

        const ctx = props.makeContext();
        // 备份角色行动表，以便于在战斗结束后恢复
        setActions([...ctx.player.actionList()]);


        setPlayer(ctx.player);
        setCharacterActionDistance([player()])

        props.scene?.setup(ctx);
        // setAllies(props.scene?.allies);
        addAlly(props.scene?.allies ?? [])
        // setEnemies(props.scene?.enemies);
        addEnemy(props.scene?.enemies ?? [])


        setCopiedCtx(ctx);

        // gameloopTimer = window.setInterval(() => {
        //     if (isPlayerMove() || isRunning()) {
        //         return;
        //     }
        //     nextMove();
        // }, 1000);
    })
    onCleanup(() => {
        const ctx = props.makeContext();

        // 恢复角色行动表
        ctx.player.replaceActionList(actions());

        props.scene?.cleanup(ctx);

        // clearInterval(gameloopTimer);
    })

    const playerAct = (action: CharacterAction) => {
        if (!isPlayerMove()) {
            console.log("还没有轮到你行动哦")
            return;
        }

        // TODO: gameLoop 互动
        FinishPlayerMove(action);

        // keepMove();
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
                <Show when={isPlayerMove()} fallback={
                    <button class='rounded-lg p-2 m-1 border flex-auto basis-1/4'
                        onClick={[nextMove, undefined]}
                    >继续</button>
                }>
                    <Index each={props.makeContext().player.actionList()}>{
                        (action, index) =>
                            <button class={`rounded-lg p-2 m-1 border flex-auto basis-1/4 ${action().disabled ? 'bg-gray-300' : ''}`}
                                onClick={[playerAct, action()]}
                                disabled={action().disabled}>{action().name}</button>
                    }</Index>
                </Show>
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
