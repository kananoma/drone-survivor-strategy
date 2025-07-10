import { useState, useCallback, useEffect, useMemo } from 'react'
import { GameLogicState, getInitialGameState, deepCloneGameState } from '../../gameLogic/initialState'
import {
  GamePhase,
  Language,
  ArmamentName,
  Hex,
  UpgradeOption,
  Player,
  Enemy,
  AxialCoordinates,
  BoosterStats,
  StealthStats,
  EmpTrapStats,
  BarricadeStats,
  DataChipPickup,
  SpareBatteryPickup,
  PlacedTrap,
  PlacedBarricade,
  PlacedChargeField,
  ConcreteAiAction,
  SimulatedDescriptiveAiAction,
  GameMode,
  ShockwaveStats,
  JammerStats,
  CrashBombStats,
  ChargeFieldStats,
  CollectorDroneStats,
} from '../../types'
import { AIDebugControls } from '../useAIDebugManager'
import { useDebug } from '../../contexts/DebugContext'
import {
  ARMAMENT_STATS_GETTERS,
  SPARE_BATTERY_CONFIG,
  DATA_CHIP_CONFIG,
  ENEMY_XP_VALUES,
  INITIAL_ENERGY_RECOVERY_PER_TURN,
  MAX_DANGER_FOR_COLOR_SCALE,
  LEVEL_EXP_SCALING_FACTOR,
  MAX_REWIND_HISTORY_SIZE,
  COLLECTOR_DRONE_PLACEMENT_EFFECT_DURATION_MS,
  AI_MODE_DECISION_DELAY_MS,
  SHOCKWAVE_EFFECT_DURATION_MS,
  JAMMER_EFFECT_DURATION_MS,
  CHARGE_FIELD_PLACEMENT_EFFECT_DURATION_MS,
  CRASH_BOMB_EFFECT_DURATION_MS,
  MAX_HEAT_CRASH_BOMB,
} from '../../constants'
import { actionToDescriptiveInternal } from './subHooks/useGameSimulation'

import { useGameMessages } from './useGameMessages'
import { useGameInitialization } from './useGameInitialization'
import { useGameSelectors } from './useGameSelectors'
import { useUpgradeSystem } from './useUpgradeSystem'
import { usePlayerActions } from './usePlayerActions'
import { useSpawnAndStageHelpers } from './useSpawnAndStageHelpers'
import { useTurnProcessor } from './useTurnProcessor'
import { useGameEffects } from './useGameEffects'

// AI Logic Hooks
import { useStandardAI } from './subHooks/useStandardAI'
import { useMCTS_AI } from './subHooks/useMCTS_AI'
import { useAutoMove } from './subHooks/useAutoMove'

interface UseGameLogicProps {
  initialLanguage: Language
  t: (key: string, params?: Record<string, string | number>) => string
  onLevelUpBannerShow: () => void
  aiStates: AIDebugControls
}

const LOCALSTORAGE_KEY_DANGER_MAP = 'droneEscape_isDangerMapVisible'
const LOCALSTORAGE_KEY_OBSERVER_MAP = 'droneEscape_isObserverCountMapVisible'

export const useGameLogic = ({ initialLanguage, t, onLevelUpBannerShow, aiStates }: UseGameLogicProps) => {
  const [gameState, setGameState] = useState<GameLogicState>(() => {
    const baseState = getInitialGameState(initialLanguage)
    try {
      const storedDangerMap = localStorage.getItem(LOCALSTORAGE_KEY_DANGER_MAP)
      if (storedDangerMap !== null) {
        baseState.isDangerMapVisible = JSON.parse(storedDangerMap)
      }
      const storedObserverMap = localStorage.getItem(LOCALSTORAGE_KEY_OBSERVER_MAP)
      if (storedObserverMap !== null) {
        baseState.isObserverCountMapVisible = JSON.parse(storedObserverMap)
      }
    } catch (error) {
      console.error('Error reading overlay visibility from localStorage', error)
    }
    if (baseState.isDangerMapVisible && baseState.isObserverCountMapVisible) {
      baseState.isObserverCountMapVisible = false
    }
    return baseState
  })
  const { addLog } = useDebug()
  const [previousTurnStates, setPreviousTurnStates] = useState<GameLogicState[]>([])
  const [selectedArmament, setSelectedArmament] = useState<ArmamentName | null>(null)

  const { addMessage } = useGameMessages(setGameState, t)

  const saveStateForRewind = useCallback(
    (stateToSave: GameLogicState) => {
      setPreviousTurnStates((prevHistory) => {
        const newHistoryBase = prevHistory.filter((histState) => histState.turnNumber < stateToSave.turnNumber)
        const newHistoryWithCurrentSave = [...newHistoryBase, deepCloneGameState(stateToSave)]

        if (newHistoryWithCurrentSave.length > MAX_REWIND_HISTORY_SIZE) {
          return newHistoryWithCurrentSave.slice(newHistoryWithCurrentSave.length - MAX_REWIND_HISTORY_SIZE)
        }
        return newHistoryWithCurrentSave
      })
    },
    [setPreviousTurnStates]
  )

  const gameInitializer = useGameInitialization(setGameState, addMessage, t, initialLanguage, saveStateForRewind)

  const returnToMenu = useCallback(() => {
    setGameState(getInitialGameState(initialLanguage))
  }, [setGameState, initialLanguage])

  const clearRewindHistoryAndInitialize = useCallback(
    (mode: GameMode, options: { radius?: number; stageId?: string }) => {
      setPreviousTurnStates([])
      gameInitializer.initializeGame(mode, options)
      setGameState((prev) => {
        let newIsDangerMapVisible = prev.isDangerMapVisible
        let newIsObserverCountMapVisible = prev.isObserverCountMapVisible
        try {
          const storedDangerMap = localStorage.getItem(LOCALSTORAGE_KEY_DANGER_MAP)
          if (storedDangerMap !== null) newIsDangerMapVisible = JSON.parse(storedDangerMap)

          const storedObserverMap = localStorage.getItem(LOCALSTORAGE_KEY_OBSERVER_MAP)
          if (storedObserverMap !== null) newIsObserverCountMapVisible = JSON.parse(storedObserverMap)
        } catch (e) {
          console.error('Error re-applying overlay visibility from localStorage after init', e)
        }

        if (newIsDangerMapVisible && newIsObserverCountMapVisible) newIsObserverCountMapVisible = false

        return {
          ...prev,
          isDangerMapVisible: newIsDangerMapVisible,
          isObserverCountMapVisible: newIsObserverCountMapVisible,
        }
      })
    },
    [gameInitializer, setPreviousTurnStates, setGameState]
  )

  const selectors = useGameSelectors(gameState)
  const upgradeSystem = useUpgradeSystem(gameState, setGameState, addMessage, t, addLog)

  const handleExperienceGain = useCallback(
    (currentExp: number, playerLevel: number, expToNextLevel: number, upgradePoints: number, amount: number) => {
      if (amount <= 0) {
        return { currentExp, playerLevel, expToNextLevel, upgradePoints, showLevelUpBanner: false }
      }
      let newCurrentExp = currentExp + amount
      let newPlayerLevel = playerLevel
      let newExpToNextLevel = expToNextLevel
      let newUpgradePoints = upgradePoints
      let leveledUp = false

      while (newCurrentExp >= newExpToNextLevel) {
        newCurrentExp -= newExpToNextLevel
        newPlayerLevel++
        newExpToNextLevel = Math.floor(newExpToNextLevel * LEVEL_EXP_SCALING_FACTOR)
        newUpgradePoints++
        leveledUp = true
      }
      return {
        currentExp: newCurrentExp,
        playerLevel: newPlayerLevel,
        expToNextLevel: newExpToNextLevel,
        upgradePoints: newUpgradePoints,
        showLevelUpBanner: leveledUp,
      }
    },
    []
  )

  const playerActionDeps = {
    movableHexIds: selectors.movableHexIds,
    empTrapPlacementTargetHexIds: selectors.empTrapPlacementTargetHexIds,
    barricadePlacementTargetHexIds: selectors.barricadePlacementTargetHexIds,
    chargeFieldPlacementTargetHexIds: selectors.chargeFieldPlacementTargetHexIds,
    collectorDronePlacementTargetHexIds: selectors.collectorDronePlacementTargetHexIds,
    addMessage,
    addLog,
    t,
    handleExperienceGain,
    selectedArmament,
  }
  const playerActions = usePlayerActions(gameState, setGameState, playerActionDeps)
  const spawnHelpers = useSpawnAndStageHelpers(t, addLog)
  const { processCollectorDroneActions, processEnemyTurns } = useTurnProcessor(
    gameState,
    setGameState,
    addMessage,
    t,
    addLog,
    spawnHelpers,
    selectors.targetEnemyCount,
    saveStateForRewind,
    handleExperienceGain
  )

  useGameEffects(gameState, setGameState, processCollectorDroneActions, processEnemyTurns)

  useEffect(() => {
    if (gameState.showLevelUpBanner) {
      addMessage('MESSAGE_SYSTEM_INTEGRITY_IMPROVED', { playerLevel: gameState.playerLevel })
      onLevelUpBannerShow()
      setGameState((prev) => ({ ...prev, showLevelUpBanner: false }))
    }
  }, [gameState.showLevelUpBanner, gameState.playerLevel, addMessage, onLevelUpBannerShow, setGameState])

  useEffect(() => {
    if (!aiStates.isAiModeActive && !aiStates.isMctsAiModeActive && !aiStates.isAutoMoveActive) {
      if (gameState.aiPlannedActionSequence) {
        setGameState((prev) => ({ ...prev, aiPlannedActionSequence: null }))
      }
    }
  }, [
    aiStates.isAiModeActive,
    aiStates.isMctsAiModeActive,
    aiStates.isAutoMoveActive,
    gameState.aiPlannedActionSequence,
    setGameState,
  ])

  const cancelUpgradeSelection = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isUpgradeSelection: false,
      isDebugUpgradeSelection: false,
      upgradeOptions: [],
      gamePhase: 'PlayerTurn',
      effectiveLevelForUpgradeContext: undefined,
      aiPlannedActionSequence: null,
    }))
    addMessage('MESSAGE_UPGRADE_CANCELLED')
  }, [setGameState, addMessage])

  const cancelTrapPlacement = useCallback(() => {
    setGameState((prev) => ({ ...prev, gamePhase: 'PlayerTurn', aiPlannedActionSequence: null }))
    setSelectedArmament(null)
    addMessage('MESSAGE_TRAP_PLACEMENT_CANCELLED')
  }, [setGameState, addMessage])

  const cancelBarricadePlacement = useCallback(() => {
    setGameState((prev) => ({ ...prev, gamePhase: 'PlayerTurn', aiPlannedActionSequence: null }))
    setSelectedArmament(null)
    addMessage('MESSAGE_BARRICADE_PLACEMENT_CANCELLED')
  }, [setGameState, addMessage])

  const cancelChargeFieldPlacement = useCallback(() => {
    setGameState((prev) => ({ ...prev, gamePhase: 'PlayerTurn', aiPlannedActionSequence: null }))
    setSelectedArmament(null)
    addMessage('MESSAGE_CHARGE_FIELD_PLACEMENT_CANCELLED')
  }, [setGameState, addMessage])

  const cancelCollectorDronePlacement = useCallback(() => {
    setGameState((prev) => ({ ...prev, gamePhase: 'PlayerTurn', aiPlannedActionSequence: null }))
    setSelectedArmament(null)
    addMessage('MESSAGE_COLLECTOR_DRONE_PLACEMENT_CANCELLED')
  }, [setGameState, addMessage])

  const cancelArmamentSelection = useCallback(() => {
    if (gameState.gamePhase === 'PlacingEmpTrap') {
      cancelTrapPlacement()
    } else if (gameState.gamePhase === 'PlacingBarricade') {
      cancelBarricadePlacement()
    } else if (gameState.gamePhase === 'PlacingChargeField') {
      cancelChargeFieldPlacement()
    } else if (gameState.gamePhase === 'PlacingCollectorDrone') {
      cancelCollectorDronePlacement()
    } else {
      // For instant-use items that were selected but not activated
      setSelectedArmament(null)
    }
  }, [
    gameState.gamePhase,
    cancelTrapPlacement,
    cancelBarricadePlacement,
    cancelChargeFieldPlacement,
    cancelCollectorDronePlacement,
  ])

  const activateInstantArmament = useCallback(
    (armamentId: ArmamentName) => {
      playerActions.handleUseArmament(armamentId)
      setSelectedArmament(null)
    },
    [playerActions]
  )

  const handleSelectArmament = useCallback(
    (armamentId: ArmamentName) => {
      // If clicking the same armament, cancel it.
      if (selectedArmament === armamentId) {
        cancelArmamentSelection()
        return
      }

      // Always reset previous state before selecting a new one to prevent bugs
      if (selectedArmament || gameState.gamePhase.startsWith('Placing')) {
        cancelArmamentSelection()
      }

      const stats = ARMAMENT_STATS_GETTERS[armamentId](gameState.armamentLevels[armamentId])
      const armamentTitle = t(stats.titleKey)
      const energyCost = stats.energyCost

      // --- Precondition Checks ---
      if (gameState.gamePhase !== 'PlayerTurn' && gameState.gamePhase !== 'Playing') {
        addMessage('MESSAGE_CANNOT_ACTIVATE_ARMAMENT_NOW')
        return
      }
      if (gameState.activeBuffs.overheat.isActive && armamentId !== 'crash_bomb') {
        addMessage('MESSAGE_OVERHEAT_ARMAMENTS_DISABLED')
        return
      }
      if (energyCost > gameState.currentEnergy && armamentId !== 'crash_bomb') {
        addMessage('MESSAGE_NOT_ENOUGH_ENERGY_FOR_ARMAMENT', {
          armamentName: armamentTitle,
          cost: energyCost,
          currentEnergy: gameState.currentEnergy,
        })
        return
      }
      if (armamentId === 'crash_bomb' && gameState.currentEnergy < (stats as CrashBombStats).energyCost) {
        addMessage('MESSAGE_NOT_ENOUGH_ENERGY_FOR_ARMAMENT', {
          armamentName: armamentTitle,
          cost: (stats as CrashBombStats).energyCost,
          currentEnergy: gameState.currentEnergy,
        })
        return
      }

      const isInstantUse = ['booster', 'stealth', 'shockwave', 'jammer', 'crash_bomb'].includes(armamentId)

      if (!isInstantUse && gameState.playerActionsRemaining <= 0) {
        addMessage('INFO_NO_ACTIONS')
        return
      }

      if (armamentId === 'trap' && gameState.placedEmpTraps.length >= (stats as EmpTrapStats).maxCharges) {
        addMessage('MESSAGE_CANNOT_DEPLOY_MORE_TRAPS')
        return
      }
      if (armamentId === 'barricade' && gameState.placedBarricades.length >= (stats as BarricadeStats).maxCharges) {
        addMessage('MESSAGE_CANNOT_DEPLOY_MORE_BARRICADES')
        return
      }
      if (
        armamentId === 'charge_field' &&
        gameState.placedChargeFields.length >= (stats as ChargeFieldStats).maxPlaced
      ) {
        addMessage('MESSAGE_CANNOT_DEPLOY_MORE_CHARGE_FIELDS')
        return
      }
      if (
        armamentId === 'collector_drone' &&
        gameState.placedCollectorDrones.length >= (stats as CollectorDroneStats).maxPlaced
      ) {
        addMessage('MESSAGE_CANNOT_DEPLOY_MORE_COLLECTOR_DRONES')
        return
      }

      if (
        armamentId === 'booster' &&
        gameState.activeBuffs.boosterUsesThisTurn >= (stats as BoosterStats).usesPerTurn
      ) {
        addMessage('MESSAGE_BOOSTER_MAX_USES_REACHED', { usesPerTurn: (stats as BoosterStats).usesPerTurn })
        return
      }
      if (armamentId === 'stealth' && gameState.activeBuffs.stealth.isActive) {
        addMessage('MESSAGE_STEALTH_ALREADY_ACTIVE')
        return
      }
      if (armamentId === 'jammer' && gameState.activeBuffs.jammerFieldEffect.isActive) {
        return
      }
      if (armamentId === 'crash_bomb' && gameState.activeBuffs.overheat.isActive) {
        return
      }

      // --- Set Selection State ---
      setSelectedArmament(armamentId)

      if (!isInstantUse) {
        // It's a placement item. Set the corresponding game phase.
        let phase: GamePhase = 'PlayerTurn'
        if (armamentId === 'trap') phase = 'PlacingEmpTrap'
        else if (armamentId === 'barricade') phase = 'PlacingBarricade'
        else if (armamentId === 'charge_field') phase = 'PlacingChargeField'
        else if (armamentId === 'collector_drone') phase = 'PlacingCollectorDrone'

        setGameState((prev) => ({ ...prev, gamePhase: phase }))
        addMessage(`${armamentId.toUpperCase()}_INITIATING`, { cost: energyCost })
      }
      // For instant-use items, we just set `selectedArmament` and the phase remains PlayerTurn.
    },
    [selectedArmament, gameState, addMessage, t, cancelArmamentSelection]
  )

  const handlePlaceEmpTrap = useCallback(
    (hex: Hex) => {
      playerActions.handlePlaceEmpTrap(hex)
      setSelectedArmament(null)
    },
    [playerActions]
  )
  const handlePlaceBarricade = useCallback(
    (hex: Hex) => {
      playerActions.handlePlaceBarricade(hex)
      setSelectedArmament(null)
    },
    [playerActions]
  )
  const handlePlaceChargeField = useCallback(
    (hex: Hex) => {
      playerActions.handlePlaceChargeField(hex)
      setSelectedArmament(null)
    },
    [playerActions]
  )
  const handlePlaceCollectorDrone = useCallback(
    (hex: Hex) => {
      playerActions.handlePlaceCollectorDrone(hex)
      setSelectedArmament(null)
    },
    [playerActions]
  )

  const handleRestoreEnergyDebug = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      currentEnergy: prev.maxEnergy,
    }))
    addLog({ type: 'INFO', message: 'DEBUG: Player energy restored to maximum.' })
    addMessage('DEBUG_MESSAGE_ENERGY_RESTORED')
  }, [setGameState, addLog, addMessage])

  const handleRewindToPreviousTurnDebug = useCallback(() => {
    const currentTurn = gameState.turnNumber
    const targetTurnToRestore = currentTurn - 1

    if (targetTurnToRestore < 1 && gameState.gamePhase !== 'GameOver') {
      addLog({ type: 'INFO', message: 'DEBUG: Rewind skipped, cannot rewind before turn 1 unless game over.' })
      return
    }

    const targetRewindTurnNumber =
      gameState.gamePhase === 'GameOver' && targetTurnToRestore < 1 ? 1 : targetTurnToRestore

    const stateEntryToRestore = previousTurnStates.find((histState) => histState.turnNumber === targetRewindTurnNumber)

    if (!stateEntryToRestore) {
      addLog({
        type: 'INFO',
        message: `DEBUG: Rewind failed, no state found for turn ${targetRewindTurnNumber}. History size: ${previousTurnStates.length}`,
      })
      if (previousTurnStates.length > 0) {
        addLog({ type: 'INFO', message: `History turns: ${previousTurnStates.map((s) => s.turnNumber).join(', ')}` })
      }
      return
    }

    const clonedStateToRestore = deepCloneGameState(stateEntryToRestore)

    const restoredStateCleaned: GameLogicState = {
      ...clonedStateToRestore,
      aiPlannedActionSequence: null,
      isProcessingEnemyTurn: false,
      isProcessingCollectorDroneTurn: false,
      gamePhase: 'PlayerTurn',
      showShockwaveEffectAt: null,
      showJammerEffectAt: null,
      showChargeFieldPlacementEffectAt: null,
      showChargeFieldRecoveryEffectAt: null,
      showCollectorDronePlacementEffectAt: null,
      showCrashBombEffect: false,
    }

    setGameState(restoredStateCleaned)
    addMessage('DEBUG_MESSAGE_REWIND_SUCCESSFUL', { turn: restoredStateCleaned.turnNumber })
    addLog({
      type: 'INFO',
      message: `DEBUG: Rewound to start of turn ${restoredStateCleaned.turnNumber}. History size: ${previousTurnStates.length}`,
    })
  }, [previousTurnStates, gameState.turnNumber, gameState.gamePhase, addMessage, addLog, setGameState])

  const canRewind = useMemo(() => {
    if (gameState.turnNumber <= 1 && gameState.gamePhase !== 'GameOver') return false
    if (gameState.gamePhase === 'GameOver') {
      const targetRewindTurn = gameState.turnNumber === 1 ? 1 : gameState.turnNumber - 1
      return previousTurnStates.some((s) => s.turnNumber === targetRewindTurn)
    }
    return previousTurnStates.some((s) => s.turnNumber === gameState.turnNumber - 1)
  }, [gameState.turnNumber, gameState.gamePhase, previousTurnStates])

  const toggleDangerMap = useCallback(() => {
    setGameState((prev) => {
      const newIsDangerMapVisible = !prev.isDangerMapVisible
      localStorage.setItem(LOCALSTORAGE_KEY_DANGER_MAP, JSON.stringify(newIsDangerMapVisible))
      if (newIsDangerMapVisible && prev.isObserverCountMapVisible) {
        localStorage.setItem(LOCALSTORAGE_KEY_OBSERVER_MAP, JSON.stringify(false))
        return { ...prev, isDangerMapVisible: true, isObserverCountMapVisible: false }
      }
      return { ...prev, isDangerMapVisible: newIsDangerMapVisible }
    })
  }, [setGameState])

  const toggleObserverCountMap = useCallback(() => {
    setGameState((prev) => {
      const newIsObserverCountMapVisible = !prev.isObserverCountMapVisible
      localStorage.setItem(LOCALSTORAGE_KEY_OBSERVER_MAP, JSON.stringify(newIsObserverCountMapVisible))
      if (newIsObserverCountMapVisible && prev.isDangerMapVisible) {
        localStorage.setItem(LOCALSTORAGE_KEY_DANGER_MAP, JSON.stringify(false))
        return { ...prev, isObserverCountMapVisible: true, isDangerMapVisible: false }
      }
      return { ...prev, isObserverCountMapVisible: newIsObserverCountMapVisible }
    })
  }, [setGameState])

  const executeConcreteAiAction = useCallback(
    (action: ConcreteAiAction) => {
      addLog({ type: 'INFO', message: `AI Executing (from plan): ${actionToDescriptiveInternal(action).desc}` })
      switch (action.type) {
        case 'MOVE':
          playerActions.handlePlayerMove(action.hex)
          break
        case 'USE_ARMAMENT':
          playerActions.handleUseArmament(action.armamentId)
          break
        case 'USE_SPARE_BATTERY':
          playerActions.handleUseSpareBattery()
          break
        // The detailed placement actions are handled via phase changes in the AI logic
      }
    },
    [playerActions, addLog]
  )

  useEffect(() => {
    const { gamePhase, player, aiPlannedActionSequence } = gameState
    if (!player || gamePhase === 'GameOver' || gamePhase === 'StageComplete') {
      if (aiPlannedActionSequence && aiPlannedActionSequence.length > 0) {
        setGameState((prev) => ({ ...prev, aiPlannedActionSequence: null }))
      }
      return
    }

    const activeAiMode = aiStates.isAiModeActive || aiStates.isMctsAiModeActive

    if (activeAiMode && aiPlannedActionSequence && aiPlannedActionSequence.length > 0) {
      const aiDecisionTimer = setTimeout(() => {
        setGameState((currentDecisionState) => {
          if (
            !(aiStates.isAiModeActive || aiStates.isMctsAiModeActive) ||
            !currentDecisionState.aiPlannedActionSequence ||
            currentDecisionState.aiPlannedActionSequence.length === 0
          ) {
            return currentDecisionState
          }

          const nextActionInPlan = currentDecisionState.aiPlannedActionSequence[0]
          let canExecuteNextAction = false

          if (
            nextActionInPlan.type === 'MOVE' &&
            (currentDecisionState.gamePhase === 'PlayerTurn' || currentDecisionState.gamePhase === 'Playing')
          )
            canExecuteNextAction = true
          else if (
            nextActionInPlan.type === 'USE_ARMAMENT' &&
            (currentDecisionState.gamePhase === 'PlayerTurn' || currentDecisionState.gamePhase === 'Playing')
          )
            canExecuteNextAction = true
          else if (
            nextActionInPlan.type === 'USE_SPARE_BATTERY' &&
            (currentDecisionState.gamePhase === 'PlayerTurn' || currentDecisionState.gamePhase === 'Playing')
          )
            canExecuteNextAction = true
          else if (
            nextActionInPlan.type === 'PLACE_TRAP_SIMULATED' &&
            currentDecisionState.gamePhase === 'PlacingEmpTrap'
          ) {
            handlePlaceEmpTrap(nextActionInPlan.hex)
          } else if (
            nextActionInPlan.type === 'PLACE_BARRICADE_SIMULATED' &&
            currentDecisionState.gamePhase === 'PlacingBarricade'
          ) {
            handlePlaceBarricade(nextActionInPlan.hex)
          } else if (
            nextActionInPlan.type === 'PLACE_CHARGE_FIELD_SIMULATED' &&
            currentDecisionState.gamePhase === 'PlacingChargeField'
          ) {
            handlePlaceChargeField(nextActionInPlan.hex)
          } else if (
            nextActionInPlan.type === 'PLACE_COLLECTOR_DRONE_SIMULATED' &&
            currentDecisionState.gamePhase === 'PlacingCollectorDrone'
          ) {
            handlePlaceCollectorDrone(nextActionInPlan.hex)
          }

          if (canExecuteNextAction) {
            executeConcreteAiAction(nextActionInPlan)
          }

          const remainingPlan = currentDecisionState.aiPlannedActionSequence.slice(1)
          return { ...currentDecisionState, aiPlannedActionSequence: remainingPlan.length > 0 ? remainingPlan : null }
        })
      }, AI_MODE_DECISION_DELAY_MS)
      return () => clearTimeout(aiDecisionTimer)
    }
  }, [
    gameState.gamePhase,
    gameState.player,
    gameState.aiPlannedActionSequence,
    aiStates.isAiModeActive,
    aiStates.isMctsAiModeActive,
    executeConcreteAiAction,
    handlePlaceEmpTrap,
    handlePlaceBarricade,
    handlePlaceChargeField,
    handlePlaceCollectorDrone,
    setGameState,
  ])

  useAutoMove({ gameState: { ...gameState, ...aiStates }, setGameState, addMessage, selectors, playerActions })
  useStandardAI({
    gameState: { ...gameState, ...aiStates },
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
  })
  useMCTS_AI({
    gameState: { ...gameState, ...aiStates },
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
  })

  return {
    ...gameState,
    selectedArmament,

    initializeGame: clearRewindHistoryAndInitialize,
    returnToMenu,

    movableHexIds: selectors.movableHexIds,
    empTrapPlacementTargetHexIds: selectors.empTrapPlacementTargetHexIds,
    barricadePlacementTargetHexIds: selectors.barricadePlacementTargetHexIds,
    chargeFieldPlacementTargetHexIds: selectors.chargeFieldPlacementTargetHexIds,
    collectorDronePlacementTargetHexIds: selectors.collectorDronePlacementTargetHexIds,
    targetEnemyCount: selectors.targetEnemyCount,

    handlePlayerMove: playerActions.handlePlayerMove,
    handleUseArmament: playerActions.handleUseArmament,
    handleSelectArmament,
    handlePlaceEmpTrap,
    handlePlaceBarricade,
    handlePlaceChargeField,
    handlePlaceCollectorDrone,
    handleUseSpareBattery: playerActions.handleUseSpareBattery,

    handleOpenUpgradeModal: upgradeSystem.handleOpenUpgradeModal,
    handleOpenDebugUpgradeModal: upgradeSystem.handleOpenDebugUpgradeModal,
    handleSelectUpgradeOption: upgradeSystem.handleSelectUpgradeOption,

    cancelUpgradeSelection,
    cancelArmamentSelection,
    activateInstantArmament,

    handleRestoreEnergyDebug,
    handleRewindToPreviousTurnDebug,
    canRewind,
    toggleDangerMap,
    toggleObserverCountMap,
  }
}
