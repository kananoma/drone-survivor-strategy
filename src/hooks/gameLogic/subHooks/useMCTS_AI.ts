import { useEffect, useCallback } from 'react'
import { GameLogicState } from '../../../gameLogic/initialState'
import {
  ConcreteAiAction,
  GamePhase,
  Hex,
  ArmamentName,
  UpgradeOption,
  Player,
  Enemy,
  EmpTrapStats,
  BarricadeStats,
  ChargeFieldStats,
  CollectorDroneStats,
  CrashBombStats,
  BoosterStats,
} from '../../../types'
import { useDebug } from '../../../contexts/DebugContext'
import { ARMAMENT_STATS_GETTERS } from '../../../constants'
import { getNeighbors, axialToId } from '../../../utils/hexUtils'
import {
  deepCloneGameState,
  simulatePlayerActionForAIInternal,
  scoreBoardStateForAIInternal,
  actionToDescriptiveInternal,
  _simulateFullEnemyTurnLogic_ForAI,
} from './useGameSimulation'
import { AIDebugControls } from '../../useAIDebugManager'

interface UseMCTS_AIProps {
  gameState: GameLogicState & AIDebugControls
  setGameState: React.Dispatch<React.SetStateAction<GameLogicState>>
  addMessage: (msgKey: string, params?: Record<string, string | number>) => void
  t: (key: string, params?: Record<string, string | number>) => string
  selectors: {
    movableHexIds: string[]
    empTrapPlacementTargetHexIds: string[]
    barricadePlacementTargetHexIds: string[]
    chargeFieldPlacementTargetHexIds?: string[]
    collectorDronePlacementTargetHexIds?: string[]
  }
  playerActions: {
    handlePlayerMove: (hex: Hex) => void
    handleUseArmament: (armamentId: ArmamentName) => void
    handlePlaceEmpTrap: (hex: Hex) => void
    handlePlaceBarricade: (hex: Hex) => void
    handleUseSpareBattery: () => void
    handlePlaceChargeField?: (hex: Hex) => void
    handlePlaceCollectorDrone?: (hex: Hex) => void
  }
  upgradeSystem: {
    handleOpenUpgradeModal: () => void
    handleSelectUpgradeOption: (optionId: string) => void
    generateUpgradeOptions: () => UpgradeOption[]
  }
  cancelTrapPlacement: () => void
  cancelBarricadePlacement: () => void
  cancelChargeFieldPlacement?: () => void
  cancelCollectorDronePlacement?: () => void
}

const MCTS_AI_DECISION_DELAY_MS = 250

export const useMCTS_AI = ({
  gameState,
  setGameState,
  addMessage,
  t,
  selectors,
  playerActions,
  upgradeSystem,
  cancelTrapPlacement,
  cancelBarricadePlacement,
  cancelChargeFieldPlacement,
  cancelCollectorDronePlacement,
}: UseMCTS_AIProps) => {
  const { addLog } = useDebug()

  const generatePossibleActions = useCallback(
    (currentState: GameLogicState & AIDebugControls): ConcreteAiAction[] => {
      const actions: ConcreteAiAction[] = []
      if (!currentState.player || currentState.playerActionsRemaining <= 0) {
        if (currentState.gamePhase === 'PlayerTurn' && currentState.playerActionsRemaining <= 0) {
        } else if (!currentState.player) {
          addLog({ type: 'INFO', message: '[MCTS AI GenActions] No player, cannot generate actions.' })
        } else if (currentState.playerActionsRemaining <= 0) {
        }
        return actions
      }

      // Moves
      selectors.movableHexIds.forEach((hexId) => {
        const hex = currentState.hexes.get(hexId)
        if (
          hex &&
          !(
            currentState.pendingSpawnLocations &&
            currentState.pendingSpawnLocations.some((ps) => ps.q === hex.q && ps.r === hex.r)
          )
        ) {
          actions.push({ type: 'MOVE', hex })
        }
      })

      // Use Armaments
      ;(Object.keys(currentState.armamentLevels) as ArmamentName[]).forEach((armId) => {
        if (currentState.armamentLevels[armId] > 0) {
          const stats = ARMAMENT_STATS_GETTERS[armId](currentState.armamentLevels[armId])
          if (currentState.activeBuffs.overheat.isActive && armId !== 'crash_bomb') return

          if (
            currentState.currentEnergy >= stats.energyCost ||
            (armId === 'crash_bomb' && currentState.currentEnergy >= (stats as CrashBombStats).energyCost)
          ) {
            if (
              armId === 'booster' &&
              currentState.activeBuffs.boosterUsesThisTurn >= (stats as BoosterStats).usesPerTurn
            )
              return
            if (armId === 'stealth' && currentState.activeBuffs.stealth.isActive) return
            if (armId === 'jammer' && currentState.activeBuffs.jammerFieldEffect.isActive) return
            if (armId === 'crash_bomb' && currentState.activeBuffs.overheat.isActive) return

            if (armId === 'trap' && currentState.placedEmpTraps.length >= (stats as EmpTrapStats).maxCharges) return
            if (armId === 'barricade' && currentState.placedBarricades.length >= (stats as BarricadeStats).maxCharges)
              return
            if (
              armId === 'charge_field' &&
              currentState.placedChargeFields &&
              currentState.placedChargeFields.length >= (stats as ChargeFieldStats).maxPlaced
            )
              return
            if (
              armId === 'collector_drone' &&
              currentState.placedCollectorDrones &&
              currentState.placedCollectorDrones.length >= (stats as CollectorDroneStats).maxPlaced
            )
              return

            actions.push({ type: 'USE_ARMAMENT', armamentId: armId })
          }
        }
      })

      // Use Spare Battery
      if (
        currentState.spareBatteriesCount > 0 &&
        currentState.currentEnergy < currentState.maxEnergy &&
        !currentState.activeBuffs.overheat.isActive
      ) {
        actions.push({ type: 'USE_SPARE_BATTERY' })
      }
      return actions
    },
    [
      selectors.movableHexIds,
      addLog,
      gameState.hexes,
      gameState.pendingSpawnLocations,
      gameState.armamentLevels,
      gameState.currentEnergy,
      gameState.maxEnergy,
      gameState.activeBuffs,
      gameState.spareBatteriesCount,
      gameState.placedEmpTraps,
      gameState.placedBarricades,
      gameState.placedChargeFields,
      gameState.placedCollectorDrones,
    ]
  )

  useEffect(() => {
    const {
      isMctsAiModeActive,
      isAiModeActive,
      isAutoMoveActive,
      gamePhase,
      player,
      playerActionsRemaining,
      aiPlannedActionSequence,
      mctsLookaheadDepth,
      score: initialTurnScore,
      turnNumber,
    } = gameState

    if (!isMctsAiModeActive || isAiModeActive || isAutoMoveActive || !player || aiPlannedActionSequence) {
      return
    }

    if (gamePhase === 'GameOver' || gamePhase === 'StageComplete') {
      setGameState((prev) => ({ ...prev, aiPlannedActionSequence: null }))
      return
    }

    const mctsDecisionTimer = setTimeout(() => {
      if (
        !gameState.isMctsAiModeActive ||
        gameState.isAiModeActive ||
        gameState.isAutoMoveActive ||
        !gameState.player
      ) {
        setGameState((prev) => ({ ...prev, aiPlannedActionSequence: null }))
        return
      }

      setGameState((currentDecisionState) => {
        if (currentDecisionState.aiPlannedActionSequence) return currentDecisionState
        if (!currentDecisionState.player) return currentDecisionState

        if (currentDecisionState.gamePhase === 'UpgradeSelection') {
          addLog({ type: 'INFO', message: '[MCTS AI] Entering Upgrade Selection Logic' })
          const priorityOrder: UpgradeOption['id'][] = [
            'booster_to_lv1',
            'stealth_to_lv1',
            'trap_to_lv1',
            'drone_max_energy_1',
            'drone_energy_recovery_1',
          ]
          let chosenOption: UpgradeOption | null = null
          for (const optionId of priorityOrder) {
            const found = currentDecisionState.upgradeOptions.find((opt) => opt.id === optionId)
            if (found) {
              chosenOption = found
              break
            }
          }
          if (!chosenOption && currentDecisionState.upgradeOptions.length > 0)
            chosenOption =
              currentDecisionState.upgradeOptions[
                Math.floor(Math.random() * currentDecisionState.upgradeOptions.length)
              ]

          if (chosenOption) {
            addLog({ type: 'INFO', message: `[MCTS AI] Choosing upgrade: ${chosenOption.id}` })
            upgradeSystem.handleSelectUpgradeOption(chosenOption.id)
          } else {
            addMessage('AI_MODE_MCTS_NO_VALID_ACTION_STOPPING')
            addLog({ type: 'INFO', message: '[MCTS AI] No upgrade options available, stopping MCTS.' })
          }
          return currentDecisionState
        }

        const handlePlacementLogic = (
          placementTargets: string[] | undefined,
          placementActionType:
            | 'PLACE_TRAP_SIMULATED'
            | 'PLACE_BARRICADE_SIMULATED'
            | 'PLACE_CHARGE_FIELD_SIMULATED'
            | 'PLACE_COLLECTOR_DRONE_SIMULATED',
          cancelFunction: () => void
        ) => {
          addLog({
            type: 'INFO',
            message: `[MCTS AI] Entering ${placementActionType} Logic. Targets: ${
              placementTargets ? placementTargets.length : 0
            }`,
          })
          if (placementTargets && placementTargets.length > 0) {
            let bestHex: Hex | null = null
            let bestScore = -Infinity
            for (const hexId of placementTargets) {
              const targetHex = currentDecisionState.hexes.get(hexId)
              if (!targetHex) continue
              const simStateWithPlacement = simulatePlayerActionForAIInternal(
                deepCloneGameState(currentDecisionState),
                { type: placementActionType, hex: targetHex },
                upgradeSystem.generateUpgradeOptions
              )
              const score = scoreBoardStateForAIInternal(
                simStateWithPlacement,
                initialTurnScore,
                false,
                upgradeSystem.generateUpgradeOptions
              )
              if (score > bestScore) {
                bestScore = score
                bestHex = targetHex
              }
            }
            if (bestHex) {
              addLog({
                type: 'INFO',
                message: `[MCTS AI] Best placement for ${placementActionType} at (${bestHex.q},${bestHex.r}), score: ${bestScore}`,
              })
              return { ...currentDecisionState, aiPlannedActionSequence: [{ type: placementActionType, hex: bestHex }] }
            } else {
              addLog({
                type: 'INFO',
                message: `[MCTS AI] No best placement for ${placementActionType} found, cancelling.`,
              })
              cancelFunction()
              return currentDecisionState
            }
          } else {
            addLog({ type: 'INFO', message: `[MCTS AI] No targets for ${placementActionType}, cancelling.` })
            cancelFunction()
            return currentDecisionState
          }
        }

        if (currentDecisionState.gamePhase === 'PlacingEmpTrap') {
          return handlePlacementLogic(
            selectors.empTrapPlacementTargetHexIds,
            'PLACE_TRAP_SIMULATED',
            cancelTrapPlacement
          )
        }
        if (currentDecisionState.gamePhase === 'PlacingBarricade') {
          return handlePlacementLogic(
            selectors.barricadePlacementTargetHexIds,
            'PLACE_BARRICADE_SIMULATED',
            cancelBarricadePlacement
          )
        }
        if (
          currentDecisionState.gamePhase === 'PlacingChargeField' &&
          playerActions.handlePlaceChargeField &&
          cancelChargeFieldPlacement &&
          selectors.chargeFieldPlacementTargetHexIds
        ) {
          return handlePlacementLogic(
            selectors.chargeFieldPlacementTargetHexIds,
            'PLACE_CHARGE_FIELD_SIMULATED',
            cancelChargeFieldPlacement
          )
        }
        if (
          currentDecisionState.gamePhase === 'PlacingCollectorDrone' &&
          playerActions.handlePlaceCollectorDrone &&
          cancelCollectorDronePlacement &&
          selectors.collectorDronePlacementTargetHexIds
        ) {
          return handlePlacementLogic(
            selectors.collectorDronePlacementTargetHexIds,
            'PLACE_COLLECTOR_DRONE_SIMULATED',
            cancelCollectorDronePlacement
          )
        }

        if (currentDecisionState.gamePhase !== 'PlayerTurn' || currentDecisionState.playerActionsRemaining <= 0) {
          return currentDecisionState
        }

        if (currentDecisionState.upgradePoints > 0) {
          addLog({ type: 'INFO', message: '[MCTS AI] Upgrade points available, opening modal.' })
          upgradeSystem.handleOpenUpgradeModal()
          return currentDecisionState
        }

        addLog({
          type: 'INFO',
          message: `[MCTS AI] Starting main decision logic. Actions remaining: ${currentDecisionState.playerActionsRemaining}`,
        })
        const initialActions = generatePossibleActions(gameState)
        addLog({ type: 'INFO', message: `[MCTS AI] Generated ${initialActions.length} initial actions.` })

        if (initialActions.length === 0) {
          addMessage('AI_MODE_MCTS_NO_VALID_ACTION_STOPPING')
          addLog({ type: 'INFO', message: '[MCTS AI] No valid actions generated, stopping MCTS.' })
          return currentDecisionState
        }

        let bestOverallSequence: ConcreteAiAction[] | null = null
        let bestOverallScore = -Infinity

        for (const firstAction of initialActions) {
          let currentSimState = deepCloneGameState(currentDecisionState)
          let sequenceForThisBranch: ConcreteAiAction[] = [firstAction]

          addLog({
            type: 'INFO',
            message: `[MCTS AI] Simulating initial action: ${actionToDescriptiveInternal(firstAction).desc}`,
          })
          currentSimState = simulatePlayerActionForAIInternal(
            currentSimState,
            firstAction,
            upgradeSystem.generateUpgradeOptions
          )

          let actionsTakenThisTurn = 1
          while (
            currentSimState.playerActionsRemaining > 0 &&
            actionsTakenThisTurn < mctsLookaheadDepth &&
            !currentSimState.isUpgradeSelection
          ) {
            const subsequentPossibleActions = generatePossibleActions({ ...currentSimState, ...gameState })
            addLog({
              type: 'INFO',
              message: `[MCTS AI] Lookahead depth ${actionsTakenThisTurn}, ${subsequentPossibleActions.length} sub-actions.`,
            })
            if (subsequentPossibleActions.length === 0) break

            let bestSubsequentAction: ConcreteAiAction | null = null
            let bestSubsequentScore = -Infinity

            for (const subAction of subsequentPossibleActions) {
              const tempState = simulatePlayerActionForAIInternal(
                deepCloneGameState(currentSimState),
                subAction,
                upgradeSystem.generateUpgradeOptions
              )
              const score = scoreBoardStateForAIInternal(
                tempState,
                initialTurnScore,
                true,
                upgradeSystem.generateUpgradeOptions
              )
              if (score > bestSubsequentScore) {
                bestSubsequentScore = score
                bestSubsequentAction = subAction
              }
            }
            if (bestSubsequentAction) {
              addLog({
                type: 'INFO',
                message: `[MCTS AI] Best sub-action: ${
                  actionToDescriptiveInternal(bestSubsequentAction).desc
                }, score: ${bestSubsequentScore}`,
              })
              currentSimState = simulatePlayerActionForAIInternal(
                currentSimState,
                bestSubsequentAction,
                upgradeSystem.generateUpgradeOptions
              )
              sequenceForThisBranch.push(bestSubsequentAction)
              actionsTakenThisTurn++
            } else {
              addLog({ type: 'INFO', message: `[MCTS AI] No best sub-action found at depth ${actionsTakenThisTurn}.` })
              break
            }
          }

          addLog({
            type: 'INFO',
            message: `[MCTS AI] Simulating enemy turn after sequence: ${sequenceForThisBranch
              .map((a) => actionToDescriptiveInternal(a).desc)
              .join(' -> ')}`,
          })
          const stateAfterEnemyTurnSim = _simulateFullEnemyTurnLogic_ForAI(currentSimState)
          const finalScoreForBranch = scoreBoardStateForAIInternal(
            stateAfterEnemyTurnSim,
            initialTurnScore,
            false,
            upgradeSystem.generateUpgradeOptions
          )
          addLog({
            type: 'INFO',
            message: `[MCTS AI] Final score for branch (${
              actionToDescriptiveInternal(firstAction).desc
            }...): ${finalScoreForBranch}`,
          })

          if (finalScoreForBranch > bestOverallScore) {
            bestOverallScore = finalScoreForBranch
            bestOverallSequence = sequenceForThisBranch
          }
        }

        if (bestOverallSequence) {
          const descriptiveSequence = bestOverallSequence
            .map((action) => actionToDescriptiveInternal(action).desc)
            .join(' -> ')
          addLog({
            type: 'INFO',
            message: t('AI_MODE_MCTS_DECISION_LOG', {
              action: descriptiveSequence,
              visits: gameState.mctsIterations || 1000,
              value: bestOverallScore.toFixed(0),
            }),
          })
          return { ...currentDecisionState, aiPlannedActionSequence: bestOverallSequence }
        } else {
          addMessage('AI_MODE_MCTS_NO_VALID_ACTION_STOPPING')
          addLog({ type: 'INFO', message: '[MCTS AI] No best overall sequence found, stopping MCTS.' })
          return currentDecisionState
        }
      })
    }, MCTS_AI_DECISION_DELAY_MS)

    return () => clearTimeout(mctsDecisionTimer)
  }, [
    gameState,
    setGameState,
    addMessage,
    t,
    selectors,
    playerActions,
    upgradeSystem,
    cancelTrapPlacement,
    cancelBarricadePlacement,
    cancelChargeFieldPlacement,
    cancelCollectorDronePlacement,
    generatePossibleActions,
    addLog,
  ])
}
