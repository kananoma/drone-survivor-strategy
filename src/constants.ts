import {
  ArmamentName,
  BoosterStats,
  StealthStats,
  EmpTrapStats,
  BarricadeStats,
  ShockwaveStats,
  JammerStats,
  ChargeFieldStats,
  CollectorDroneStats,
  CrashBombStats,
  ArmamentStatsGettersMap,
  TurnBasedEnemySpawnConfig,
} from './types'

export const MAP_RADIUS_OPTIONS: number[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
export const DEFAULT_MAP_RADIUS: number = 4

export const HEX_SIZE: number = 40
export const ANIMATION_DURATION_MS: number = 100
export const AI_MODE_DECISION_DELAY_MS = 250

// --- Drone System Updates & Data Chips (Experience) ---
export const INITIAL_EXP_TO_NEXT_LEVEL: number = 1200
export const LEVEL_EXP_SCALING_FACTOR: number = 1.1

export const DATA_CHIP_CONFIG = { baseValue: 300, icon: '💿', nameKey: 'ITEM_DATA_CHIP_NAME' }
export const DATA_CHIP_SPAWN_PROBABILITY: number = 0.08
export const DATA_CHIP_MIN_SPAWN_DISTANCE_FROM_PLAYER: number = 2

// --- Spare Batteries ---
export const SPARE_BATTERY_CONFIG = { energyValue: 300, icon: '🔋', nameKey: 'ITEM_SPARE_BATTERY_NAME' }
export const SPARE_BATTERY_SPAWN_PROBABILITY: number = 0.05
export const SPARE_BATTERY_MIN_SPAWN_DISTANCE_FROM_PLAYER: number = 2

// --- Drone Energy System ---
export const INITIAL_CURRENT_ENERGY = 3000
export const INITIAL_MAX_ENERGY = 3000
export const INITIAL_ENERGY_RECOVERY_PER_TURN = 60

// --- Drone Enhancement Upgrades ---
export const UPGRADE_MAX_ENERGY_MK1_VALUE = 120
export const UPGRADE_ENERGY_RECOVERY_MK1_VALUE = 2
export const MAX_INSTALLED_ARMAMENTS_COUNT = 4

// --- Enemy Parameters ---
export const ENEMY_BASE_DENSITY: number = 0.2
export const ENEMY_SPAWN_BASE_PROBABILITY: number = 0.27
export const ENEMY_SPAWN_MIN_PROBABILITY: number = 0.02
export const ENEMY_SPAWN_DENSITY_FACTOR: number = 2 // Factor to multiply spawn chance based on enemy density (e.g., 2 - fillRatio)
export const ENEMY_MIN_SPAWN_DISTANCE_FROM_PLAYER: number = 3 // Original distance for enemy spawn

export const ENEMY_LEVEL_COLORS: { [key: number]: string } = {
  0: 'bg-gray-500',
  1: 'bg-yellow-300',
  2: 'bg-yellow-400',
  3: 'bg-orange-400',
  4: 'bg-orange-600',
  5: 'bg-red-600',
  6: 'bg-red-700',
  7: 'bg-red-800',
}
export const ENEMY_DEFAULT_COLOR: string = 'bg-pink-500' // For levels > 7

export const ENDLESS_MODE_SPAWN_CONFIG: TurnBasedEnemySpawnConfig = [
  // Phase 1-5: No spawn rate multiplier for a standard early-to-mid game experience
  { turnStart: 1, enemyPool: [{ typeId: 'enemy_lv2', weight: 100 }] },
  {
    turnStart: 25,
    enemyPool: [
      { typeId: 'enemy_lv2', weight: 90 },
      { typeId: 'enemy_lv3', weight: 10 },
    ],
  },
  {
    turnStart: 50,
    enemyPool: [
      { typeId: 'enemy_lv2', weight: 70 },
      { typeId: 'enemy_lv3', weight: 30 },
    ],
  },
  {
    turnStart: 75,
    enemyPool: [
      { typeId: 'enemy_lv2', weight: 50 },
      { typeId: 'enemy_lv3', weight: 50 },
    ],
  },
  {
    turnStart: 100,
    enemyPool: [
      { typeId: 'enemy_lv2', weight: 30 },
      { typeId: 'enemy_lv3', weight: 60 },
      { typeId: 'enemy_lv4', weight: 10 },
    ],
  },
  {
    turnStart: 125,
    enemyPool: [
      { typeId: 'enemy_lv2', weight: 10 },
      { typeId: 'enemy_lv3', weight: 70 },
      { typeId: 'enemy_lv4', weight: 20 },
    ],
  },
  {
    turnStart: 150,
    enemyPool: [
      { typeId: 'enemy_lv3', weight: 70 },
      { typeId: 'enemy_lv4', weight: 30 },
    ],
  },
  {
    turnStart: 175,
    enemyPool: [
      { typeId: 'enemy_lv3', weight: 50 },
      { typeId: 'enemy_lv4', weight: 50 },
    ],
  },
  {
    turnStart: 200,
    enemyPool: [
      { typeId: 'enemy_lv3', weight: 30 },
      { typeId: 'enemy_lv4', weight: 60 },
      { typeId: 'enemy_lv5', weight: 10 },
    ],
  },
  {
    turnStart: 225,
    enemyPool: [
      { typeId: 'enemy_lv3', weight: 15 },
      { typeId: 'enemy_lv4', weight: 65 },
      { typeId: 'enemy_lv5', weight: 20 },
    ],
  },
  {
    turnStart: 250,
    enemyPool: [
      { typeId: 'enemy_lv4', weight: 70 },
      { typeId: 'enemy_lv5', weight: 30 },
    ],
  },
  {
    turnStart: 275,
    enemyPool: [
      { typeId: 'enemy_lv4', weight: 50 },
      { typeId: 'enemy_lv5', weight: 50 },
    ],
  },
  {
    turnStart: 300,
    enemyPool: [
      { typeId: 'enemy_lv4', weight: 30 },
      { typeId: 'enemy_lv5', weight: 60 },
      { typeId: 'enemy_lv6', weight: 10 },
    ],
  },
  {
    turnStart: 325,
    enemyPool: [
      { typeId: 'enemy_lv4', weight: 15 },
      { typeId: 'enemy_lv5', weight: 65 },
      { typeId: 'enemy_lv6', weight: 20 },
    ],
  },
  {
    turnStart: 350,
    enemyPool: [
      { typeId: 'enemy_lv5', weight: 70 },
      { typeId: 'enemy_lv6', weight: 30 },
    ],
  },
  {
    turnStart: 375,
    enemyPool: [
      { typeId: 'enemy_lv5', weight: 50 },
      { typeId: 'enemy_lv6', weight: 50 },
    ],
  },

  // Phase 6: Late game, still standard spawn rate
  {
    turnStart: 400,
    enemyPool: [
      { typeId: 'enemy_lv5', weight: 30 },
      { typeId: 'enemy_lv6', weight: 60 },
      { typeId: 'enemy_lv7', weight: 10 },
    ],
  },
  {
    turnStart: 450,
    enemyPool: [
      { typeId: 'enemy_lv5', weight: 10 },
      { typeId: 'enemy_lv6', weight: 70 },
      { typeId: 'enemy_lv7', weight: 20 },
    ],
  },
  {
    turnStart: 500,
    enemyPool: [
      { typeId: 'enemy_lv6', weight: 70 },
      { typeId: 'enemy_lv7', weight: 30 },
    ],
  },
  {
    turnStart: 550,
    enemyPool: [
      { typeId: 'enemy_lv6', weight: 50 },
      { typeId: 'enemy_lv7', weight: 50 },
    ],
  },

  // Phase 7: Post-turn 600, spawn rate begins to gradually increase
  {
    turnStart: 600,
    enemyPool: [
      { typeId: 'enemy_lv6', weight: 30 },
      { typeId: 'enemy_lv7', weight: 70 },
    ],
    spawnProbabilityMultiplier: 1.1,
  },
  {
    turnStart: 650,
    enemyPool: [
      { typeId: 'enemy_lv6', weight: 30 },
      { typeId: 'enemy_lv7', weight: 70 },
    ],
    spawnProbabilityMultiplier: 1.1,
  },
  {
    turnStart: 700,
    enemyPool: [
      { typeId: 'enemy_lv6', weight: 20 },
      { typeId: 'enemy_lv7', weight: 80 },
    ],
    spawnProbabilityMultiplier: 1.1,
  },
  {
    turnStart: 750,
    enemyPool: [
      { typeId: 'enemy_lv6', weight: 20 },
      { typeId: 'enemy_lv7', weight: 80 },
    ],
    spawnProbabilityMultiplier: 1.2,
  },
  {
    turnStart: 800,
    enemyPool: [
      { typeId: 'enemy_lv6', weight: 10 },
      { typeId: 'enemy_lv7', weight: 90 },
    ],
    spawnProbabilityMultiplier: 1.2,
  },
  {
    turnStart: 850,
    enemyPool: [
      { typeId: 'enemy_lv6', weight: 10 },
      { typeId: 'enemy_lv7', weight: 90 },
    ],
    spawnProbabilityMultiplier: 1.3,
  },
  { turnStart: 900, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 1.3 },
  { turnStart: 950, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 1.4 },
  { turnStart: 1000, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 1.5 },
  { turnStart: 1050, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 1.6 },
  { turnStart: 1100, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 1.7 },
  { turnStart: 1150, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 1.8 },
  { turnStart: 1200, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 1.9 },
  { turnStart: 1300, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 2.0 },
  { turnStart: 1350, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 2.1 },
  { turnStart: 1400, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 2.2 },
  { turnStart: 1450, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 2.3 },
  { turnStart: 1500, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 2.4 },
  { turnStart: 1600, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 2.5 },
  { turnStart: 1650, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 2.6 },
  { turnStart: 1700, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 2.7 },
  { turnStart: 1750, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 2.8 },
  { turnStart: 1800, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 2.9 },
  { turnStart: 1850, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 3.0 },
  { turnStart: 1900, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 3.1 },
  { turnStart: 1950, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 3.2 },
  { turnStart: 2000, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 3.3 },
  { turnStart: 2050, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 3.4 },
  { turnStart: 2100, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 3.5 },
  { turnStart: 2150, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 3.6 },
  { turnStart: 2200, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 3.7 },
  { turnStart: 2250, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 3.8 },
  { turnStart: 2300, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 3.9 },
  { turnStart: 2350, enemyPool: [{ typeId: 'enemy_lv7', weight: 100 }], spawnProbabilityMultiplier: 4.0 },
]

export const ENEMY_COSTS: Record<string, number> = {
  enemy_lv0: 5,
  enemy_lv1: 10,
  enemy_lv2: 20,
  enemy_lv3: 40,
  enemy_lv4: 60,
  enemy_lv5: 90,
  enemy_lv6: 130,
  enemy_lv7: 170,
}

export const ENEMY_XP_VALUES: Record<number, number> = {
  0: 100,
  1: 200,
  2: 400,
  3: 800,
  4: 1200,
  5: 1800,
  6: 2600,
  7: 3400,
}

// --- Stage Mode Specific ---
export const STAGE_SPAWN_CANDIDATE_HEXES_COUNT = 6
export const STAGE_WAVE_SPAWN_LOCATIONS_COUNT = 3
export const ESCAPE_PORTAL_MIN_DISTANCE_FROM_PLAYER = 5
export const ESCAPE_PORTAL_ICON = '🌀'
export const ESCAPE_PORTAL_NAME_KEY = 'ITEM_ESCAPE_PORTAL_NAME'
export const SPAWN_WARNING_ICON = '⚠️'

// --- Drone Armaments ---

// Booster (formerly Overdrive Booster)
export const BOOSTER_ICON = '🚀'
export const getBoosterStats = (level: number): BoosterStats => {
  const costs = [Infinity, 2400, 2300, 2200, 2000, 1900, 1800, 1600, 1500, 1400, 1200]
  const usesPerTurnValues = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4]

  const currentLevel = Math.min(level, costs.length - 1)
  const isMaxActualLevel = level >= costs.length - 1
  const actionsGranted = 1

  if (level === 0)
    return {
      installed: false,
      energyCost: Infinity,
      actionsGranted: 0,
      usesPerTurn: 0,
      descriptionKey: 'ARMAMENT_BOOSTER_OFFLINE_DESC',
      titleKey: 'ARMAMENT_BOOSTER_TITLE',
      level,
      isMaxLevel: false,
    }

  return {
    installed: true,
    energyCost: costs[currentLevel],
    actionsGranted: actionsGranted,
    usesPerTurn: usesPerTurnValues[currentLevel],
    descriptionKey: 'ARMAMENT_BOOSTER_DESC',
    titleKey: 'ARMAMENT_BOOSTER_TITLE',
    level: currentLevel,
    isMaxLevel: isMaxActualLevel,
  }
}

// Stealth System
export const STEALTH_ICON = '🌫️'
export const getStealthStats = (level: number): StealthStats => {
  const costs = [Infinity, 1200, 1170, 1140, 1100, 1070, 1040, 1000, 970, 940, 900]
  const durations = [0, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5]
  const avoidanceChances = [0, 30, 35, 40, 50, 55, 60, 70, 75, 80, 100]

  const currentLevel = Math.min(level, costs.length - 1)
  const isMaxActualLevel = level >= costs.length - 1

  if (level === 0)
    return {
      installed: false,
      energyCost: Infinity,
      duration: 0,
      avoidanceChance: 0,
      descriptionKey: 'ARMAMENT_STEALTH_OFFLINE_DESC',
      titleKey: 'ARMAMENT_STEALTH_TITLE',
      level,
      isMaxLevel: false,
    }

  return {
    installed: true,
    energyCost: costs[currentLevel],
    duration: durations[currentLevel],
    avoidanceChance: avoidanceChances[currentLevel],
    descriptionKey: 'ARMAMENT_STEALTH_DESC',
    titleKey: 'ARMAMENT_STEALTH_TITLE',
    level: currentLevel,
    isMaxLevel: isMaxActualLevel,
  }
}

// EMP Trap
export const EMP_TRAP_ICON = '💥'
export const getEmpTrapStats = (level: number): EmpTrapStats => {
  const costs = [Infinity, 1000, 940, 880, 800, 740, 680, 600, 540, 480, 400]
  const stunDurations = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]
  const maxChargesList = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4]

  const currentLevel = Math.min(level, costs.length - 1)
  const isMaxActualLevel = level >= costs.length - 1

  if (level === 0)
    return {
      installed: false,
      energyCost: Infinity,
      stunDuration: 0,
      maxCharges: 0,
      descriptionKey: 'ARMAMENT_TRAP_OFFLINE_DESC',
      titleKey: 'ARMAMENT_TRAP_TITLE',
      level,
      isMaxLevel: false,
    }

  return {
    installed: true,
    energyCost: costs[currentLevel],
    stunDuration: stunDurations[currentLevel],
    maxCharges: maxChargesList[currentLevel],
    descriptionKey: 'ARMAMENT_TRAP_DESC',
    titleKey: 'ARMAMENT_TRAP_TITLE',
    level: currentLevel,
    isMaxLevel: isMaxActualLevel,
  }
}

// Barricade
export const BARRICADE_ICON = '🚧'
export const getBarricadeStats = (level: number): BarricadeStats => {
  const costs = [Infinity, 1000, 970, 940, 900, 870, 840, 800, 770, 740, 700]
  const durations = [0, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16]
  const maxChargesList = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4]

  const currentLevel = Math.min(level, costs.length - 1)
  const isMaxActualLevel = level >= costs.length - 1

  if (level === 0)
    return {
      installed: false,
      energyCost: Infinity,
      duration: 0,
      maxCharges: 0,
      descriptionKey: 'ARMAMENT_BARRICADE_OFFLINE_DESC',
      titleKey: 'ARMAMENT_BARRICADE_TITLE',
      level,
      isMaxLevel: false,
    }

  return {
    installed: true,
    energyCost: costs[currentLevel],
    duration: durations[currentLevel],
    maxCharges: maxChargesList[currentLevel],
    descriptionKey: 'ARMAMENT_BARRICADE_DESC',
    titleKey: 'ARMAMENT_BARRICADE_TITLE',
    level: currentLevel,
    isMaxLevel: isMaxActualLevel,
  }
}

// Shockwave
export const SHOCKWAVE_ICON = '❇'
export const getShockwaveStats = (level: number): ShockwaveStats => {
  const costs = [Infinity, 2100, 2000, 1900, 1700, 1600, 1500, 1300, 1200, 1100, 900]
  const pushDistances = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  const stunDurations = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4]

  const currentLevel = Math.min(level, costs.length - 1)
  const isMaxActualLevel = level >= costs.length - 1

  if (level === 0)
    return {
      installed: false,
      energyCost: Infinity,
      pushDistance: 0,
      stunDuration: 0,
      descriptionKey: 'ARMAMENT_SHOCKWAVE_OFFLINE_DESC',
      titleKey: 'ARMAMENT_SHOCKWAVE_TITLE',
      level,
      isMaxLevel: false,
    }

  return {
    installed: true,
    energyCost: costs[currentLevel],
    pushDistance: pushDistances[currentLevel],
    stunDuration: stunDurations[currentLevel],
    descriptionKey: 'ARMAMENT_SHOCKWAVE_DESC',
    titleKey: 'ARMAMENT_SHOCKWAVE_TITLE',
    level: currentLevel,
    isMaxLevel: isMaxActualLevel,
  }
}

// Jammer
export const JAMMER_ICON = '📡'
export const getJammerStats = (level: number): JammerStats => {
  const costs = [Infinity, 1500, 1470, 1440, 1400, 1370, 1340, 1300, 1270, 1240, 1200]
  const levelReductions = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4] // Now level reduction
  const durations = [0, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16]

  const currentLevel = Math.min(level, costs.length - 1)
  const isMaxActualLevel = level >= costs.length - 1

  if (level === 0)
    return {
      installed: false,
      energyCost: Infinity,
      levelReduction: 0,
      duration: 0,
      descriptionKey: 'ARMAMENT_JAMMER_OFFLINE_DESC',
      titleKey: 'ARMAMENT_JAMMER_TITLE',
      level,
      isMaxLevel: false,
    }

  return {
    installed: true,
    energyCost: costs[currentLevel],
    levelReduction: levelReductions[currentLevel],
    duration: durations[currentLevel],
    descriptionKey: 'ARMAMENT_JAMMER_GLOBAL_DESC',
    titleKey: 'ARMAMENT_JAMMER_TITLE',
    level: currentLevel,
    isMaxLevel: isMaxActualLevel,
  }
}

// Charge Field
export const CHARGE_FIELD_ICON = '💡'
export const getChargeFieldStats = (level: number): ChargeFieldStats => {
  const costs = [Infinity, 210, 210, 210, 200, 200, 200, 190, 190, 190, 180]
  const effectRadii = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4]
  const recoveryAmounts = [0, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30]
  const durations = [0, 20, 22, 24, 28, 30, 32, 36, 38, 40, 45]
  const maxPlacedList = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2]

  const currentLevel = Math.min(level, costs.length - 1)
  const isMaxActualLevel = level >= costs.length - 1

  if (level === 0)
    return {
      installed: false,
      energyCost: Infinity,
      effectRadius: 0,
      recoveryAmount: 0,
      duration: 0,
      maxPlaced: 0,
      descriptionKey: 'ARMAMENT_CHARGE_FIELD_OFFLINE_DESC',
      titleKey: 'ARMAMENT_CHARGE_FIELD_TITLE',
      level,
      isMaxLevel: false,
    }

  return {
    installed: true,
    energyCost: costs[currentLevel],
    effectRadius: effectRadii[currentLevel],
    recoveryAmount: recoveryAmounts[currentLevel],
    duration: durations[currentLevel],
    maxPlaced: maxPlacedList[currentLevel],
    descriptionKey: 'ARMAMENT_CHARGE_FIELD_DESC',
    titleKey: 'ARMAMENT_CHARGE_FIELD_TITLE',
    level: currentLevel,
    isMaxLevel: isMaxActualLevel,
  }
}

// Collector Drone
export const COLLECTOR_DRONE_ICON = '🛸'
export const getCollectorDroneStats = (level: number): CollectorDroneStats => {
  const costs = [Infinity, 700, 670, 640, 600, 570, 540, 500, 470, 440, 400]
  const searchRadii = [0, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6]
  const lifespans = [0, 20, 24, 28, 34, 38, 42, 48, 52, 56, 64]
  const maxPlacedList = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4]

  const currentLevel = Math.min(level, costs.length - 1)
  const isMaxActualLevel = level >= costs.length - 1

  if (level === 0)
    return {
      installed: false,
      energyCost: Infinity,
      searchRadius: 0,
      lifespan: 0,
      maxPlaced: 0,
      descriptionKey: 'ARMAMENT_COLLECTOR_DRONE_OFFLINE_DESC',
      titleKey: 'ARMAMENT_COLLECTOR_DRONE_TITLE',
      level,
      isMaxLevel: false,
    }

  return {
    installed: true,
    energyCost: costs[currentLevel],
    searchRadius: searchRadii[currentLevel],
    lifespan: lifespans[currentLevel],
    maxPlaced: maxPlacedList[currentLevel],
    descriptionKey: 'ARMAMENT_COLLECTOR_DRONE_DESC',
    titleKey: 'ARMAMENT_COLLECTOR_DRONE_TITLE',
    level: currentLevel,
    isMaxLevel: isMaxActualLevel,
  }
}

// Crash Bomb
export const CRASH_BOMB_ICON = '☢️'
export const MAX_HEAT_CRASH_BOMB = 9600
export const getCrashBombStats = (level: number): CrashBombStats => {
  // Level 0: Not installed
  // Levels 1-10: Installed
  const initialCosts = [Infinity, 3000, 2800, 2600, 2300, 2100, 1900, 1600, 1400, 1200, 900]
  const coolingRatesPerTurn = [0, 60, 64, 69, 80, 88, 96, 120, 138, 160, 240]
  const maxLevelForArrays = 10

  const currentLevelIdx = Math.min(level, maxLevelForArrays) // Use level directly as index for 1-based levels

  if (level === 0)
    return {
      installed: false,
      energyCost: Infinity,
      maxHeat: 0,
      coolingRatePerTurn: 0,
      descriptionKey: 'ARMAMENT_CRASH_BOMB_OFFLINE_DESC',
      titleKey: 'ARMAMENT_CRASH_BOMB_TITLE',
      level,
      isMaxLevel: false,
    }

  return {
    installed: true,
    energyCost: initialCosts[currentLevelIdx],
    maxHeat: MAX_HEAT_CRASH_BOMB,
    coolingRatePerTurn: coolingRatesPerTurn[currentLevelIdx],
    descriptionKey: 'ARMAMENT_CRASH_BOMB_DESC',
    titleKey: 'ARMAMENT_CRASH_BOMB_TITLE',
    level: level,
    isMaxLevel: level >= maxLevelForArrays,
  }
}

// Armament ID to Stats Function Mapping
export const ARMAMENT_STATS_GETTERS: ArmamentStatsGettersMap = {
  booster: getBoosterStats,
  stealth: getStealthStats,
  trap: getEmpTrapStats,
  barricade: getBarricadeStats,
  shockwave: getShockwaveStats,
  jammer: getJammerStats,
  charge_field: getChargeFieldStats,
  collector_drone: getCollectorDroneStats,
  crash_bomb: getCrashBombStats,
}

export const ARMAMENT_ICONS: Record<ArmamentName, string> = {
  booster: BOOSTER_ICON,
  stealth: STEALTH_ICON,
  trap: EMP_TRAP_ICON,
  barricade: BARRICADE_ICON,
  shockwave: SHOCKWAVE_ICON,
  jammer: JAMMER_ICON,
  charge_field: CHARGE_FIELD_ICON,
  collector_drone: COLLECTOR_DRONE_ICON,
  crash_bomb: CRASH_BOMB_ICON,
}

// --- UI ---
export const MESSAGE_LOG_MAX_MESSAGES = 100
export const SHOCKWAVE_EFFECT_DURATION_MS = 500
export const JAMMER_EFFECT_DURATION_MS = 600
export const CHARGE_FIELD_PLACEMENT_EFFECT_DURATION_MS = 500
export const CHARGE_FIELD_RECOVERY_EFFECT_DURATION_MS = 100
export const COLLECTOR_DRONE_PLACEMENT_EFFECT_DURATION_MS = 500
export const CRASH_BOMB_EFFECT_DURATION_MS = 1500

// --- Danger Map ---
export const DANGER_COLORS: string[] = ['bg-slate-700', 'bg-yellow-600', 'bg-orange-500', 'bg-red-600', 'bg-red-800']
export const MAX_DANGER_FOR_COLOR_SCALE: number = 100

// --- Debug ---
export const DEBUG_MODE = false
export const MAX_REWIND_HISTORY_SIZE = 100
