// Basic Coordinates
export interface AxialCoordinates {
  q: number
  r: number
}

export interface CubeCoordinates {
  q: number
  r: number
  s: number
}

// Hex Grid
export interface Hex extends AxialCoordinates {
  id: string
  isWall?: boolean
  dangerLevel: number
  observerCount?: number
  fillColorClass?: string
}

// Entities
export interface Player extends AxialCoordinates {
  id: string
}

export interface Enemy extends AxialCoordinates {
  id: string
  level: number
  originalLevel: number // Added: The enemy's base level before jammer effects
  sightRange: number
  scoreValue: number // This might represent the score for its originalLevel
  color: string
  isStunnedTurns: number
  isNewlySpawned?: boolean
  showStealthAvoidanceEffect?: boolean
}

export interface EnemySpawnConfig {
  typeId: string
  level: number
  q: number
  r: number
}

// Items & Traps & Placed Units
export interface PlacedTrap extends AxialCoordinates {
  id: string
}

export interface PlacedBarricade extends AxialCoordinates {
  id: string
  turnsLeft: number
}

export interface PlacedChargeField extends AxialCoordinates {
  id: string
  turnsLeft: number
  recoveryAmount: number
  effectRadius: number
}

export interface CollectorDroneEntity extends AxialCoordinates {
  id: string
  turnsLeft: number
  searchRadius: number
  targetItemId: string | null
  path: AxialCoordinates[]
}

export interface DataChipPickup extends AxialCoordinates {
  id: string
  expValue: number
  count: number // Added for stacking
}

export interface SpareBatteryPickup extends AxialCoordinates {
  id: string
  count: number // Added for stacking
}

// Game State & Phases
export type GameMode = 'pre_game_selection' | 'endless' | 'stage'

export type GamePhase =
  | 'PreGameSelection'
  | 'StartScreen'
  | 'PlayerTurn'
  | 'EnemyTurn'
  | 'CollectorDroneTurn'
  | 'Animating'
  | 'GameOver'
  | 'PlacingEmpTrap'
  | 'PlacingBarricade'
  | 'PlacingChargeField'
  | 'PlacingCollectorDrone'
  | 'UpgradeSelection'
  | 'Playing'
  | 'StageComplete'

export type Language = 'en' | 'ja'

// Armaments
export type ArmamentName =
  | 'booster'
  | 'stealth'
  | 'trap'
  | 'barricade'
  | 'shockwave'
  | 'jammer'
  | 'charge_field'
  | 'collector_drone'
  | 'crash_bomb'

export interface ArmamentLevels {
  booster: number
  stealth: number
  trap: number
  barricade: number
  shockwave: number
  jammer: number
  charge_field: number
  collector_drone: number
  crash_bomb: number
}

export interface ActiveStealthBuff {
  isActive: boolean
  turnsLeft: number
}

export interface ActiveJammerFieldEffect {
  isActive: boolean
  turnsLeft: number
  levelReductionAmount: number
}

export interface ActiveOverheatBuff {
  isActive: boolean
  currentHeat: number // Changed from turnsLeft
}

export interface ActiveArmamentBuffs {
  stealth: ActiveStealthBuff
  boosterUsesThisTurn: number
  boosterActiveThisTurn: boolean
  boosterActionsAvailableThisTurn: number
  jammerFieldEffect: ActiveJammerFieldEffect
  overheat: ActiveOverheatBuff
}

interface BaseArmamentStats {
  installed: boolean
  energyCost: number
  titleKey: string
  descriptionKey: string
  level: number
  isMaxLevel: boolean
}

export interface BoosterStats extends BaseArmamentStats {
  actionsGranted: number
  usesPerTurn: number
}

export interface StealthStats extends BaseArmamentStats {
  duration: number
  avoidanceChance: number
}

export interface EmpTrapStats extends BaseArmamentStats {
  stunDuration: number
  maxCharges: number
}

export interface BarricadeStats extends BaseArmamentStats {
  duration: number
  maxCharges: number
}

export interface ShockwaveStats extends BaseArmamentStats {
  pushDistance: number
  stunDuration: number
}

export interface JammerStats extends BaseArmamentStats {
  levelReduction: number
  duration: number
}

export interface ChargeFieldStats extends BaseArmamentStats {
  effectRadius: number
  recoveryAmount: number
  duration: number
  maxPlaced: number
}

export interface CollectorDroneStats extends BaseArmamentStats {
  searchRadius: number
  lifespan: number
  maxPlaced: number
}

export interface CrashBombStats extends BaseArmamentStats {
  maxHeat: number // New: Max heat capacity
  coolingRatePerTurn: number // New: Heat dissipation per turn
}

export type ArmamentStats =
  | BoosterStats
  | StealthStats
  | EmpTrapStats
  | BarricadeStats
  | ShockwaveStats
  | JammerStats
  | ChargeFieldStats
  | CollectorDroneStats
  | CrashBombStats
export type ArmamentStatsGetter = (level: number) => ArmamentStats
export type ArmamentStatsGettersMap = {
  booster: (level: number) => BoosterStats
  stealth: (level: number) => StealthStats
  trap: (level: number) => EmpTrapStats
  barricade: (level: number) => BarricadeStats
  shockwave: (level: number) => ShockwaveStats
  jammer: (level: number) => JammerStats
  charge_field: (level: number) => ChargeFieldStats
  collector_drone: (level: number) => CollectorDroneStats
  crash_bomb: (level: number) => CrashBombStats
}

// Upgrades
export interface UpgradeOption {
  id: string
  type: 'install_armament' | 'upgrade_armament' | 'drone_enhancement'
  titleKey: string
  descriptionKey: string
  titleParams?: Record<string, string | number>
  descriptionParams?: Record<string, string | number>
  isLearning?: boolean
  armamentId?: ArmamentName
  targetLevel?: number
  enhancementKey?: 'maxEnergy' | 'energyRecovery'
  enhancementValue?: number
}

// Stage Mode Item Spawning
export interface ItemSpawnEventDefinition {
  itemType: 'dataChip' | 'spareBattery'
  triggerTurn: number
  quantity: number
}

// Stage Mode Definitions
export interface WaveDefinition {
  triggerTurn: number
  totalCost: number
  enemyPool: string[]
  warningShown?: boolean
}

export interface StageDefinition {
  id: string
  nameKey: string
  mapRadius: number
  totalTurns: number
  waves: WaveDefinition[]
  descriptionKey?: string
  itemSpawns?: ItemSpawnEventDefinition[]
}

// Turn-based Enemy Spawning for Endless Mode
export interface EnemySpawnPoolEntry {
  typeId: string
  weight: number
}

export interface TurnBasedSpawnEpoch {
  turnStart: number
  enemyPool: EnemySpawnPoolEntry[]
  spawnProbabilityMultiplier?: number
  spawnProbabilityOverride?: number
}

export type TurnBasedEnemySpawnConfig = TurnBasedSpawnEpoch[]

// AI Action Types
export type ConcreteAiAction =
  | { type: 'MOVE'; hex: Hex }
  | { type: 'USE_ARMAMENT'; armamentId: ArmamentName }
  | { type: 'USE_SPARE_BATTERY' }
  | { type: 'PLACE_TRAP_SIMULATED'; hex: Hex }
  | { type: 'PLACE_BARRICADE_SIMULATED'; hex: Hex }
  | { type: 'PLACE_CHARGE_FIELD_SIMULATED'; hex: Hex }
  | { type: 'PLACE_COLLECTOR_DRONE_SIMULATED'; hex: Hex }
  | { type: 'SELECT_UPGRADE'; optionId: string }

export type SimulatedDescriptiveAiAction =
  | { type: 'MOVE'; q: number; r: number; desc: string }
  | { type: 'USE_ARMAMENT'; armament: ArmamentName; desc: string }
  | { type: 'PLACE_TRAP'; q: number; r: number; desc: string }
  | { type: 'PLACE_BARRICADE'; q: number; r: number; desc: string }
  | { type: 'PLACE_CHARGE_FIELD'; q: number; r: number; desc: string }
  | { type: 'PLACE_COLLECTOR_DRONE'; q: number; r: number; desc: string }
  | { type: 'USE_BATTERY'; desc: string }
  | { type: 'SELECT_UPGRADE'; optionId: string; desc: string }
  | { type: 'UNKNOWN_ACTION'; desc: string }

// New type for statistics
export interface GameStatistics {
  enemiesDefeatedByType: Record<number, number>
  maxCombo: number
  armamentsUsedCount: Partial<Record<ArmamentName, number>>
  dataChipsCollected: number
  spareBatteriesCollected: number
  spareBatteriesUsed: number
  scoreHistory: { turn: number; score: number }[]
}

// Game State (as exposed to App.tsx, might be same as GameLogicState)
// This is effectively GameLogicState from initialState.ts
export interface GameState {
  gameMode: GameMode
  currentStage: StageDefinition | null
  currentWaveIndex: number
  escapePortalPosition: AxialCoordinates | null
  pendingSpawnLocations: AxialCoordinates[] | null
  pendingWaveSpawns: { location: AxialCoordinates; enemyConfig: EnemySpawnConfig }[] | null

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

  gameStats: GameStatistics // New

  isDangerMapVisible: boolean
  isObserverCountMapVisible: boolean
  hoveredEnemyId: string | null
  isProcessingEnemyTurn: boolean
  isProcessingCollectorDroneTurn: boolean

  isUpgradeSelection: boolean
  isDebugUpgradeSelection: boolean
  upgradeOptions: UpgradeOption[]
  showLevelUpBanner: boolean
  currentLanguage: Language
  effectiveLevelForUpgradeContext?: number

  availableStages: StageDefinition[]
  unlockedStageIds: string[]

  aiPlannedActionSequence: ConcreteAiAction[] | null

  // Visual Effect Triggers
  showShockwaveEffectAt: AxialCoordinates | null
  showJammerEffectAt: AxialCoordinates | null
  showChargeFieldPlacementEffectAt: AxialCoordinates | null
  showChargeFieldRecoveryEffectAt: AxialCoordinates | null
  showCollectorDronePlacementEffectAt: AxialCoordinates | null
  showCrashBombEffect: boolean
}
