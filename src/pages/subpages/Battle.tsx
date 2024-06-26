import { Component, For, Index, Match, Show, Switch, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { PercentBar, useEventHistoryBar } from '../game'
import { ConditionReturn, Scene } from '../../common/Scene'
import { StartedGameContext, WithCharacterContext } from '../../common/game-context';
import { Character } from '../../common/Character';
import { CharacterAction, EscapedBuff, NOPAction, NoTargetActionFromAction } from '../../common/CharacterAction';
import { CharacterInitalSpeedDice } from '../../common/Dice';


const ActDistance = 100;
export interface BattlePageProps {
    scene: Scene | undefined;
    makeContext: () => StartedGameContext
}
export const BattlePage: Component<BattlePageProps> = (props) => {
    const [HistoryBar, addHistory, textBuilder] = useEventHistoryBar()


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
        // 使用 filter 排除已经逃跑的单位
        const targets = action.targetChoosingAuto(ctx, triggeredBy, [c => !c.buffs().some(b => b.id === EscapedBuff.id)]);

        if (action.needsTarget && targets.length === 0) {
            action = NoTargetActionFromAction(action);
        }
        // 因为回应其他单位提前行动的单位的该次行动不再会触发行动目标的回应
        const readyTargets = triggeredBy ? [] :
            targets.filter(t => unitActionDistance.get(t)! <= t.properties().Speed).sort((a, b) => {
                return unitActionDistance.get(a)! / a.properties().Speed - unitActionDistance.get(b)! / b.properties().Speed;
            });

        // 行动开始前会设置默认模板以及文本参数
        // 可以在行动中进行覆盖
        // 行动结束后会提交文本
        textBuilder
            .addText('SourceName', character.name)
            .addText('TargetName', targets.map(t => t.name).join('、'))
            .addText('ActionName', action.name)
            .setTemplate(action.textBuildTemplate ?? "{SourceName} 对 {TargetName} 使用了 {ActionName}");

        action.act(ctx, targets);

        if (action.id !== NOPAction.id) {
            textBuilder.commitBuild(false);
        }


        const playerIndex = readyTargets.indexOf(ctx.player);
        if (playerIndex !== -1 && playerIndex < readyTargets.length - 1) {
            // 玩家在本次行动中可行动，且不是最后一个行动的单位
            characterWaitToAct.push(...readyTargets.slice(playerIndex + 1));

            readyTargets.slice(0, playerIndex + 1).forEach((t) => {
                CharacterMove(t, character);
            });

        } else
            // 回应单位触发行动
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
            character.beforeMove(props.makeContext().withCharacter(character));
            CharacterAutoMove(character, triggeredBy);
            character.afterMove(props.makeContext().withCharacter(character));

            checkEndCondition();
        }
        if (character.properties().Speed < unitActionDistance.get(character)!) {
            throw new Error('不应该行动的角色，请检查');
        }

        // 如果角色被触发行动，则已经行动完毕，接下来重新开始计算行动距离，否则将减去超出的行动距离
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
        player().beforeMove(props.makeContext().withCharacter(player()));
        // 等待玩家输入行动
        setIsPlayerMove(true);
        playerTriggeredBy = triggeredBy;

        if (isBattleEnd || player().isEscaping()) {
            FinishPlayerMove(NOPAction);
        }
    }
    const FinishPlayerMove = (action: CharacterAction) => {
        if (isPlayerMove()) {

        } else {
            throw new Error('错误触发：玩家不在行动中');
        }

        const ctx = props.makeContext().withCharacter(player());
        excuteAction(action, ctx, playerTriggeredBy, player());
        // action.act(ctx.withCharacter(player()), action.targetChoosingAuto(ctx));

        // 检查战斗结束条件
        checkEndCondition();

        // 最后进行剩余角色行动
        characterWaitToAct.splice(0, characterWaitToAct.length).forEach((c) => {
            CharacterMove(c, playerTriggeredBy);
        });

        setIsPlayerMove(false);
        player().afterMove(props.makeContext().withCharacter(player()));
    }
    const checkEndCondition = () => {
        for (const condition of props.scene!.endConditions) {
            let res = condition(props.makeContext());
            if (res) {
                props.scene!.runtime!.battleEnd(res);
            }
        }
    }
    let isBattleEnd: ConditionReturn | undefined = undefined;
    const nextMove = () => {

        if (isBattleEnd) {
            // 检测到战斗结束，回到事件层
            props.makeContext().endBattle(isBattleEnd);
            return;
        }
        setIsRunning(true);
        // const ctx = props.makeContext();

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
        characters.forEach((e) => {
            unitActionDistance.set(e, ActDistance);
            initializeSpeed(e);
            e.bindContext(() => props.makeContext().withCharacter(e));
        });
    }
    function removeCharacterActionDistance(characters: Character[]) {
        characters.forEach((e) => {
            unitActionDistance.delete(e);
            e.ctxMaker = undefined;
        });
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
                textBuilder,
                setAvailableActions(actions) {
                    setActions(actions);
                },
                advanceCharacterAction(character: Character, percent: number) {
                    let dis = unitActionDistance.get(character)!;
                    dis = dis - percent * dis;
                    unitActionDistance.set(character, dis);
                },
                battleEnd(result) {
                    addHistory(`${result.text}，战斗结束`, false);

                    isBattleEnd = result;
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
        // setActions([...ctx.player.actionList()]);


        setPlayer(ctx.player);
        setCharacterActionDistance([player()])

        props.scene?.setup(ctx);
        // setAllies(props.scene?.allies);
        addAlly(props.scene?.allies ?? [])
        // setEnemies(props.scene?.enemies);
        addEnemy(props.scene?.enemies ?? [])


        setCopiedCtx(ctx);

        // textBuilder.buildText('SourceName', "123");
        // textBuilder.buildText('TargetName', "456");
        // textBuilder.buildText('ActionName', "789");
        // textBuilder.setTemplate("{SourceName}对{TargetName}使用了{ActionName}");
        // textBuilder.commitBuild(false);

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
        // ctx.player.replaceActionList(actions());

        props.scene?.cleanup(ctx);

        // clearInterval(gameloopTimer);
    })

    const playerAct = (action: CharacterAction) => {
        if (!isPlayerMove()) {
            console.log("还没有轮到你行动哦")
            return;
        }

        FinishPlayerMove(action);
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
                    <Index each={actions()}>{
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
