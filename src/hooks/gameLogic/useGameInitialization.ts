import { useCallback } from 'react'
import { GameLogicState, getInitialGameState, deepCloneGameState } from '../../gameLogic/initialState'
import { GameMode, Player, Hex, StageDefinition, AxialCoordinates, Language, GamePhase } from '../../types'
import { DEFAULT_MAP_RADIUS } from '../../constants'
import { generateHexMap, axialToId } from '../../utils/hexUtils'
import { STAGE_DEFINITIONS } from '../../stages'

export const useGameInitialization = (
  setGameState: React.Dispatch<React.SetStateAction<GameLogicState>>,
  addMessage: (msgKey: string, params?: Record<string, string | number>) => void,
  t: (key: string, params?: Record<string, string | number>) => string,
  initialLanguage: Language,
  saveStateForRewind: (state: GameLogicState) => void
) => {
  const initializeGame = useCallback(
    (mode: GameMode, options: { radius?: number; stageId?: string }) => {
      const freshInitialState = getInitialGameState(initialLanguage)
      let newHexes: Map<string, Hex>
      let newPlayer: Player | null = null
      let newMapRadius = DEFAULT_MAP_RADIUS
      let newCurrentStage: StageDefinition | null = null
      let initialWaveIndex = 0
      let initialWaveTrigger: number | null = null

      if (mode === 'endless') {
        newMapRadius = options.radius || DEFAULT_MAP_RADIUS
        newHexes = generateHexMap(newMapRadius)
        const playerStartCoords: AxialCoordinates = { q: 0, r: 0 }
        newPlayer = { id: 'player_drone', q: playerStartCoords.q, r: playerStartCoords.r }
      } else if (mode === 'stage' && options.stageId) {
        const stageDef = STAGE_DEFINITIONS.find((s) => s.id === options.stageId)
        if (!stageDef) {
          addMessage('MESSAGE_CRITICAL_ERROR_STAGE_NOT_FOUND', { stageId: options.stageId })
          setGameState((prev) => ({ ...prev, gameMode: 'pre_game_selection', gamePhase: 'PreGameSelection' }))
          return
        }
        newCurrentStage = {
          ...stageDef,
          waves: stageDef.waves.map((wave) => ({ ...wave, warningShown: false })),
          itemSpawns: stageDef.itemSpawns ? [...stageDef.itemSpawns] : undefined,
        }
        newMapRadius = newCurrentStage.mapRadius
        newHexes = generateHexMap(newMapRadius)
        const playerStartCoords: AxialCoordinates = { q: 0, r: 0 }
        newPlayer = { id: 'player_drone', q: playerStartCoords.q, r: playerStartCoords.r }
        if (newCurrentStage.waves.length > 0) {
          initialWaveTrigger = newCurrentStage.waves[0].triggerTurn
        }
      } else {
        addMessage('MESSAGE_CRITICAL_ERROR_INVALID_GAME_START')
        setGameState((prev) => ({ ...prev, gameMode: 'pre_game_selection', gamePhase: 'PreGameSelection' }))
        return
      }

      if (!newPlayer || !newHexes.has(axialToId(newPlayer.q, newPlayer.r))) {
        addMessage('MESSAGE_CRITICAL_ERROR_CENTER_HEX')
        setGameState((prev) => ({ ...prev, gameMode: 'pre_game_selection', gamePhase: 'PreGameSelection' }))
        return
      }

      const stateToSetForInitialization: GameLogicState = {
        ...freshInitialState,
        gameMode: mode,
        currentStage: newCurrentStage,
        currentWaveIndex: initialWaveIndex,
        waveTriggerTurn: initialWaveTrigger,
        pendingWaveSpawns: null,
        pendingSpawnLocations: null,
        mapRadius: newMapRadius,
        hexes: newHexes,
        player: newPlayer,
        gamePhase: 'PlayerTurn',
        turnNumber: 1,
        // Enemies are not initialized here directly anymore, they are spawned by turn processor.
        // Initial enemy setup, if any for specific scenarios, would need to be handled by the
        // first call to processEnemyTurns or a specific setup step after this.
        // For now, we ensure enemies array is empty.
        enemies: [],
        messages: [
          t(mode === 'stage' && newCurrentStage ? 'MESSAGE_STAGE_STARTED' : 'MESSAGE_DRONE_ONLINE_ACQUISITION', {
            stageName: newCurrentStage ? t(newCurrentStage.nameKey) : '',
          }),
        ],
      }

      const initialTurn1StateForHistory = deepCloneGameState(stateToSetForInitialization)
      saveStateForRewind(initialTurn1StateForHistory)

      setGameState(stateToSetForInitialization)
    },
    [setGameState, addMessage, t, initialLanguage, saveStateForRewind]
  )

  return { initializeGame }
}
