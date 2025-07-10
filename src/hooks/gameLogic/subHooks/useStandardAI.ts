import { useEffect, useCallback } from 'react'
import { GameLogicState } from '../../../gameLogic/initialState'
import {
  GamePhase,
  Hex,
  ArmamentName,
  UpgradeOption,
  ConcreteAiAction,
  EmpTrapStats,
  BarricadeStats,
  ChargeFieldStats,
  Enemy,
  CollectorDroneStats,
  BoosterStats,
  StealthStats,
  JammerStats,
  CrashBombStats,
} from '../../../types'
import { useDebug } from '../../../contexts/DebugContext'
import { ARMAMENT_STATS_GETTERS } from '../../../constants'
import { getNeighbors, axialToId } from '../../../utils/hexUtils'
import {
  deepCloneGameState,
  simulatePlayerActionForAIInternal,
  scoreBoardStateForAIInternal,
  actionToDescriptiveInternal,
} from './useGameSimulation'
import { AIDebugControls } from '../../useAIDebugManager'

const AI_MODE_DECISION_DELAY_MS = 250

interface UseStandardAIProps {
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
    handlePlaceChargeField?: (hex: Hex) => void
    handlePlaceCollectorDrone?: (hex: Hex) => void
    handleUseSpareBattery: () => void
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

export const useStandardAI = (props: UseStandardAIProps) => {
  const {
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
  } = props

  const { addLog } = useDebug()

  const evaluateAndChooseAction = useCallback((): ConcreteAiAction | null => {
    const {
      player,
      enemies,
      hexes,
      currentEnergy,
      maxEnergy,
      playerActionsRemaining,
      armamentLevels,
      spareBatteriesCount,
      placedEmpTraps,
      placedBarricades,
      placedChargeFields,
      placedCollectorDrones,
      activeBuffs,
      gamePhase,
      score: initialScoreForEval,
    } = gameState

    const {
      movableHexIds,
      empTrapPlacementTargetHexIds,
      barricadePlacementTargetHexIds,
      chargeFieldPlacementTargetHexIds,
      collectorDronePlacementTargetHexIds,
    } = selectors

    if (!player || playerActionsRemaining <= 0) return null

    let possibleActions: ConcreteAiAction[] = []

    // 1. Consider Moves
    movableHexIds.forEach((hexId) => {
      const hex = hexes.get(hexId)
      if (hex) {
        possibleActions.push({ type: 'MOVE', hex })
      }
    })

    // 2. Consider Using Armaments
    ;(Object.keys(armamentLevels) as ArmamentName[]).forEach((armId) => {
      if (armamentLevels[armId] > 0) {
        const stats = ARMAMENT_STATS_GETTERS[armId](armamentLevels[armId])
        if (activeBuffs.overheat.isActive && armId !== 'crash_bomb') return

        if (
          currentEnergy >= stats.energyCost ||
          (armId === 'crash_bomb' && currentEnergy >= (stats as CrashBombStats).energyCost)
        ) {
          if (armId === 'booster' && activeBuffs.boosterUsesThisTurn >= (stats as BoosterStats).usesPerTurn) return
          if (armId === 'stealth' && activeBuffs.stealth.isActive) return
          if (armId === 'jammer' && activeBuffs.jammerFieldEffect.isActive) return
          if (armId === 'crash_bomb' && activeBuffs.overheat.isActive) return

          if (armId === 'trap' && placedEmpTraps.length >= (stats as EmpTrapStats).maxCharges) return
          if (armId === 'barricade' && placedBarricades.length >= (stats as BarricadeStats).maxCharges) return
          if (
            armId === 'charge_field' &&
            placedChargeFields &&
            placedChargeFields.length >= (stats as ChargeFieldStats).maxPlaced
          )
            return
          if (
            armId === 'collector_drone' &&
            placedCollectorDrones &&
            placedCollectorDrones.length >= (stats as CollectorDroneStats).maxPlaced
          )
            return

          possibleActions.push({ type: 'USE_ARMAMENT', armamentId: armId })
        }
      }
    })

    // 3. Consider Using Spare Battery
    if (spareBatteriesCount > 0 && currentEnergy < maxEnergy && !activeBuffs.overheat.isActive) {
      possibleActions.push({ type: 'USE_SPARE_BATTERY' })
    }

    if (possibleActions.length === 0) {
      addLog({ type: 'INFO', message: '[Standard AI] No possible direct actions.' })
      return null
    }

    let bestAction: ConcreteAiAction | null = null
    let bestScore = -Infinity

    possibleActions.forEach((action) => {
      const tempState = deepCloneGameState(gameState)
      const stateAfterAction = simulatePlayerActionForAIInternal(
        tempState,
        action,
        upgradeSystem.generateUpgradeOptions
      )
      const score = scoreBoardStateForAIInternal(
        stateAfterAction,
        initialScoreForEval,
        true,
        upgradeSystem.generateUpgradeOptions
      )

      addLog({
        type: 'INFO',
        message: `[Std AI Eval] Action: ${actionToDescriptiveInternal(action).desc}, Sim Score: ${score.toFixed(0)}`,
      })

      if (score > bestScore) {
        bestScore = score
        bestAction = action
      } else if (score === bestScore && Math.random() < 0.3) {
        bestAction = action
      }
    })

    if (bestAction) {
      addLog({
        type: 'INFO',
        message: `[Std AI Chosen] Action: ${
          actionToDescriptiveInternal(bestAction).desc
        }, Best Score: ${bestScore.toFixed(0)}`,
      })
    } else {
      addLog({ type: 'INFO', message: '[Std AI] No best action found after evaluation.' })
    }

    return bestAction
  }, [gameState, selectors, upgradeSystem, addLog, t])

  useEffect(() => {
    const {
      isAiModeActive,
      isAutoMoveActive,
      isMctsAiModeActive,
      gamePhase,
      player,
      aiPlannedActionSequence,
      score: currentTurnInitialScore,
      upgradeOptions,
      hexes,
    } = gameState

    if (!isAiModeActive || isAutoMoveActive || isMctsAiModeActive || !player || aiPlannedActionSequence) {
      return
    }

    if (gamePhase === 'GameOver' || gamePhase === 'StageComplete') {
      setGameState((prev) => ({ ...prev, aiPlannedActionSequence: null }))
      return
    }

    const aiDecisionTimer = setTimeout(() => {
      if (
        !gameState.isAiModeActive ||
        gameState.isAutoMoveActive ||
        gameState.isMctsAiModeActive ||
        !gameState.player
      ) {
        setGameState((prev) => ({ ...prev, aiPlannedActionSequence: null }))
        return
      }
      setGameState((currentDecisionState) => {
        if (currentDecisionState.aiPlannedActionSequence) return currentDecisionState

        if (currentDecisionState.gamePhase === 'UpgradeSelection') {
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
            upgradeSystem.handleSelectUpgradeOption(chosenOption.id)
          } else {
            addMessage('AI_MODE_NO_UPGRADE_CHOSEN')
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
          cancelFunction?: () => void
        ): GameLogicState => {
          if (!placementTargets || placementTargets.length === 0) {
            if (cancelFunction) {
              cancelFunction()
            } else {
              return { ...currentDecisionState, gamePhase: 'PlayerTurn' as GamePhase }
            }
            return currentDecisionState
          }
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
              currentTurnInitialScore,
              false,
              upgradeSystem.generateUpgradeOptions
            )
            if (score > bestScore) {
              bestScore = score
              bestHex = targetHex
            }
          }
          if (bestHex) {
            return { ...currentDecisionState, aiPlannedActionSequence: [{ type: placementActionType, hex: bestHex }] }
          } else {
            if (cancelFunction) {
              cancelFunction()
            } else {
              return { ...currentDecisionState, gamePhase: 'PlayerTurn' as GamePhase }
            }
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
          selectors.chargeFieldPlacementTargetHexIds &&
          cancelChargeFieldPlacement
        ) {
          return handlePlacementLogic(
            selectors.chargeFieldPlacementTargetHexIds,
            'PLACE_CHARGE_FIELD_SIMULATED',
            cancelChargeFieldPlacement
          )
        }
        if (
          currentDecisionState.gamePhase === 'PlacingCollectorDrone' &&
          selectors.collectorDronePlacementTargetHexIds &&
          cancelCollectorDronePlacement
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
          upgradeSystem.handleOpenUpgradeModal()
          return currentDecisionState
        }

        const bestAction = evaluateAndChooseAction()
        if (bestAction) {
          return { ...currentDecisionState, aiPlannedActionSequence: [bestAction] }
        } else {
          addMessage('AI_MODE_NO_BEST_MOVE_STOPPING')
          return currentDecisionState
        }
      })
    }, AI_MODE_DECISION_DELAY_MS)

    return () => clearTimeout(aiDecisionTimer)
  }, [
    gameState,
    setGameState,
    addMessage,
    t,
    selectors,
    playerActions,
    upgradeSystem,
    evaluateAndChooseAction,
    cancelTrapPlacement,
    cancelBarricadePlacement,
    cancelChargeFieldPlacement,
    cancelCollectorDronePlacement,
    addLog,
  ])
}
