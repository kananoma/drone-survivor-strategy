import { useCallback } from 'react'
import { GameLogicState, deepCloneGameState } from '../../gameLogic/initialState'
import {
  GamePhase,
  Enemy,
  PlacedTrap,
  PlacedBarricade,
  PlacedChargeField,
  CollectorDroneEntity,
  AxialCoordinates,
  Hex,
  Player,
  ActiveArmamentBuffs,
  ArmamentLevels,
  StageDefinition,
  EnemySpawnConfig,
  DataChipPickup,
  SpareBatteryPickup,
  StealthStats,
  EmpTrapStats,
  JammerStats,
  ActiveJammerFieldEffect,
  CrashBombStats,
  TurnBasedSpawnEpoch,
} from '../../types'
import { axialToId, getNeighbors, axialDistance } from '../../utils/hexUtils'
import {
  ANIMATION_DURATION_MS,
  ENEMY_SPAWN_BASE_PROBABILITY,
  ENEMY_SPAWN_DENSITY_FACTOR,
  ENEMY_SPAWN_MIN_PROBABILITY,
  ENEMY_MIN_SPAWN_DISTANCE_FROM_PLAYER,
  DATA_CHIP_SPAWN_PROBABILITY,
  DATA_CHIP_MIN_SPAWN_DISTANCE_FROM_PLAYER,
  DATA_CHIP_CONFIG,
  SPARE_BATTERY_SPAWN_PROBABILITY,
  SPARE_BATTERY_MIN_SPAWN_DISTANCE_FROM_PLAYER,
  SPARE_BATTERY_CONFIG,
  ARMAMENT_STATS_GETTERS,
  INITIAL_ENERGY_RECOVERY_PER_TURN,
  ENEMY_LEVEL_COLORS,
  ENEMY_DEFAULT_COLOR,
  ENEMY_COSTS,
  ESCAPE_PORTAL_MIN_DISTANCE_FROM_PLAYER,
  ENDLESS_MODE_SPAWN_CONFIG,
  CHARGE_FIELD_RECOVERY_EFFECT_DURATION_MS,
  ENEMY_XP_VALUES,
  LEVEL_EXP_SCALING_FACTOR,
} from '../../constants'
import { nanoid } from 'nanoid'
import { useSpawnAndStageHelpers } from './useSpawnAndStageHelpers'

export const useTurnProcessor = (
  gameState: GameLogicState,
  setGameState: React.Dispatch<React.SetStateAction<GameLogicState>>,
  addMessage: (msgKey: string, params?: Record<string, string | number>) => void,
  t: (key: string, params?: Record<string, string | number>) => string,
  addLog: (logData: any) => void,
  spawnHelpers: ReturnType<typeof useSpawnAndStageHelpers>,
  targetEnemyCount: number,
  saveStateForRewind: (state: GameLogicState) => void,
  handleExperienceGain: (
    currentExp: number,
    currentLevel: number,
    expToNextLevel: number,
    upgradePoints: number,
    amount: number
  ) => {
    currentExp: number
    playerLevel: number
    expToNextLevel: number
    upgradePoints: number
    showLevelUpBanner: boolean
  }
) => {
  const {
    getEnemyTypeAndLevelForEndlessMode,
    getEnemyScoreValue,
    determineEnemiesForWave,
    selectSpawnLocations,
    handleStageItemSpawningInternal,
  } = spawnHelpers

  const processCollectorDroneActions = useCallback(async () => {
    setGameState((prev) => {
      let stateAfterDrones = { ...prev }
      stateAfterDrones.isProcessingCollectorDroneTurn = true
      stateAfterDrones.gamePhase = 'Animating'

      let drones = [...stateAfterDrones.placedCollectorDrones]
      let dataChips = [...stateAfterDrones.dataChips]
      let spareBatteriesOnMap = [...stateAfterDrones.spareBatteriesOnMap]
      let spareBatteriesCount = stateAfterDrones.spareBatteriesCount
      let expGainedByDrones = 0

      const allOccupiedHexIdsForDrones = new Set<string>()
      if (stateAfterDrones.player)
        allOccupiedHexIdsForDrones.add(axialToId(stateAfterDrones.player.q, stateAfterDrones.player.r))
      stateAfterDrones.enemies.forEach((e) => allOccupiedHexIdsForDrones.add(axialToId(e.q, e.r)))
      stateAfterDrones.placedBarricades.forEach((b) => allOccupiedHexIdsForDrones.add(axialToId(b.q, b.r)))

      for (let i = 0; i < drones.length; i++) {
        let drone = { ...drones[i] }

        drone.turnsLeft -= 1
        if (drone.turnsLeft <= 0) {
          addMessage('MESSAGE_COLLECTOR_DRONE_LIFESPAN_EXPIRED', { droneId: drone.id.substring(0, 4) })
          drones.splice(i, 1)
          i--
          continue
        }

        let closestItem: (DataChipPickup | SpareBatteryPickup) | null = null
        let minDistance = Infinity

        const allItems = [...dataChips, ...spareBatteriesOnMap]
        for (const item of allItems) {
          const distance = axialDistance(drone, item)
          if (distance <= drone.searchRadius) {
            if (distance < minDistance) {
              minDistance = distance
              closestItem = item
            } else if (distance === minDistance) {
              if (Math.random() < 0.5) {
                closestItem = item
              }
            }
          }
        }
        drone.targetItemId = closestItem ? closestItem.id : null

        if (drone.targetItemId && closestItem) {
          const neighbors = getNeighbors(drone).filter((n) => {
            const hexId = axialToId(n.q, n.r)
            return (
              stateAfterDrones.hexes.has(hexId) &&
              !stateAfterDrones.hexes.get(hexId)?.isWall &&
              !allOccupiedHexIdsForDrones.has(hexId) &&
              !drones.some((cd) => cd.id !== drone.id && cd.q === n.q && cd.r === n.r)
            )
          })

          if (neighbors.length > 0) {
            let bestNeighbor = neighbors[0]
            let bestDistToTarget = axialDistance(bestNeighbor, closestItem)
            for (let j = 1; j < neighbors.length; j++) {
              const dist = axialDistance(neighbors[j], closestItem)
              if (dist < bestDistToTarget) {
                bestDistToTarget = dist
                bestNeighbor = neighbors[j]
              } else if (dist === bestDistToTarget && Math.random() < 0.5) {
                bestNeighbor = neighbors[j]
              }
            }
            drone.q = bestNeighbor.q
            drone.r = bestNeighbor.r
          }
        } else {
          const neighbors = getNeighbors(drone).filter((n) => {
            const hexId = axialToId(n.q, n.r)
            return (
              stateAfterDrones.hexes.has(hexId) &&
              !stateAfterDrones.hexes.get(hexId)?.isWall &&
              !allOccupiedHexIdsForDrones.has(hexId) &&
              !drones.some((cd) => cd.id !== drone.id && cd.q === n.q && cd.r === n.r)
            )
          })
          if (neighbors.length > 0) {
            const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)]
            drone.q = randomNeighbor.q
            drone.r = randomNeighbor.r
          }
        }

        const dataChipCollectedIndex = dataChips.findIndex((dc) => dc.q === drone.q && dc.r === drone.r)
        if (dataChipCollectedIndex !== -1) {
          const collectedChip = dataChips.splice(dataChipCollectedIndex, 1)[0]
          expGainedByDrones += collectedChip.expValue * collectedChip.count
          addMessage('MESSAGE_COLLECTOR_DRONE_COLLECTED_ITEM', {
            droneId: drone.id.substring(0, 4),
            itemName: t(DATA_CHIP_CONFIG.nameKey),
          })
          drone.targetItemId = null
          drone.path = []
        }

        const batteryCollectedIndex = spareBatteriesOnMap.findIndex((sb) => sb.q === drone.q && sb.r === drone.r)
        if (batteryCollectedIndex !== -1) {
          const collectedBattery = spareBatteriesOnMap.splice(batteryCollectedIndex, 1)[0]
          spareBatteriesCount += collectedBattery.count
          addMessage('MESSAGE_COLLECTOR_DRONE_COLLECTED_ITEM', {
            droneId: drone.id.substring(0, 4),
            itemName: t(SPARE_BATTERY_CONFIG.nameKey),
          })
          drone.targetItemId = null
          drone.path = []
        }
        drones[i] = drone
      }

      stateAfterDrones.placedCollectorDrones = drones
      stateAfterDrones.dataChips = dataChips
      stateAfterDrones.spareBatteriesOnMap = spareBatteriesOnMap
      stateAfterDrones.spareBatteriesCount = spareBatteriesCount

      if (expGainedByDrones > 0) {
        const expResult = handleExperienceGain(
          stateAfterDrones.currentExp,
          stateAfterDrones.playerLevel,
          stateAfterDrones.expToNextLevel,
          stateAfterDrones.upgradePoints,
          expGainedByDrones
        )
        stateAfterDrones = { ...stateAfterDrones, ...expResult }
      }
      return stateAfterDrones
    })

    await new Promise((resolve) =>
      setTimeout(resolve, ANIMATION_DURATION_MS * Math.max(1, gameState.placedCollectorDrones.length * 0.5))
    )
    setGameState((prev) => ({ ...prev, isProcessingCollectorDroneTurn: false, gamePhase: 'EnemyTurn' }))
  }, [gameState.placedCollectorDrones.length, setGameState, addMessage, t, handleExperienceGain])

  const processEnemyTurns = useCallback(async () => {
    const initialGS = { ...gameState }

    const {
      enemies: enemiesAtTurnStart,
      player: playerAtTurnStartFromInitialGS,
      placedEmpTraps: trapsAtTurnStartSnapshot,
      placedBarricades: barricadesAtTurnStartSnapshot,
      placedChargeFields: chargeFieldsAtTurnStartSnapshot,
      placedCollectorDrones: collectorDronesAtTurnStartSnapshot,
      hexes: currentHexes,
      mapRadius: currentMapRad,
      activeBuffs: playerActiveBuffsAtTurnStart,
      armamentLevels: currentArmamentLevels,
      maxEnergy: currentMaxEnergy,
      bonusEnergyRecoveryPerTurn: currentBonusRecovery,
      currentEnergy: initialCurrentEnergyValue,
      spareBatteriesCount: initialSpareBatteriesCount,
      gameMode: currentMode,
      currentStage: currentStageDefAtTurnStart,
      currentWaveIndex: waveIdxAtTurnStart,
      pendingWaveSpawns: pendingWaveSpawnsFromPrevTurn,
      turnNumber: currentTurnNum,
      waveTriggerTurn: initialWaveTriggerTurn,
      dataChips: initialDataChips,
      spareBatteriesOnMap: initialSpareBatteries,
      score: initialScore,
      playerLevel: initialPlayerLevel,
      currentExp: initialCurrentExp,
      expToNextLevel: initialExpToNextLevel,
      upgradePoints: initialUpgradePoints,
      comboCount: initialComboCount,
      currentComboBaseScore: initialCurrentComboBaseScore,
      isUpgradeSelection: initialIsUpgradeSelection,
      escapePortalPosition: initialEscapePortalPosition,
    } = initialGS

    if (!playerAtTurnStartFromInitialGS) {
      addMessage('MESSAGE_CRITICAL_ERROR_DRONE_OFFLINE')
      setGameState((prev) => ({ ...prev, isProcessingEnemyTurn: false, gamePhase: 'PlayerTurn' }))
      return
    }

    let tempPlayerState = { ...playerAtTurnStartFromInitialGS }

    setGameState((prev) => ({ ...prev, isProcessingEnemyTurn: true, gamePhase: 'Animating' }))

    const playerHexIdAtTurnStart = axialToId(tempPlayerState.q, tempPlayerState.r)
    const actualPendingSpawnHexesForPathing = pendingWaveSpawnsFromPrevTurn
      ? pendingWaveSpawnsFromPrevTurn.map((pws) => pws.location)
      : []
    const pendingSpawnHexIdsForPathing = new Set(
      (actualPendingSpawnHexesForPathing || []).map((loc) => axialToId(loc.q, loc.r))
    )

    const activeJammerEffectAtSpawnTime = playerActiveBuffsAtTurnStart.jammerFieldEffect

    let energyRecoveredFromChargeField = 0
    let strongestRecoveryAmount = 0
    let recoveryEffectPos: AxialCoordinates | null = null

    if (chargeFieldsAtTurnStartSnapshot.length > 0) {
      for (const field of chargeFieldsAtTurnStartSnapshot) {
        if (axialDistance(tempPlayerState, field) <= field.effectRadius) {
          if (field.recoveryAmount > strongestRecoveryAmount) {
            strongestRecoveryAmount = field.recoveryAmount
            recoveryEffectPos = { q: tempPlayerState.q, r: tempPlayerState.r }
          }
        }
      }
      if (strongestRecoveryAmount > 0 && initialCurrentEnergyValue < currentMaxEnergy) {
        energyRecoveredFromChargeField = Math.min(strongestRecoveryAmount, currentMaxEnergy - initialCurrentEnergyValue)
        addMessage('MESSAGE_ENERGY_RECOVERED_FROM_CHARGE_FIELD', { amount: energyRecoveredFromChargeField })
      }
    }

    let enemiesWithCalculatedFirstMove = enemiesAtTurnStart.map((enemy) => {
      let updatedEnemy = { ...enemy }
      if (updatedEnemy.isStunnedTurns > 0) {
        return updatedEnemy
      }
      const effectiveSightRange = updatedEnemy.level

      let newPos = { q: updatedEnemy.q, r: updatedEnemy.r }
      const allOccupiedHexIdsByOtherChars = new Set<string>()
      allOccupiedHexIdsByOtherChars.add(playerHexIdAtTurnStart)
      pendingSpawnHexIdsForPathing.forEach((id) => allOccupiedHexIdsByOtherChars.add(id))
      enemiesAtTurnStart.forEach((otherE) => {
        if (otherE.id !== updatedEnemy.id) allOccupiedHexIdsByOtherChars.add(axialToId(otherE.q, otherE.r))
      })
      collectorDronesAtTurnStartSnapshot.forEach((cd) => allOccupiedHexIdsByOtherChars.add(axialToId(cd.q, cd.r)))

      const neighbors = getNeighbors(updatedEnemy).filter((n: AxialCoordinates) => {
        const hexId = axialToId(n.q, n.r)
        const hex: Hex | undefined = currentHexes.get(hexId)
        const isBarricadeThere = barricadesAtTurnStartSnapshot.some((b) => b.q === n.q && b.r === n.r)
        const isCollectorDroneThere = collectorDronesAtTurnStartSnapshot.some((cd) => cd.q === n.q && cd.r === n.r)
        return hex && !hex.isWall && !isBarricadeThere && !isCollectorDroneThere
      })

      if (neighbors.length > 0) {
        let playerInSight = axialDistance(updatedEnemy, tempPlayerState) <= effectiveSightRange
        if (playerInSight && playerActiveBuffsAtTurnStart.stealth.isActive) {
          const stealthStats = ARMAMENT_STATS_GETTERS.stealth(currentArmamentLevels.stealth) as StealthStats
          if (Math.random() > stealthStats.avoidanceChance / 100) {
            addLog({
              type: 'INFO',
              message: String(t('MESSAGE_HOSTILE_DETECTS_STEALTHED_PLAYER', { q: updatedEnemy.q, r: updatedEnemy.r })),
            })
          } else {
            playerInSight = false
            updatedEnemy.showStealthAvoidanceEffect = true
            addLog({
              type: 'INFO',
              message: String(t('MESSAGE_HOSTILE_FAILS_TO_DETECT_STEALTHED', { q: updatedEnemy.q, r: updatedEnemy.r })),
            })
          }
        }
        if (playerInSight) {
          const evaluatedNeighbors = neighbors.map((n) => ({ hex: n, dist: axialDistance(n, tempPlayerState) }))
          const groupedByDistance: { [key: number]: AxialCoordinates[] } = {}
          for (const evalNeighbor of evaluatedNeighbors) {
            if (!groupedByDistance[evalNeighbor.dist]) groupedByDistance[evalNeighbor.dist] = []
            groupedByDistance[evalNeighbor.dist].push(evalNeighbor.hex)
          }
          const sortedDistances = Object.keys(groupedByDistance)
            .map(Number)
            .sort((a, b) => a - b)
          let chosenMove: AxialCoordinates | null = null
          for (const dist of sortedDistances) {
            const hexesAtThisDistance = groupedByDistance[dist]
            const availableHexesAtThisDistance = hexesAtThisDistance.filter((h) => {
              const hexId = axialToId(h.q, h.r)
              return hexId === playerHexIdAtTurnStart || !allOccupiedHexIdsByOtherChars.has(hexId)
            })
            if (availableHexesAtThisDistance.length > 0) {
              chosenMove = availableHexesAtThisDistance[Math.floor(Math.random() * availableHexesAtThisDistance.length)]
              break
            }
          }
          if (chosenMove) newPos = chosenMove
        } else {
          const trulyEmptyNeighbors = neighbors.filter((n) => !allOccupiedHexIdsByOtherChars.has(axialToId(n.q, n.r)))
          if (trulyEmptyNeighbors.length > 0)
            newPos = trulyEmptyNeighbors[Math.floor(Math.random() * trulyEmptyNeighbors.length)]
        }
      }
      updatedEnemy.q = newPos.q
      updatedEnemy.r = newPos.r
      return updatedEnemy
    })

    let resolvedEnemyStatesAfterFirstMove: Enemy[] = []
    const finalOccupiedByMoversThisTurn = new Set<string>()

    resolvedEnemyStatesAfterFirstMove = enemiesAtTurnStart.map((originalEnemy) => {
      let enemyAfterIndividualLogic = enemiesWithCalculatedFirstMove.find((e) => e.id === originalEnemy.id)

      if (!enemyAfterIndividualLogic) {
        addLog({
          type: 'INFO',
          message: `Error: Could not find enemy ${originalEnemy.id} in enemiesWithCalculatedFirstMove during collision resolution.`,
        })
        return originalEnemy
      }
      if (enemyAfterIndividualLogic.isStunnedTurns > 0) return enemyAfterIndividualLogic

      if (enemyAfterIndividualLogic.q === originalEnemy.q && enemyAfterIndividualLogic.r === originalEnemy.r) {
        return enemyAfterIndividualLogic
      }

      const targetHexId = axialToId(enemyAfterIndividualLogic.q, enemyAfterIndividualLogic.r)
      if (targetHexId === playerHexIdAtTurnStart) {
        return enemyAfterIndividualLogic
      }

      if (finalOccupiedByMoversThisTurn.has(targetHexId)) {
        if (
          barricadesAtTurnStartSnapshot.some(
            (b) => b.q === enemyAfterIndividualLogic!.q && b.r === enemyAfterIndividualLogic!.r
          )
        ) {
          addMessage('MESSAGE_HOSTILE_PATH_BLOCKED_BY_BARRICADE', {
            level: originalEnemy.level,
            q: originalEnemy.q,
            r: originalEnemy.r,
          })
        } else if (
          collectorDronesAtTurnStartSnapshot.some(
            (cd) => cd.q === enemyAfterIndividualLogic!.q && cd.r === enemyAfterIndividualLogic!.r
          )
        ) {
          addMessage('MESSAGE_HOSTILE_PATH_BLOCKED_BY_COLLECTOR_DRONE', {
            level: originalEnemy.level,
            q: originalEnemy.q,
            r: originalEnemy.r,
          })
        } else {
          addLog({
            type: 'INFO',
            message: String(
              t('MESSAGE_HOSTILE_PATH_BLOCKED', { level: originalEnemy.level, q: originalEnemy.q, r: originalEnemy.r })
            ),
          })
        }
        return {
          ...enemyAfterIndividualLogic,
          q: originalEnemy.q,
          r: originalEnemy.r,
        }
      }

      finalOccupiedByMoversThisTurn.add(targetHexId)
      return enemyAfterIndividualLogic
    })

    setGameState((prev) => ({
      ...prev,
      enemies: resolvedEnemyStatesAfterFirstMove,
      showChargeFieldRecoveryEffectAt: recoveryEffectPos,
    }))
    if (recoveryEffectPos) {
      await new Promise((resolve) => setTimeout(resolve, CHARGE_FIELD_RECOVERY_EFFECT_DURATION_MS))
      setGameState((prev) => ({ ...prev, showChargeFieldRecoveryEffectAt: null }))
    }
    await new Promise((resolve) => setTimeout(resolve, ANIMATION_DURATION_MS))

    let currentLivingEnemies = [...resolvedEnemyStatesAfterFirstMove]
    let playerWillBeDefeated = false
    let anyTrapTriggeredThisTurn = false
    let trapsAfterInteraction = [...trapsAtTurnStartSnapshot]

    for (const enemy of currentLivingEnemies) {
      if (enemy.isStunnedTurns === 0 && enemy.q === tempPlayerState.q && enemy.r === tempPlayerState.r) {
        playerWillBeDefeated = true
      }
    }

    if (!playerWillBeDefeated) {
      const trapStats =
        currentArmamentLevels.trap > 0
          ? (ARMAMENT_STATS_GETTERS.trap(currentArmamentLevels.trap) as EmpTrapStats)
          : null
      if (trapStats && trapStats.stunDuration > 0) {
        currentLivingEnemies = currentLivingEnemies.map((enemy) => {
          if (enemy.isStunnedTurns > 0 && !trapsAfterInteraction.some((t) => t.q === enemy.q && t.r === enemy.r))
            return enemy
          const trapIndex = trapsAfterInteraction.findIndex((t) => t.q === enemy.q && t.r === enemy.r)
          if (trapIndex !== -1) {
            addMessage('MESSAGE_HOSTILE_HIT_EMP_TRAP', { q: enemy.q, r: enemy.r, stunDuration: trapStats.stunDuration })
            const updatedEnemy = { ...enemy, isStunnedTurns: enemy.isStunnedTurns + trapStats.stunDuration }
            trapsAfterInteraction.splice(trapIndex, 1)
            anyTrapTriggeredThisTurn = true
            return updatedEnemy
          }
          return enemy
        })
      }
    }

    currentLivingEnemies.forEach((enemy) => {
      const originalEnemyState = enemiesAtTurnStart.find((oe) => oe.id === enemy.id)
      const justGotStunnedByTrap =
        anyTrapTriggeredThisTurn &&
        trapsAtTurnStartSnapshot.some((trapBefore) => trapBefore.q === enemy.q && trapBefore.r === enemy.r) &&
        !trapsAfterInteraction.some((trapAfter) => trapAfter.q === enemy.q && trapAfter.r === enemy.r) &&
        originalEnemyState &&
        originalEnemyState.isStunnedTurns === 0 &&
        enemy.isStunnedTurns > 0

      if (
        enemy.isStunnedTurns > 0 &&
        !justGotStunnedByTrap &&
        enemy.isStunnedTurns === (originalEnemyState?.isStunnedTurns || 0)
      ) {
        addMessage('MESSAGE_HOSTILE_STUNNED', { q: enemy.q, r: enemy.r, turns: enemy.isStunnedTurns })
      }
    })

    let dataChipsAfterSpawning = [...initialDataChips]
    let spareBatteriesAfterSpawning = [...initialSpareBatteries]

    if (currentMode === 'stage') {
      const stageItems = handleStageItemSpawningInternal(
        currentTurnNum,
        currentStageDefAtTurnStart,
        tempPlayerState,
        currentHexes,
        dataChipsAfterSpawning,
        spareBatteriesAfterSpawning,
        trapsAfterInteraction,
        initialEscapePortalPosition,
        actualPendingSpawnHexesForPathing,
        collectorDronesAtTurnStartSnapshot,
        currentLivingEnemies,
        addMessage
      )
      dataChipsAfterSpawning = stageItems.updatedDataChips
      spareBatteriesAfterSpawning = stageItems.updatedSpareBatteries
    }

    const occupiedHexesForSpawning = new Set<string>()
    occupiedHexesForSpawning.add(playerHexIdAtTurnStart)
    currentLivingEnemies.forEach((e) => occupiedHexesForSpawning.add(axialToId(e.q, e.r)))
    collectorDronesAtTurnStartSnapshot.forEach((cd) => occupiedHexesForSpawning.add(axialToId(cd.q, cd.r)))
    pendingSpawnHexIdsForPathing.forEach((id) => occupiedHexesForSpawning.add(id))
    trapsAfterInteraction.forEach((t) => occupiedHexesForSpawning.add(axialToId(t.q, t.r)))
    barricadesAtTurnStartSnapshot.forEach((b) => occupiedHexesForSpawning.add(axialToId(b.q, b.r)))
    chargeFieldsAtTurnStartSnapshot.forEach((cf) => occupiedHexesForSpawning.add(axialToId(cf.q, cf.r)))
    dataChipsAfterSpawning.forEach((i) => occupiedHexesForSpawning.add(axialToId(i.q, i.r)))
    spareBatteriesAfterSpawning.forEach((i) => occupiedHexesForSpawning.add(axialToId(i.q, i.r)))

    if (currentMode === 'endless') {
      if (Math.random() < DATA_CHIP_SPAWN_PROBABILITY) {
        const availableHexes = Array.from(currentHexes.values()).filter(
          (h: Hex) =>
            h &&
            !h.isWall &&
            axialDistance(h, tempPlayerState) >= DATA_CHIP_MIN_SPAWN_DISTANCE_FROM_PLAYER &&
            !occupiedHexesForSpawning.has(axialToId(h.q, h.r))
        )
        if (availableHexes.length > 0) {
          const spawnHex = availableHexes[Math.floor(Math.random() * availableHexes.length)]
          const newChip = { id: nanoid(), q: spawnHex.q, r: spawnHex.r, expValue: DATA_CHIP_CONFIG.baseValue, count: 1 }
          dataChipsAfterSpawning = [...dataChipsAfterSpawning, newChip]
          addMessage('MESSAGE_ITEM_DETECTED_ON_MAP', { itemName: String(t(DATA_CHIP_CONFIG.nameKey)) })
          occupiedHexesForSpawning.add(axialToId(newChip.q, newChip.r))
        }
      }
      if (Math.random() < SPARE_BATTERY_SPAWN_PROBABILITY) {
        const availableHexes = Array.from(currentHexes.values()).filter(
          (h: Hex) =>
            h &&
            !h.isWall &&
            axialDistance(h, tempPlayerState) >= SPARE_BATTERY_MIN_SPAWN_DISTANCE_FROM_PLAYER &&
            !occupiedHexesForSpawning.has(axialToId(h.q, h.r))
        )
        if (availableHexes.length > 0) {
          const spawnHex = availableHexes[Math.floor(Math.random() * availableHexes.length)]
          const newBattery = { id: nanoid(), q: spawnHex.q, r: spawnHex.r, count: 1 }
          spareBatteriesAfterSpawning = [...spareBatteriesAfterSpawning, newBattery]
          addMessage('MESSAGE_ITEM_DETECTED_ON_MAP', { itemName: String(t(SPARE_BATTERY_CONFIG.nameKey)) })
          occupiedHexesForSpawning.add(axialToId(newBattery.q, newBattery.r))
        }
      }
    }

    let nextTurnWaveSpawnsToStore: { location: AxialCoordinates; enemyConfig: EnemySpawnConfig }[] | null =
      pendingWaveSpawnsFromPrevTurn
    let stageWavesUpdatedForNextTurn = currentStageDefAtTurnStart ? [...currentStageDefAtTurnStart.waves] : []
    let newlySpawnedEnemiesThisPhase: Enemy[] = []
    let waveAdvancedThisTurn = false
    let waveIndexAfterSpawn = waveIdxAtTurnStart
    let nextWaveTriggerFromSpawning: number | null = initialWaveTriggerTurn

    if (
      currentMode === 'stage' &&
      currentStageDefAtTurnStart &&
      waveIdxAtTurnStart < currentStageDefAtTurnStart.waves.length
    ) {
      const currentWaveDefinition = stageWavesUpdatedForNextTurn[waveIdxAtTurnStart]
      if (
        currentTurnNum === currentWaveDefinition.triggerTurn - 1 &&
        !currentWaveDefinition.warningShown &&
        !nextTurnWaveSpawnsToStore
      ) {
        const enemiesDeterminedForWave = determineEnemiesForWave(currentWaveDefinition, ENEMY_COSTS)
        if (enemiesDeterminedForWave.length > 0) {
          const warningLocs = selectSpawnLocations(
            currentMapRad,
            currentHexes,
            enemiesDeterminedForWave.length,
            tempPlayerState,
            currentLivingEnemies,
            null
          )
          if (warningLocs.length === enemiesDeterminedForWave.length) {
            nextTurnWaveSpawnsToStore = enemiesDeterminedForWave.map((enemyConfig, index) => ({
              location: warningLocs[index],
              enemyConfig,
            }))
            stageWavesUpdatedForNextTurn[waveIdxAtTurnStart] = { ...currentWaveDefinition, warningShown: true }
            addMessage('MESSAGE_WAVE_INCOMING_WARNING', {
              locations: warningLocs.map((l) => `(${l.q},${l.r})`).join(', '),
            })
          } else
            addLog({
              type: 'INFO',
              message: `Stage warning: Not enough spawn locs for wave ${waveIdxAtTurnStart + 1}. Required ${
                enemiesDeterminedForWave.length
              }, found ${warningLocs.length}`,
            })
        } else addLog({ type: 'INFO', message: `Stage warning: No enemies for wave ${waveIdxAtTurnStart + 1}.` })
      }
    }

    if (currentMode === 'endless') {
      const availableHexesForEndlessSpawn = Array.from(currentHexes.values()).filter(
        (h: Hex) => h && !h.isWall && !occupiedHexesForSpawning.has(axialToId(h.q, h.r))
      )
      const safeHexesFar = availableHexesForEndlessSpawn.filter(
        (h: Hex) => axialDistance(h, tempPlayerState) >= ENEMY_MIN_SPAWN_DISTANCE_FROM_PLAYER
      )

      let didSpawnEndless = false
      let spawnedOriginalLv: number | undefined = undefined
      let chance = 0
      let roll = Math.random()
      let debugMessage = ''
      if (safeHexesFar.length > 0) {
        const currentTotalEnemyCount = currentLivingEnemies.length
        const safeRatio = safeHexesFar.length / Math.max(1, currentHexes.size)
        const fillRatio = targetEnemyCount > 0 ? Math.min(1, currentTotalEnemyCount / targetEnemyCount) : 1

        chance =
          ENEMY_SPAWN_BASE_PROBABILITY * safeRatio * (ENEMY_SPAWN_DENSITY_FACTOR - fillRatio) +
          ENEMY_SPAWN_MIN_PROBABILITY

        const endlessSpawnConfig = ENDLESS_MODE_SPAWN_CONFIG
        let activeEpoch: TurnBasedSpawnEpoch | null = null
        for (let i = endlessSpawnConfig.length - 1; i >= 0; i--) {
          if (currentTurnNum >= endlessSpawnConfig[i].turnStart) {
            activeEpoch = endlessSpawnConfig[i]
            break
          }
        }

        if (activeEpoch) {
          if (activeEpoch.spawnProbabilityOverride !== undefined) {
            chance = activeEpoch.spawnProbabilityOverride
            debugMessage += ` | Override: ${activeEpoch.spawnProbabilityOverride.toFixed(2)}`
          } else if (activeEpoch.spawnProbabilityMultiplier !== undefined) {
            chance *= activeEpoch.spawnProbabilityMultiplier
            debugMessage += ` | Multiplier: x${activeEpoch.spawnProbabilityMultiplier}`
          }
        }

        chance = Math.max(0, Math.min(1, chance))
        didSpawnEndless = roll < chance
        if (didSpawnEndless && currentTotalEnemyCount < currentHexes.size * 0.5) {
          const enemyTypeAndLevel = getEnemyTypeAndLevelForEndlessMode(currentTurnNum, ENDLESS_MODE_SPAWN_CONFIG)
          if (enemyTypeAndLevel) {
            spawnedOriginalLv = enemyTypeAndLevel.level
            const candidates = safeHexesFar.map((h_1: Hex) => ({
              hex: h_1,
              weight: 1 / ((currentHexes.get(axialToId(h_1.q, h_1.r))?.dangerLevel || 0) + 1),
            }))
            const totalW = candidates.reduce((s, c) => s + c.weight, 0)
            let rVal = Math.random() * totalW
            let chosenH: Hex | null = null
            for (const cand of candidates) {
              if (rVal < cand.weight) {
                chosenH = cand.hex
                break
              }
              rVal -= cand.weight
            }
            if (!chosenH && candidates.length > 0) {
              const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)]
              chosenH = randomCandidate ? randomCandidate.hex : null
            }
            if (chosenH && spawnedOriginalLv !== undefined) {
              let effectiveLevelForSpawn = spawnedOriginalLv
              if (activeJammerEffectAtSpawnTime.isActive) {
                effectiveLevelForSpawn = Math.max(
                  0,
                  spawnedOriginalLv - activeJammerEffectAtSpawnTime.levelReductionAmount
                )
              }
              const newEnemy: Enemy = {
                id: nanoid(),
                q: chosenH.q,
                r: chosenH.r,
                originalLevel: spawnedOriginalLv,
                level: effectiveLevelForSpawn,
                sightRange: effectiveLevelForSpawn,
                scoreValue: getEnemyScoreValue(spawnedOriginalLv),
                color: ENEMY_LEVEL_COLORS[effectiveLevelForSpawn] || ENEMY_DEFAULT_COLOR,
                isStunnedTurns: 0,
                isNewlySpawned: true,
              }
              newlySpawnedEnemiesThisPhase.push(newEnemy)
              addMessage(t('MESSAGE_NEW_HOSTILE_DETECTED', { level: spawnedOriginalLv, q: chosenH.q, r: chosenH.r }))
            } else didSpawnEndless = false
          } else didSpawnEndless = false
        } else if (didSpawnEndless) {
          didSpawnEndless = false
          debugMessage += ` | Capped by max enemy ratio`
        }
      }
      addLog({
        type: 'SPAWN',
        payload: {
          didSpawn: didSpawnEndless,
          enemyCount: currentLivingEnemies.length,
          targetEnemyCount,
          enemyFillRatio: targetEnemyCount > 0 ? Math.min(1, currentLivingEnemies.length / targetEnemyCount) : 1,
          safeHexesCount: safeHexesFar.length,
          totalHexesCount: currentHexes.size,
          safeTileRatio: safeHexesFar.length / Math.max(1, currentHexes.size),
          spawnChance: chance,
          randomNumber: roll,
          spawnedEnemyLevel: didSpawnEndless && spawnedOriginalLv !== undefined ? spawnedOriginalLv : undefined,
          debugMessage: debugMessage.trim(),
        },
      })
    } else if (
      currentMode === 'stage' &&
      currentStageDefAtTurnStart &&
      waveIdxAtTurnStart < currentStageDefAtTurnStart.waves.length
    ) {
      const waveDefinitionToSpawn = stageWavesUpdatedForNextTurn[waveIdxAtTurnStart]
      if (
        currentTurnNum === waveDefinitionToSpawn.triggerTurn &&
        pendingWaveSpawnsFromPrevTurn &&
        pendingWaveSpawnsFromPrevTurn.length > 0
      ) {
        for (const pendingEnemy of pendingWaveSpawnsFromPrevTurn) {
          const spawnLoc = pendingEnemy.location
          const enemyConfig = pendingEnemy.enemyConfig
          if (axialToId(spawnLoc.q, spawnLoc.r) === playerHexIdAtTurnStart) {
            addLog({ type: 'INFO', message: `Player at ${spawnLoc.q},${spawnLoc.r} blocks stage spawn.` })
            continue
          }
          const enemyOriginalLevel = enemyConfig.level
          let effectiveLevelForSpawn = enemyOriginalLevel
          if (activeJammerEffectAtSpawnTime.isActive) {
            effectiveLevelForSpawn = Math.max(
              0,
              enemyOriginalLevel - activeJammerEffectAtSpawnTime.levelReductionAmount
            )
          }
          const newEnemy: Enemy = {
            id: nanoid(),
            q: spawnLoc.q,
            r: spawnLoc.r,
            originalLevel: enemyOriginalLevel,
            level: effectiveLevelForSpawn,
            sightRange: effectiveLevelForSpawn,
            scoreValue: getEnemyScoreValue(enemyOriginalLevel),
            color: ENEMY_LEVEL_COLORS[effectiveLevelForSpawn] || ENEMY_DEFAULT_COLOR,
            isStunnedTurns: 0,
            isNewlySpawned: true,
          }
          newlySpawnedEnemiesThisPhase.push(newEnemy)
          addMessage(
            t('MESSAGE_NEW_HOSTILE_DETECTED_STAGE', {
              level: Number(enemyOriginalLevel),
              q: Number(spawnLoc.q),
              r: Number(spawnLoc.r),
              wave: Number(waveIdxAtTurnStart + 1),
            })
          )
        }
        nextTurnWaveSpawnsToStore = null
        waveAdvancedThisTurn = true
        waveIndexAfterSpawn = waveIdxAtTurnStart + 1
        if (stageWavesUpdatedForNextTurn[waveIdxAtTurnStart])
          stageWavesUpdatedForNextTurn[waveIdxAtTurnStart] = {
            ...stageWavesUpdatedForNextTurn[waveIdxAtTurnStart],
            warningShown: false,
          }
      } else if (currentTurnNum === waveDefinitionToSpawn.triggerTurn) {
        addLog({
          type: 'INFO',
          message: `Stage spawn: Trigger turn ${currentTurnNum} for wave ${
            waveIdxAtTurnStart + 1
          }, but no pre-determined enemies. Advancing wave.`,
        })
        waveAdvancedThisTurn = true
        waveIndexAfterSpawn = waveIdxAtTurnStart + 1
        nextTurnWaveSpawnsToStore = null
        if (stageWavesUpdatedForNextTurn[waveIdxAtTurnStart])
          stageWavesUpdatedForNextTurn[waveIdxAtTurnStart] = {
            ...stageWavesUpdatedForNextTurn[waveIdxAtTurnStart],
            warningShown: false,
          }
      }
    }
    if (
      waveAdvancedThisTurn &&
      currentStageDefAtTurnStart &&
      waveIndexAfterSpawn < currentStageDefAtTurnStart.waves.length
    )
      nextWaveTriggerFromSpawning = currentStageDefAtTurnStart.waves[waveIndexAfterSpawn].triggerTurn
    else if (
      waveAdvancedThisTurn &&
      currentStageDefAtTurnStart &&
      waveIndexAfterSpawn >= currentStageDefAtTurnStart.waves.length
    )
      nextWaveTriggerFromSpawning = null

    let newEscapePortalPos: AxialCoordinates | null = initialEscapePortalPosition
    if (
      currentMode === 'stage' &&
      currentStageDefAtTurnStart &&
      !newEscapePortalPos &&
      currentStageDefAtTurnStart.totalTurns > 0 &&
      currentTurnNum >= currentStageDefAtTurnStart.totalTurns - 1
    ) {
      const allRelevantOccupiedHexIds = new Set<string>([
        playerHexIdAtTurnStart,
        ...currentLivingEnemies.map((e) => axialToId(e.q, e.r)),
        ...newlySpawnedEnemiesThisPhase.map((e) => axialToId(e.q, e.r)),
        ...(nextTurnWaveSpawnsToStore || []).map((pws) => axialToId(pws.location.q, pws.location.r)),
      ])
      const availableHexesForPortal = Array.from(currentHexes.values()).filter(
        (h: Hex) =>
          h &&
          !h.isWall &&
          axialDistance(h, tempPlayerState) >= ESCAPE_PORTAL_MIN_DISTANCE_FROM_PLAYER &&
          !allRelevantOccupiedHexIds.has(h.id)
      )
      if (availableHexesForPortal.length > 0) {
        newEscapePortalPos = availableHexesForPortal[Math.floor(Math.random() * availableHexesForPortal.length)]
        if (newEscapePortalPos) {
          addMessage('MESSAGE_ESCAPE_PORTAL_SPAWNED', { q: newEscapePortalPos.q, r: newEscapePortalPos.r })
        }
      } else {
        addMessage('MESSAGE_ESCAPE_PORTAL_SPAWN_FAILED')
      }
    }

    const barricadesAfterTurn = barricadesAtTurnStartSnapshot
      .map((b) => ({ ...b, turnsLeft: b.turnsLeft - 1 }))
      .filter((b) => b.turnsLeft > 0)

    const chargeFieldsAfterTurn = chargeFieldsAtTurnStartSnapshot
      .map((cf) => ({ ...cf, turnsLeft: cf.turnsLeft - 1 }))
      .filter((cf) => cf.turnsLeft > 0)

    const enemiesAfterEffectsDecrement = currentLivingEnemies.map((e) => {
      let updatedEnemy = { ...e }
      if (updatedEnemy.isStunnedTurns > 0) {
        updatedEnemy.isStunnedTurns -= 1
      }
      return updatedEnemy
    })

    let finalEnemiesForState = [...enemiesAfterEffectsDecrement, ...newlySpawnedEnemiesThisPhase]

    finalEnemiesForState = finalEnemiesForState.map((e) => ({
      ...e,
      isNewlySpawned: false,
      showStealthAvoidanceEffect: false,
    }))

    let newPlayerActiveBuffs = { ...playerActiveBuffsAtTurnStart }
    if (newPlayerActiveBuffs.stealth.isActive) {
      newPlayerActiveBuffs.stealth.turnsLeft -= 1
      if (newPlayerActiveBuffs.stealth.turnsLeft <= 0) {
        newPlayerActiveBuffs.stealth = { isActive: false, turnsLeft: 0 }
        addMessage('MESSAGE_STEALTH_DISENGAGED')
      }
    }

    const jammerEffectThisTurn = newPlayerActiveBuffs.jammerFieldEffect
    if (jammerEffectThisTurn.isActive) {
      const newTurnsLeft = jammerEffectThisTurn.turnsLeft - 1
      if (newTurnsLeft <= 0) {
        newPlayerActiveBuffs.jammerFieldEffect = { isActive: false, turnsLeft: 0, levelReductionAmount: 0 }
        addMessage('MESSAGE_JAMMER_GLOBAL_EFFECT_WORE_OFF')
        finalEnemiesForState = finalEnemiesForState.map((enemy) => {
          if (enemy.level !== enemy.originalLevel) {
            addMessage('MESSAGE_JAMMER_EFFECT_WORE_OFF_ENEMY', { q: enemy.q, r: enemy.r })
            return { ...enemy, level: enemy.originalLevel, sightRange: enemy.originalLevel }
          }
          return enemy
        })
      } else {
        newPlayerActiveBuffs.jammerFieldEffect = { ...jammerEffectThisTurn, turnsLeft: newTurnsLeft }
      }
    }

    if (newPlayerActiveBuffs.overheat.isActive) {
      const crashBombStats = ARMAMENT_STATS_GETTERS.crash_bomb(currentArmamentLevels.crash_bomb) as CrashBombStats
      newPlayerActiveBuffs.overheat.currentHeat = Math.max(
        0,
        newPlayerActiveBuffs.overheat.currentHeat - crashBombStats.coolingRatePerTurn
      )
      if (newPlayerActiveBuffs.overheat.currentHeat <= 0) {
        newPlayerActiveBuffs.overheat = { isActive: false, currentHeat: 0 }
        addMessage('MESSAGE_OVERHEAT_WORE_OFF')
      }
    }

    newPlayerActiveBuffs.boosterUsesThisTurn = 0
    newPlayerActiveBuffs.boosterActiveThisTurn = false
    newPlayerActiveBuffs.boosterActionsAvailableThisTurn = 0

    let energyRecoveryThisTurn = INITIAL_ENERGY_RECOVERY_PER_TURN + currentBonusRecovery
    if (newPlayerActiveBuffs.overheat.isActive) {
      energyRecoveryThisTurn = 0
    }

    const newPlayerEnergy = Math.min(
      currentMaxEnergy,
      initialCurrentEnergyValue + energyRecoveryThisTurn + energyRecoveredFromChargeField
    )
    const nextTurnDisplayNumber = currentTurnNum + 1

    let finalComboCount = initialComboCount
    let finalComboBaseScore = initialCurrentComboBaseScore
    if (!initialGS.defeatedEnemyThisTurnCycle && !anyTrapTriggeredThisTurn) {
      finalComboCount = 0
      finalComboBaseScore = 0
    }

    const stateAboutToBeFinalized: Partial<GameLogicState> = {
      enemies: finalEnemiesForState,
      player: tempPlayerState,
      placedEmpTraps: trapsAfterInteraction,
      placedBarricades: barricadesAfterTurn,
      placedChargeFields: chargeFieldsAfterTurn,
      dataChips: dataChipsAfterSpawning,
      spareBatteriesOnMap: spareBatteriesAfterSpawning,
      pendingWaveSpawns: nextTurnWaveSpawnsToStore,
      pendingSpawnLocations: nextTurnWaveSpawnsToStore ? nextTurnWaveSpawnsToStore.map((pws) => pws.location) : null,
      currentStage: currentStageDefAtTurnStart
        ? { ...currentStageDefAtTurnStart, waves: stageWavesUpdatedForNextTurn }
        : null,
      currentWaveIndex: waveIndexAfterSpawn,
      waveTriggerTurn: nextWaveTriggerFromSpawning,
      escapePortalPosition: newEscapePortalPos,
      activeBuffs: newPlayerActiveBuffs,
      currentEnergy: newPlayerEnergy,
      turnNumber: nextTurnDisplayNumber,
      playerActionsRemaining: 1,
      defeatedEnemyThisTurnCycle: false,
      comboCount: finalComboCount,
      currentComboBaseScore: finalComboBaseScore,
      isProcessingEnemyTurn: false,
    }

    let gamePhaseForRewindState: GamePhase = 'PlayerTurn'
    let actualNextGamePhase: GamePhase = 'PlayerTurn'

    if (playerWillBeDefeated) {
      gamePhaseForRewindState = 'PlayerTurn'
      actualNextGamePhase = 'GameOver'
    } else if (
      currentMode === 'stage' &&
      newEscapePortalPos &&
      tempPlayerState.q === newEscapePortalPos.q &&
      tempPlayerState.r === newEscapePortalPos.r
    ) {
      gamePhaseForRewindState = 'StageComplete'
      actualNextGamePhase = 'StageComplete'
    } else if (initialIsUpgradeSelection) {
      gamePhaseForRewindState = 'UpgradeSelection'
      actualNextGamePhase = 'UpgradeSelection'
    }

    const preciseStateForRewind: GameLogicState = {
      ...initialGS,
      enemies: stateAboutToBeFinalized.enemies!,
      player: playerAtTurnStartFromInitialGS,
      placedEmpTraps: stateAboutToBeFinalized.placedEmpTraps!,
      placedBarricades: stateAboutToBeFinalized.placedBarricades!,
      placedChargeFields: stateAboutToBeFinalized.placedChargeFields!,
      placedCollectorDrones: initialGS.placedCollectorDrones,
      dataChips: stateAboutToBeFinalized.dataChips!,
      spareBatteriesOnMap: stateAboutToBeFinalized.spareBatteriesOnMap!,
      pendingWaveSpawns: stateAboutToBeFinalized.pendingWaveSpawns,
      pendingSpawnLocations: stateAboutToBeFinalized.pendingSpawnLocations,
      currentStage: stateAboutToBeFinalized.currentStage,
      currentWaveIndex: stateAboutToBeFinalized.currentWaveIndex!,
      waveTriggerTurn: stateAboutToBeFinalized.waveTriggerTurn,
      escapePortalPosition: stateAboutToBeFinalized.escapePortalPosition,
      activeBuffs: stateAboutToBeFinalized.activeBuffs!,
      currentEnergy: stateAboutToBeFinalized.currentEnergy!,
      score: initialScore,
      playerLevel: initialPlayerLevel,
      currentExp: initialCurrentExp,
      expToNextLevel: initialExpToNextLevel,
      upgradePoints: initialUpgradePoints,
      spareBatteriesCount: initialSpareBatteriesCount,
      turnNumber: stateAboutToBeFinalized.turnNumber!,
      playerActionsRemaining: stateAboutToBeFinalized.playerActionsRemaining!,
      defeatedEnemyThisTurnCycle: stateAboutToBeFinalized.defeatedEnemyThisTurnCycle!,
      comboCount: stateAboutToBeFinalized.comboCount!,
      currentComboBaseScore: stateAboutToBeFinalized.currentComboBaseScore!,
      gamePhase: gamePhaseForRewindState,
    }

    if (playerAtTurnStartFromInitialGS && initialGS.turnNumber < (stateAboutToBeFinalized.turnNumber || 0)) {
      saveStateForRewind(deepCloneGameState(preciseStateForRewind))
    }

    setGameState((prev) => ({
      ...prev,
      ...stateAboutToBeFinalized,
      gamePhase: actualNextGamePhase,
    }))

    if (actualNextGamePhase === 'GameOver') {
      if (tempPlayerState) {
        addMessage('MESSAGE_DRONE_CRITICALLY_DAMAGED', { q: tempPlayerState.q, r: tempPlayerState.r })
      } else {
        addMessage('MESSAGE_DRONE_CRITICALLY_DAMAGED_NO_COORDS')
      }
    } else if (actualNextGamePhase === 'StageComplete') {
      addMessage('MESSAGE_ESCAPE_PORTAL_ENTERED')
    } else if (actualNextGamePhase === 'UpgradeSelection') {
      addMessage('MESSAGE_AWAITING_SYSTEM_ENHANCEMENT')
    }
  }, [
    gameState,
    setGameState,
    addMessage,
    t,
    addLog,
    getEnemyTypeAndLevelForEndlessMode,
    getEnemyScoreValue,
    determineEnemiesForWave,
    selectSpawnLocations,
    handleStageItemSpawningInternal,
    targetEnemyCount,
    saveStateForRewind,
  ])

  return { processCollectorDroneActions, processEnemyTurns }
}
