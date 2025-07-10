import { GameLogicState } from '../../../gameLogic/initialState'
import {
  Hex,
  Player,
  Enemy,
  PlacedTrap,
  PlacedBarricade,
  PlacedChargeField,
  AxialCoordinates,
  GamePhase,
  ArmamentName,
  BoosterStats,
  StealthStats,
  EmpTrapStats,
  BarricadeStats,
  ShockwaveStats,
  JammerStats,
  ChargeFieldStats,
  DataChipPickup,
  SpareBatteryPickup,
  UpgradeOption,
  ConcreteAiAction,
  SimulatedDescriptiveAiAction,
  EnemySpawnConfig,
  StageDefinition,
  CollectorDroneEntity,
  CollectorDroneStats,
  CrashBombStats,
} from '../../../types'
import { axialDistance, getNeighbors, axialToId, idToAxial } from '../../../utils/hexUtils'
import {
  ARMAMENT_STATS_GETTERS,
  SPARE_BATTERY_CONFIG,
  DATA_CHIP_CONFIG,
  ENEMY_XP_VALUES,
  MAX_DANGER_FOR_COLOR_SCALE,
  LEVEL_EXP_SCALING_FACTOR,
  INITIAL_ENERGY_RECOVERY_PER_TURN,
  ENEMY_LEVEL_COLORS,
  ENEMY_DEFAULT_COLOR,
  DATA_CHIP_SPAWN_PROBABILITY,
  DATA_CHIP_MIN_SPAWN_DISTANCE_FROM_PLAYER,
  SPARE_BATTERY_SPAWN_PROBABILITY,
  SPARE_BATTERY_MIN_SPAWN_DISTANCE_FROM_PLAYER,
  ENEMY_MIN_SPAWN_DISTANCE_FROM_PLAYER,
  ENDLESS_MODE_SPAWN_CONFIG,
  ENEMY_COSTS,
  STAGE_SPAWN_CANDIDATE_HEXES_COUNT,
  ESCAPE_PORTAL_MIN_DISTANCE_FROM_PLAYER,
  MAX_HEAT_CRASH_BOMB,
} from '../../../constants'
import { nanoid } from 'nanoid'
import { deepCloneGameState as cloneStateUtil } from '../../../gameLogic/initialState'

// Simulate Player Action for AI
export const simulatePlayerActionForAIInternal = (
  simState: GameLogicState,
  action: ConcreteAiAction,
  generateUpgradeOptionsFn: () => UpgradeOption[]
): GameLogicState => {
  if (!simState.player) return simState

  if (action.type === 'MOVE') {
    const targetHex = action.hex
    simState.player.q = targetHex.q
    simState.player.r = targetHex.r
    simState.playerActionsRemaining--
    const enemyIdx = simState.enemies.findIndex((e) => e.q === targetHex.q && e.r === targetHex.r)
    if (enemyIdx !== -1) {
      const defeatedEnemy = simState.enemies.splice(enemyIdx, 1)[0]
      const scoreGainedFromEnemy = ENEMY_XP_VALUES[defeatedEnemy.level] || 0
      simState.score += scoreGainedFromEnemy
      simState.defeatedEnemyThisTurnCycle = true
      const simComboCount = simState.comboCount > 0 ? simState.comboCount + 1 : 1
      const simCurrentComboBaseScore =
        simComboCount === 1 ? scoreGainedFromEnemy : simState.currentComboBaseScore + scoreGainedFromEnemy
      if (simComboCount > 1) {
        const oldComboCountForSimBonus = simState.comboCount
        const oldComboBaseScoreForSimBonus = simState.currentComboBaseScore
        const previousTotalBonusAwarded =
          oldComboCountForSimBonus > 1 ? oldComboBaseScoreForSimBonus * (oldComboCountForSimBonus - 1) * 0.5 : 0
        const newPotentialTotalBonus = simCurrentComboBaseScore * (simComboCount - 1) * 0.5
        const bonusForThisKillInSim = newPotentialTotalBonus - previousTotalBonusAwarded
        if (bonusForThisKillInSim > 0) {
          simState.score += bonusForThisKillInSim
        }
      }
      simState.comboCount = simComboCount
      simState.currentComboBaseScore = simCurrentComboBaseScore

      const expFromEnemy = ENEMY_XP_VALUES[defeatedEnemy.level] || 0
      simState.currentExp += expFromEnemy
      while (simState.currentExp >= simState.expToNextLevel) {
        simState.currentExp -= simState.expToNextLevel
        simState.playerLevel++
        simState.expToNextLevel = Math.floor(simState.expToNextLevel * LEVEL_EXP_SCALING_FACTOR)
        simState.upgradePoints++
      }
    }
    const dataChipIdx = simState.dataChips.findIndex((dc) => dc.q === targetHex.q && dc.r === targetHex.r)
    if (dataChipIdx !== -1) {
      const chip = simState.dataChips.splice(dataChipIdx, 1)[0]
      simState.currentExp += chip.expValue * chip.count
      while (simState.currentExp >= simState.expToNextLevel) {
        simState.currentExp -= simState.expToNextLevel
        simState.playerLevel++
        simState.expToNextLevel = Math.floor(simState.expToNextLevel * LEVEL_EXP_SCALING_FACTOR)
        simState.upgradePoints++
      }
    }
    const spareBatteryIdx = simState.spareBatteriesOnMap.findIndex((sb) => sb.q === targetHex.q && sb.r === targetHex.r)
    if (spareBatteryIdx !== -1) {
      const battery = simState.spareBatteriesOnMap.splice(spareBatteryIdx, 1)[0]
      simState.spareBatteriesCount += battery.count
    }
    const barricadeIdx = simState.placedBarricades.findIndex((b) => b.q === targetHex.q && b.r === targetHex.r)
    if (barricadeIdx !== -1) {
      simState.placedBarricades.splice(barricadeIdx, 1)
    }
  } else if (action.type === 'USE_ARMAMENT') {
    const stats = ARMAMENT_STATS_GETTERS[action.armamentId](simState.armamentLevels[action.armamentId])
    simState.currentEnergy -= stats.energyCost
    if (action.armamentId !== 'booster') simState.playerActionsRemaining--

    if (action.armamentId === 'booster') {
      const boosterStats = stats as BoosterStats
      simState.playerActionsRemaining += boosterStats.actionsGranted
      simState.activeBuffs.boosterUsesThisTurn++
      simState.activeBuffs.boosterActiveThisTurn = true
      simState.activeBuffs.boosterActionsAvailableThisTurn += boosterStats.actionsGranted
    } else if (action.armamentId === 'stealth') {
      const stealthStats = stats as StealthStats
      simState.activeBuffs.stealth = { isActive: true, turnsLeft: stealthStats.duration }
    } else if (action.armamentId === 'trap') {
      simState.gamePhase = 'PlacingEmpTrap' // AI will need to pick a hex in next step
    } else if (action.armamentId === 'barricade') {
      simState.gamePhase = 'PlacingBarricade'
    } else if (action.armamentId === 'charge_field') {
      simState.gamePhase = 'PlacingChargeField'
    } else if (action.armamentId === 'collector_drone') {
      simState.gamePhase = 'PlacingCollectorDrone'
    } else if (action.armamentId === 'shockwave') {
      const shockwaveStats = stats as ShockwaveStats
      getNeighbors(simState.player).forEach((adjHex) => {
        const enemyIdx = simState.enemies.findIndex((e) => e.q === adjHex.q && e.r === adjHex.r)
        if (enemyIdx !== -1) {
          simState.enemies[enemyIdx].isStunnedTurns += shockwaveStats.stunDuration
          // Simplified push logic for simulation (no collision check with other enemies/walls)
          const dq = simState.enemies[enemyIdx].q - simState.player.q
          const dr = simState.enemies[enemyIdx].r - simState.player.r
          let pushQ = simState.enemies[enemyIdx].q
          let pushR = simState.enemies[enemyIdx].r
          for (let i = 0; i < shockwaveStats.pushDistance; i++) {
            const nextQ = pushQ + dq
            const nextR = pushR + dr
            const hex = simState.hexes.get(axialToId(nextQ, nextR))
            if (!hex || hex.isWall) break
            pushQ = nextQ
            pushR = nextR
          }
          simState.enemies[enemyIdx].q = pushQ
          simState.enemies[enemyIdx].r = pushR
        }
      })
    } else if (action.armamentId === 'jammer') {
      const jammerStats = stats as JammerStats
      simState.activeBuffs.jammerFieldEffect = {
        isActive: true,
        turnsLeft: jammerStats.duration,
        levelReductionAmount: jammerStats.levelReduction,
      }
    } else if (action.armamentId === 'crash_bomb') {
      const crashBombStats = stats as CrashBombStats
      simState.currentEnergy = 0
      simState.activeBuffs.overheat = { isActive: true, currentHeat: crashBombStats.maxHeat }
      simState.enemies = [] // All enemies defeated
      simState.dataChips = []
      simState.spareBatteriesOnMap = []
      simState.placedEmpTraps = []
      simState.placedBarricades = []
      simState.placedChargeFields = []
      simState.placedCollectorDrones = []
      simState.score += 500 // Bonus for using crash bomb
    }
  } else if (action.type === 'USE_SPARE_BATTERY') {
    simState.currentEnergy = Math.min(simState.maxEnergy, simState.currentEnergy + SPARE_BATTERY_CONFIG.energyValue)
    simState.spareBatteriesCount--
    // No action cost for spare battery in this simulation
  } else if (action.type === 'PLACE_TRAP_SIMULATED') {
    const trapStats = ARMAMENT_STATS_GETTERS.trap(simState.armamentLevels.trap) as EmpTrapStats
    if (simState.placedEmpTraps.length < trapStats.maxCharges) {
      simState.placedEmpTraps.push({ id: nanoid(), q: action.hex.q, r: action.hex.r })
      simState.playerActionsRemaining--
    }
    simState.gamePhase = 'PlayerTurn' // Revert to player turn
  } else if (action.type === 'PLACE_BARRICADE_SIMULATED') {
    const barricadeStats = ARMAMENT_STATS_GETTERS.barricade(simState.armamentLevels.barricade) as BarricadeStats
    if (simState.placedBarricades.length < barricadeStats.maxCharges) {
      simState.placedBarricades.push({
        id: nanoid(),
        q: action.hex.q,
        r: action.hex.r,
        turnsLeft: barricadeStats.duration,
      })
      simState.playerActionsRemaining--
    }
    simState.gamePhase = 'PlayerTurn'
  } else if (action.type === 'PLACE_CHARGE_FIELD_SIMULATED') {
    const chargeFieldStats = ARMAMENT_STATS_GETTERS.charge_field(
      simState.armamentLevels.charge_field
    ) as ChargeFieldStats
    if (simState.placedChargeFields.length < chargeFieldStats.maxPlaced) {
      simState.placedChargeFields.push({
        id: nanoid(),
        q: action.hex.q,
        r: action.hex.r,
        turnsLeft: chargeFieldStats.duration,
        recoveryAmount: chargeFieldStats.recoveryAmount,
        effectRadius: chargeFieldStats.effectRadius,
      })
      simState.playerActionsRemaining--
    }
    simState.gamePhase = 'PlayerTurn'
  } else if (action.type === 'PLACE_COLLECTOR_DRONE_SIMULATED') {
    const collectorDroneStats = ARMAMENT_STATS_GETTERS.collector_drone(
      simState.armamentLevels.collector_drone
    ) as CollectorDroneStats
    if (simState.placedCollectorDrones.length < collectorDroneStats.maxPlaced) {
      simState.placedCollectorDrones.push({
        id: nanoid(),
        q: action.hex.q,
        r: action.hex.r,
        turnsLeft: collectorDroneStats.lifespan,
        searchRadius: collectorDroneStats.searchRadius,
        targetItemId: null,
        path: [],
      })
      simState.playerActionsRemaining--
    }
    simState.gamePhase = 'PlayerTurn'
  } else if (action.type === 'SELECT_UPGRADE') {
    const selectedOption = simState.upgradeOptions.find((opt) => opt.id === action.optionId)
    if (selectedOption) {
      if (selectedOption.type === 'install_armament' && selectedOption.armamentId && selectedOption.targetLevel)
        simState.armamentLevels[selectedOption.armamentId] = selectedOption.targetLevel
      else if (selectedOption.type === 'upgrade_armament' && selectedOption.armamentId && selectedOption.targetLevel)
        simState.armamentLevels[selectedOption.armamentId] = selectedOption.targetLevel
      else if (selectedOption.type === 'drone_enhancement') {
        if (selectedOption.enhancementKey === 'maxEnergy' && selectedOption.enhancementValue)
          simState.maxEnergy += selectedOption.enhancementValue
        else if (selectedOption.enhancementKey === 'energyRecovery' && selectedOption.enhancementValue)
          simState.bonusEnergyRecoveryPerTurn += selectedOption.enhancementValue
      }
      if (!simState.isDebugUpgradeSelection) simState.upgradePoints--
    }
    simState.isUpgradeSelection = false
    simState.gamePhase = 'PlayerTurn'
  }

  // If player actions are depleted, or if the current game phase indicates end of player actions (e.g., after placing something)
  // and it's not an upgrade selection phase (which would be handled by the SELECT_UPGRADE action)
  if (simState.playerActionsRemaining <= 0 && simState.gamePhase !== 'UpgradeSelection') {
    if (!simState.defeatedEnemyThisTurnCycle) {
      simState.comboCount = 0
      simState.currentComboBaseScore = 0
    }
    // Transition to a state that would be 'CollectorDroneTurn' or 'EnemyTurn' in actual game
    // For simulation, we might stop here or simulate enemy turn.
    // For scoreBoardStateForAIInternal, we typically evaluate the state after player's full turn.
  }

  return simState
}

// Simplified Enemy Turn Simulation for AI
export const _simulateFullEnemyTurnLogic_ForAI = (simState: GameLogicState): GameLogicState => {
  if (!simState.player) return simState

  const enemiesAtStartOfThisSimTurn = simState.enemies.map((e) => ({ ...e }))

  // 1. Decrement Buffs/Effects
  simState.activeBuffs.stealth.turnsLeft = Math.max(0, simState.activeBuffs.stealth.turnsLeft - 1)
  if (simState.activeBuffs.stealth.turnsLeft === 0) simState.activeBuffs.stealth.isActive = false

  simState.activeBuffs.jammerFieldEffect.turnsLeft = Math.max(0, simState.activeBuffs.jammerFieldEffect.turnsLeft - 1)
  if (simState.activeBuffs.jammerFieldEffect.turnsLeft === 0) simState.activeBuffs.jammerFieldEffect.isActive = false

  if (simState.activeBuffs.overheat.isActive) {
    const crashBombStats = ARMAMENT_STATS_GETTERS.crash_bomb(simState.armamentLevels.crash_bomb) as CrashBombStats
    simState.activeBuffs.overheat.currentHeat = Math.max(
      0,
      simState.activeBuffs.overheat.currentHeat - crashBombStats.coolingRatePerTurn
    )
    if (simState.activeBuffs.overheat.currentHeat === 0) simState.activeBuffs.overheat.isActive = false
  }

  simState.activeBuffs.boosterUsesThisTurn = 0
  simState.activeBuffs.boosterActiveThisTurn = false
  simState.activeBuffs.boosterActionsAvailableThisTurn = 0

  simState.placedBarricades = simState.placedBarricades
    .map((b) => ({ ...b, turnsLeft: b.turnsLeft - 1 }))
    .filter((b) => b.turnsLeft > 0)
  simState.placedChargeFields = simState.placedChargeFields
    .map((cf) => ({ ...cf, turnsLeft: cf.turnsLeft - 1 }))
    .filter((cf) => cf.turnsLeft > 0)
  simState.placedCollectorDrones = simState.placedCollectorDrones
    .map((cd) => ({ ...cd, turnsLeft: cd.turnsLeft - 1 }))
    .filter((cd) => cd.turnsLeft > 0)

  // 2. Enemy Movement & Attack (Simplified)
  simState.enemies = simState.enemies.map((enemy) => {
    if (enemy.isStunnedTurns > 0) {
      return { ...enemy, isStunnedTurns: enemy.isStunnedTurns - 1 }
    }
    let movedEnemy = { ...enemy }
    const neighbors = getNeighbors(enemy).filter((n) => simState.hexes.has(axialToId(n.q, n.r)))
    if (neighbors.length > 0) {
      let bestNeighbor = neighbors[0]
      let minDistToPlayer = axialDistance(bestNeighbor, simState.player!)
      for (let i = 1; i < neighbors.length; i++) {
        const dist = axialDistance(neighbors[i], simState.player!)
        if (dist < minDistToPlayer) {
          minDistToPlayer = dist
          bestNeighbor = neighbors[i]
        }
      }
      // Check if bestNeighbor is occupied by another enemy
      const isOccupiedByOtherEnemy = simState.enemies.some(
        (e) => e.id !== enemy.id && e.q === bestNeighbor.q && e.r === bestNeighbor.r
      )
      if (!isOccupiedByOtherEnemy) {
        movedEnemy.q = bestNeighbor.q
        movedEnemy.r = bestNeighbor.r
      }
    }
    return movedEnemy
  })

  // Resolve collisions (simplified: if multiple enemies want same spot, one gets it, others stay)
  const occupiedAfterMove = new Set<string>()
  simState.enemies = simState.enemies.map((enemy) => {
    if (enemy.isStunnedTurns > 0) return enemy
    const targetId = axialToId(enemy.q, enemy.r)
    if (occupiedAfterMove.has(targetId) && targetId !== axialToId(simState.player!.q, simState.player!.r)) {
      // Don't prevent moving to player
      // Find original position for this enemy
      const originalEnemyState = enemiesAtStartOfThisSimTurn.find((oe) => oe.id === enemy.id)
      if (originalEnemyState) return { ...enemy, q: originalEnemyState.q, r: originalEnemyState.r }
      return enemy // Fallback: stay if original not found (should not happen in proper sim)
    }
    occupiedAfterMove.add(targetId)
    return enemy
  })

  // Check if player is defeated
  if (
    simState.enemies.some((e) => e.q === simState.player!.q && e.r === simState.player!.r && e.isStunnedTurns === 0)
  ) {
    simState.gamePhase = 'GameOver' // Mark as game over for scoring
    simState.score -= 10000 // Heavy penalty for dying
  }

  // 3. Enemy Spawning (Very Simplified - random chance, random location)
  if (simState.gameMode === 'endless' && Math.random() < 0.1 && simState.enemies.length < simState.hexes.size * 0.3) {
    const emptyHexes = Array.from(simState.hexes.values()).filter(
      (h) =>
        !simState.enemies.some((e) => e.q === h.q && e.r === h.r) &&
        !(simState.player!.q === h.q && simState.player!.r === h.r) &&
        axialDistance(h, simState.player!) > 2 // Spawn away from player
    )
    if (emptyHexes.length > 0) {
      const spawnHex = emptyHexes[Math.floor(Math.random() * emptyHexes.length)]
      const newLevel = 1 // Simplified
      simState.enemies.push({
        id: nanoid(),
        q: spawnHex.q,
        r: spawnHex.r,
        originalLevel: newLevel,
        level: newLevel,
        sightRange: newLevel + 1,
        scoreValue: ENEMY_XP_VALUES[newLevel] || 10,
        color: 'bg-red-500',
        isStunnedTurns: 0,
      })
    }
  }

  // 4. Item Spawning (Simplified)
  if (simState.gameMode === 'endless' && Math.random() < 0.05) {
    const emptyHexes = Array.from(simState.hexes.values()).filter(
      (h) =>
        !simState.enemies.some((e) => e.q === h.q && e.r === h.r) &&
        !(simState.player!.q === h.q && simState.player!.r === h.r) &&
        !simState.dataChips.some((dc) => dc.q === h.q && dc.r === h.r) &&
        !simState.spareBatteriesOnMap.some((sb) => sb.q === h.q && sb.r === h.r) &&
        axialDistance(h, simState.player!) > 1
    )
    if (emptyHexes.length > 0) {
      const spawnHex = emptyHexes[Math.floor(Math.random() * emptyHexes.length)]
      if (Math.random() < 0.5) {
        simState.dataChips.push({
          id: nanoid(),
          q: spawnHex.q,
          r: spawnHex.r,
          expValue: DATA_CHIP_CONFIG.baseValue,
          count: 1,
        })
      } else {
        simState.spareBatteriesOnMap.push({ id: nanoid(), q: spawnHex.q, r: spawnHex.r, count: 1 })
      }
    }
  }

  // 5. Player energy recovery
  simState.currentEnergy = Math.min(
    simState.maxEnergy,
    simState.currentEnergy + INITIAL_ENERGY_RECOVERY_PER_TURN + simState.bonusEnergyRecoveryPerTurn
  )
  // Charge field recovery (simplified for AI sim)
  simState.placedChargeFields.forEach((field) => {
    if (axialDistance(simState.player!, field) <= field.effectRadius) {
      simState.currentEnergy = Math.min(simState.maxEnergy, simState.currentEnergy + field.recoveryAmount)
    }
  })

  // Reset for next player turn
  simState.playerActionsRemaining = 1
  simState.defeatedEnemyThisTurnCycle = false
  simState.turnNumber++

  return simState
}

export const actionToDescriptiveInternal = (action: ConcreteAiAction): SimulatedDescriptiveAiAction => {
  switch (action.type) {
    case 'MOVE':
      return { type: 'MOVE', q: action.hex.q, r: action.hex.r, desc: `Move to (${action.hex.q},${action.hex.r})` }
    case 'USE_ARMAMENT':
      return { type: 'USE_ARMAMENT', armament: action.armamentId, desc: `Use ${action.armamentId}` }
    case 'PLACE_TRAP_SIMULATED':
      return {
        type: 'PLACE_TRAP',
        q: action.hex.q,
        r: action.hex.r,
        desc: `Place EMP Trap at (${action.hex.q},${action.hex.r})`,
      }
    case 'PLACE_BARRICADE_SIMULATED':
      return {
        type: 'PLACE_BARRICADE',
        q: action.hex.q,
        r: action.hex.r,
        desc: `Place Barricade at (${action.hex.q},${action.hex.r})`,
      }
    case 'PLACE_CHARGE_FIELD_SIMULATED':
      return {
        type: 'PLACE_CHARGE_FIELD',
        q: action.hex.q,
        r: action.hex.r,
        desc: `Place Charge Field at (${action.hex.q},${action.hex.r})`,
      }
    case 'PLACE_COLLECTOR_DRONE_SIMULATED':
      return {
        type: 'PLACE_COLLECTOR_DRONE',
        q: action.hex.q,
        r: action.hex.r,
        desc: `Place Collector Drone at (${action.hex.q},${action.hex.r})`,
      }
    case 'USE_SPARE_BATTERY':
      return { type: 'USE_BATTERY', desc: 'Use Spare Battery' }
    case 'SELECT_UPGRADE':
      return { type: 'SELECT_UPGRADE', optionId: action.optionId, desc: `Select Upgrade: ${action.optionId}` }
    default:
      return { type: 'UNKNOWN_ACTION', desc: 'Unknown Action' }
  }
}

// Scoring function for AI
export const scoreBoardStateForAIInternal = (
  simState: GameLogicState,
  initialScoreForEval: number,
  isIntermediateEval: boolean = false,
  generateUpgradeOptionsFn?: () => UpgradeOption[] // Optional for upgrade evaluation
): number => {
  if (!simState.player) return -Infinity // Should not happen in valid simulation
  if (simState.gamePhase === 'GameOver') return -1000000 // Heavy penalty for game over

  let score = simState.score - initialScoreForEval // Base score change
  score += simState.currentExp * 0.1 // Value current XP
  score += simState.playerLevel * 100 // Value player levels
  score += simState.upgradePoints * 200 // Value upgrade points

  // Energy
  score += (simState.currentEnergy / simState.maxEnergy) * 50
  if (simState.currentEnergy < simState.maxEnergy * 0.2) score -= 100 // Penalty for low energy

  // Items
  score += simState.spareBatteriesCount * 30
  simState.dataChips.forEach((chip) => (score += chip.expValue * chip.count * 0.1)) // Data chips on map also have value

  // Enemy situation
  simState.enemies.forEach((enemy) => {
    const distToEnemy = axialDistance(simState.player!, enemy)
    if (distToEnemy <= 1) score -= enemy.level * 100 // Very close enemy is bad
    else if (distToEnemy <= 2) score -= enemy.level * 50
    else score -= enemy.level * 10 // General penalty for enemies existing
    if (enemy.isStunnedTurns > 0) score += enemy.level * 20 * enemy.isStunnedTurns // Bonus for stunned
  })

  // Positional safety (simple version)
  const neighbors = getNeighbors(simState.player)
  let safeNeighbors = 0
  neighbors.forEach((n) => {
    const hexId = axialToId(n.q, n.r)
    if (simState.hexes.has(hexId) && !simState.enemies.some((e) => e.q === n.q && e.r === n.r)) {
      safeNeighbors++
    }
  })
  score += safeNeighbors * 10

  // Armament status
  if (simState.activeBuffs.stealth.isActive) score += 50 * simState.activeBuffs.stealth.turnsLeft
  if (simState.activeBuffs.overheat.isActive) score -= 500 // Overheat is very bad

  // Placed items value
  score += simState.placedEmpTraps.length * 20
  score += simState.placedBarricades.length * 15
  score += simState.placedChargeFields.length * 25
  score += simState.placedCollectorDrones.length * 25

  // If intermediate eval, slightly penalize states that end the player's turn prematurely if actions are left
  if (isIntermediateEval && simState.playerActionsRemaining > 0) {
    // No direct penalty, but actions that preserve actions for later are implicitly better
  } else if (isIntermediateEval && simState.playerActionsRemaining <= 0) {
    score -= 5 // Small penalty for ending turn if it's not the final step of a sequence
  }

  // If upgrade is available, add a bonus for being in upgrade selection state
  // But only if this is NOT an intermediate eval or if generateUpgradeOptionsFn is provided
  if (simState.isUpgradeSelection && generateUpgradeOptionsFn) {
    score += 150 // Being able to upgrade is good
    // Could add more sophisticated logic here based on available options
    const options = generateUpgradeOptionsFn()
    if (options.some((opt) => opt.type === 'install_armament' && opt.armamentId === 'booster')) score += 50
  }

  return score
}

export { cloneStateUtil as deepCloneGameState }
