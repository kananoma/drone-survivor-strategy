import {
  GamePhase,
  Player,
  Enemy,
  PlacedTrap,
  PlacedBarricade,
  PlacedChargeField,
  CollectorDroneEntity,
  Hex,
  ArmamentLevels,
  ActiveArmamentBuffs,
  DataChipPickup,
  SpareBatteryPickup,
  UpgradeOption,
  Language,
  GameMode,
  StageDefinition,
  AxialCoordinates,
  WaveDefinition,
  EnemySpawnConfig,
  SimulatedDescriptiveAiAction,
  ConcreteAiAction,
  ActiveJammerFieldEffect,
  ActiveOverheatBuff,
  GameStatistics,
} from '../types'
import { DEFAULT_MAP_RADIUS, INITIAL_EXP_TO_NEXT_LEVEL, INITIAL_CURRENT_ENERGY, INITIAL_MAX_ENERGY } from '../constants'
import { STAGE_DEFINITIONS } from '../stages'

export const initialArmamentLevels: ArmamentLevels = {
  booster: 0,
  stealth: 0,
  trap: 0,
  barricade: 0,
  shockwave: 0,
  jammer: 0,
  charge_field: 0,
  collector_drone: 0,
  crash_bomb: 0,
}
export const initialActiveBuffs: ActiveArmamentBuffs = {
  stealth: { isActive: false, turnsLeft: 0 },
  boosterUsesThisTurn: 0,
  boosterActiveThisTurn: false,
  boosterActionsAvailableThisTurn: 0,
  jammerFieldEffect: { isActive: false, turnsLeft: 0, levelReductionAmount: 0 },
  overheat: { isActive: false, currentHeat: 0 },
}

// ExternalAIStates (like isAiModeActive, mctsLookaheadDepth, etc.) are managed by useAIDebugManager
// and passed into useGameLogic via props. They are not part of GameLogicState itself.

export interface GameLogicState {
  gameMode: GameMode
  currentStage: StageDefinition | null
  currentWaveIndex: number
  waveTriggerTurn: number | null

  pendingWaveSpawns: { location: AxialCoordinates; enemyConfig: EnemySpawnConfig }[] | null
  pendingSpawnLocations: AxialCoordinates[] | null
  escapePortalPosition: AxialCoordinates | null

  availableStages: StageDefinition[]
  unlockedStageIds: string[]

  gamePhase: GamePhase
  mapRadius: number
  hexes: Map<string, Hex>
  player: Player | null
  enemies: Enemy[]

  playerLevel: number
  currentExp: number
  expToNextLevel: number
  upgradePoints: number

  currentEnergy: number
  maxEnergy: number
  bonusEnergyRecoveryPerTurn: number

  armamentLevels: ArmamentLevels
  activeBuffs: ActiveArmamentBuffs

  dataChips: DataChipPickup[]
  spareBatteriesOnMap: SpareBatteryPickup[]
  placedEmpTraps: PlacedTrap[]
  placedBarricades: PlacedBarricade[]
  placedChargeFields: PlacedChargeField[]
  placedCollectorDrones: CollectorDroneEntity[]

  spareBatteriesCount: number

  score: number
  turnNumber: number
  messages: string[]
  playerActionsRemaining: number
  comboCount: number
  currentComboBaseScore: number
  defeatedEnemyThisTurnCycle: boolean
  gameStats: GameStatistics

  isProcessingEnemyTurn: boolean
  isProcessingCollectorDroneTurn: boolean

  isUpgradeSelection: boolean
  isDebugUpgradeSelection: boolean
  upgradeOptions: UpgradeOption[]
  effectiveLevelForUpgradeContext?: number

  aiPlannedActionSequence: ConcreteAiAction[] | null

  // Heatmap visibility states
  isDangerMapVisible: boolean
  isObserverCountMapVisible: boolean

  showLevelUpBanner: boolean

  // Effects
  showShockwaveEffectAt: AxialCoordinates | null
  showJammerEffectAt: AxialCoordinates | null
  showChargeFieldPlacementEffectAt: AxialCoordinates | null
  showChargeFieldRecoveryEffectAt: AxialCoordinates | null
  showCollectorDronePlacementEffectAt: AxialCoordinates | null
  showCrashBombEffect: boolean
}

export const getInitialGameState = (initialLanguage: Language): GameLogicState => {
  const allStageIds = STAGE_DEFINITIONS.map((s) => s.id)
  return {
    gameMode: 'pre_game_selection',
    currentStage: null,
    currentWaveIndex: 0,
    waveTriggerTurn: null,
    pendingWaveSpawns: null,
    pendingSpawnLocations: null,
    escapePortalPosition: null,

    availableStages: STAGE_DEFINITIONS,
    unlockedStageIds: allStageIds,

    gamePhase: 'PreGameSelection',
    mapRadius: DEFAULT_MAP_RADIUS,
    hexes: new Map<string, Hex>(),
    player: null,
    enemies: [],

    playerLevel: 1,
    currentExp: 0,
    expToNextLevel: INITIAL_EXP_TO_NEXT_LEVEL,
    upgradePoints: 0,

    currentEnergy: INITIAL_CURRENT_ENERGY,
    maxEnergy: INITIAL_MAX_ENERGY,
    bonusEnergyRecoveryPerTurn: 0,

    armamentLevels: { ...initialArmamentLevels },
    activeBuffs: {
      ...initialActiveBuffs,
      stealth: { ...initialActiveBuffs.stealth },
      jammerFieldEffect: { ...initialActiveBuffs.jammerFieldEffect },
      overheat: { ...initialActiveBuffs.overheat },
    },

    dataChips: [],
    spareBatteriesOnMap: [],
    placedEmpTraps: [],
    placedBarricades: [],
    placedChargeFields: [],
    placedCollectorDrones: [],

    spareBatteriesCount: 0,

    score: 0,
    turnNumber: 0,
    messages: [],
    playerActionsRemaining: 1,
    comboCount: 0,
    currentComboBaseScore: 0,
    defeatedEnemyThisTurnCycle: false,
    gameStats: {
      enemiesDefeatedByType: {},
      maxCombo: 0,
      armamentsUsedCount: {},
      dataChipsCollected: 0,
      spareBatteriesCollected: 0,
      spareBatteriesUsed: 0,
      scoreHistory: [{ turn: 0, score: 0 }],
    },

    isProcessingEnemyTurn: false,
    isProcessingCollectorDroneTurn: false,

    isUpgradeSelection: false,
    isDebugUpgradeSelection: false,
    upgradeOptions: [],
    effectiveLevelForUpgradeContext: undefined,

    aiPlannedActionSequence: null,

    isDangerMapVisible: false,
    isObserverCountMapVisible: false,

    showLevelUpBanner: false,

    showShockwaveEffectAt: null,
    showJammerEffectAt: null,
    showChargeFieldPlacementEffectAt: null,
    showChargeFieldRecoveryEffectAt: null,
    showCollectorDronePlacementEffectAt: null,
    showCrashBombEffect: false,
  }
}

// Deep Clone Utility
export const deepCloneGameState = (stateToClone: GameLogicState): GameLogicState => {
  const stringified = JSON.stringify({
    ...stateToClone,
    hexes: Array.from(stateToClone.hexes.entries()),
  })

  const parsed = JSON.parse(stringified)

  const reconstructedState: GameLogicState = {
    ...parsed,
    hexes: new Map<string, Hex>(parsed.hexes as [string, Hex][]),
    enemies: parsed.enemies as Enemy[],
    dataChips: parsed.dataChips as DataChipPickup[],
    spareBatteriesOnMap: parsed.spareBatteriesOnMap as SpareBatteryPickup[],
    placedEmpTraps: parsed.placedEmpTraps as PlacedTrap[],
    placedBarricades: parsed.placedBarricades as PlacedBarricade[],
    placedChargeFields: parsed.placedChargeFields as PlacedChargeField[],
    placedCollectorDrones: parsed.placedCollectorDrones as CollectorDroneEntity[],
    upgradeOptions: parsed.upgradeOptions as UpgradeOption[],
    player: parsed.player ? (parsed.player as Player) : null,
    activeBuffs: parsed.activeBuffs,
    armamentLevels: parsed.armamentLevels,
    messages: parsed.messages as string[],
    gameStats: parsed.gameStats as GameStatistics,
    pendingSpawnLocations: parsed.pendingSpawnLocations ? (parsed.pendingSpawnLocations as AxialCoordinates[]) : null,
    pendingWaveSpawns: parsed.pendingWaveSpawns
      ? (parsed.pendingWaveSpawns as { location: AxialCoordinates; enemyConfig: EnemySpawnConfig }[])
      : null,
    aiPlannedActionSequence: parsed.aiPlannedActionSequence
      ? (parsed.aiPlannedActionSequence as ConcreteAiAction[])
      : null,
    availableStages: parsed.availableStages as StageDefinition[],
    unlockedStageIds: parsed.unlockedStageIds as string[],
  }

  if (parsed.currentStage) {
    reconstructedState.currentStage = {
      ...parsed.currentStage,
      waves: (parsed.currentStage.waves || []) as StageDefinition['waves'],
      itemSpawns: (parsed.currentStage.itemSpawns || []) as StageDefinition['itemSpawns'],
    } as StageDefinition
  } else {
    reconstructedState.currentStage = null
  }

  return reconstructedState
}
