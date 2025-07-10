import { useCallback } from 'react'
import {
  AxialCoordinates,
  Hex,
  Player,
  Enemy,
  WaveDefinition,
  EnemySpawnConfig,
  DataChipPickup,
  SpareBatteryPickup,
  PlacedTrap,
  StageDefinition,
  ItemSpawnEventDefinition,
  TurnBasedEnemySpawnConfig,
  CollectorDroneEntity,
} from '../../types'
import {
  ENEMY_COSTS,
  STAGE_SPAWN_CANDIDATE_HEXES_COUNT,
  STAGE_WAVE_SPAWN_LOCATIONS_COUNT,
  ENEMY_MIN_SPAWN_DISTANCE_FROM_PLAYER,
  DATA_CHIP_MIN_SPAWN_DISTANCE_FROM_PLAYER,
  DATA_CHIP_CONFIG,
  SPARE_BATTERY_CONFIG,
} from '../../constants'
import { axialToId, axialDistance } from '../../utils/hexUtils'
import { nanoid } from 'nanoid'

export const useSpawnAndStageHelpers = (
  t: (key: string, params?: Record<string, string | number>) => string,
  addLog: (logData: any) => void
) => {
  const getEnemyScoreValue = useCallback((level: number): number => {
    return { 1: 20, 2: 40, 3: 60, 4: 90, 5: 130, 6: 170 }[level] || 0
  }, [])

  const getEnemyTypeAndLevelForEndlessMode = useCallback(
    (turnNumber: number, spawnConfig: TurnBasedEnemySpawnConfig): { typeId: string; level: number } | null => {
      let activeEpoch = null
      for (let i = spawnConfig.length - 1; i >= 0; i--) {
        if (turnNumber >= spawnConfig[i].turnStart) {
          activeEpoch = spawnConfig[i]
          break
        }
      }

      if (!activeEpoch || activeEpoch.enemyPool.length === 0) {
        addLog({ type: 'INFO', message: `Endless Spawn: No active epoch or empty pool for turn ${turnNumber}.` })
        return null
      }

      const totalWeight = activeEpoch.enemyPool.reduce((sum, entry) => sum + entry.weight, 0)
      if (totalWeight <= 0) {
        addLog({
          type: 'INFO',
          message: `Endless Spawn: Total weight is 0 for epoch at turn ${turnNumber}. Pool: ${JSON.stringify(
            activeEpoch.enemyPool
          )}`,
        })
        return null
      }

      let randomVal = Math.random() * totalWeight
      for (const entry of activeEpoch.enemyPool) {
        if (randomVal < entry.weight) {
          const level = parseInt(entry.typeId.replace('enemy_lv', ''), 10)
          if (isNaN(level)) {
            addLog({ type: 'INFO', message: `Endless Spawn: Could not parse level from typeId ${entry.typeId}.` })
            return null
          }
          return { typeId: entry.typeId, level }
        }
        randomVal -= entry.weight
      }
      addLog({
        type: 'INFO',
        message: `Endless Spawn: Weighted selection failed to pick an enemy for turn ${turnNumber}. This should not happen if pool/weights are valid.`,
      })
      return null
    },
    [addLog]
  )

  const getEnemyTypeFromPool = useCallback(
    (pool: string[], currentCostRemaining: number, costs: Record<string, number>): string | null => {
      const affordableEnemies = pool.filter((typeId) => costs[typeId] <= currentCostRemaining)
      if (affordableEnemies.length === 0) return null
      return affordableEnemies[Math.floor(Math.random() * affordableEnemies.length)]
    },
    []
  )

  const determineEnemiesForWave = useCallback(
    (waveDef: WaveDefinition, enemyCosts: Record<string, number>): EnemySpawnConfig[] => {
      const enemiesToSpawn: EnemySpawnConfig[] = []
      let costRemaining = waveDef.totalCost
      const maxEnemiesPerWave = 10

      while (costRemaining > 0 && enemiesToSpawn.length < maxEnemiesPerWave) {
        const enemyTypeId = getEnemyTypeFromPool(waveDef.enemyPool, costRemaining, enemyCosts)
        if (!enemyTypeId) break

        const parsedLevel = parseInt(enemyTypeId.replace('enemy_lv', ''), 10)
        if (isNaN(parsedLevel)) {
          addLog({
            type: 'INFO',
            message: `Stage enemy spawn: Could not parse level from typeId '${enemyTypeId}'. Defaulting to level 2.`,
          })
        }
        const enemyLevel = !isNaN(parsedLevel) ? parsedLevel : 2 // Default to level 2 if parsing fails

        enemiesToSpawn.push({ typeId: enemyTypeId, level: enemyLevel, q: 0, r: 0 })
        costRemaining -= enemyCosts[enemyTypeId]
      }
      return enemiesToSpawn
    },
    [getEnemyTypeFromPool, addLog]
  )

  const selectSpawnLocations = useCallback(
    (
      currentMapRad: number,
      hexMap: Map<string, Hex>,
      numHexesToSelect: number,
      playerPos: Player | null,
      existingEnemies: Enemy[],
      currentPendingSpawnsForThisSelection: AxialCoordinates[] | null,
      isSpawningItems: boolean = false
    ): AxialCoordinates[] => {
      const candidates: AxialCoordinates[] = []
      const edgeHexCoordinates: AxialCoordinates[] = [
        { q: currentMapRad, r: 0 },
        { q: -currentMapRad, r: 0 },
        { q: 0, r: currentMapRad },
        { q: 0, r: -currentMapRad },
        { q: currentMapRad, r: -currentMapRad },
        { q: -currentMapRad, r: currentMapRad },
      ]

      const isOccupiedByPlayerOrEnemy = (coord: AxialCoordinates) =>
        (playerPos && coord.q === playerPos.q && coord.r === playerPos.r) ||
        existingEnemies.some((e) => e.q === coord.q && e.r === coord.r)

      const isAlreadySelectedForThisBatch = (coord: AxialCoordinates) =>
        currentPendingSpawnsForThisSelection?.some((ps) => ps.q === coord.q && ps.r === ps.r)

      const validEdgeCandidates = edgeHexCoordinates.filter((coord) => {
        const hexId = axialToId(coord.q, coord.r)
        return (
          hexMap.has(hexId) &&
          (isSpawningItems || !isOccupiedByPlayerOrEnemy(coord)) &&
          !isAlreadySelectedForThisBatch(coord)
        )
      })
      candidates.push(...validEdgeCandidates.sort(() => 0.5 - Math.random()))

      if (candidates.length < numHexesToSelect) {
        const otherValidHexes = Array.from(hexMap.values())
          .filter(
            (h) =>
              h &&
              !h.isWall &&
              (isSpawningItems || (playerPos && axialDistance(h, playerPos) > ENEMY_MIN_SPAWN_DISTANCE_FROM_PLAYER)) &&
              (isSpawningItems || !isOccupiedByPlayerOrEnemy(h)) &&
              !candidates.some((c) => c.q === h.q && c.r === h.r) &&
              !edgeHexCoordinates.some((edge) => edge.q === h.q && edge.r === h.r) &&
              !isAlreadySelectedForThisBatch(h)
          )
          .sort(() => 0.5 - Math.random())
        candidates.push(...otherValidHexes)
      }
      const uniqueCandidatesMap = new Map<string, AxialCoordinates>()
      for (const cand of candidates) {
        if (!uniqueCandidatesMap.has(axialToId(cand.q, cand.r))) {
          uniqueCandidatesMap.set(axialToId(cand.q, cand.r), cand)
        }
      }
      return Array.from(uniqueCandidatesMap.values())
        .sort(() => 0.5 - Math.random())
        .slice(0, numHexesToSelect)
    },
    []
  )

  const handleStageItemSpawningInternal = useCallback(
    (
      currentTurnNum: number,
      currentStageDef: StageDefinition | null,
      currentPlayer: Player | null,
      currentHexes: Map<string, Hex>,
      currentDataChips: DataChipPickup[],
      currentSpareBatteriesOnMap: SpareBatteryPickup[],
      currentPlacedEmpTraps: PlacedTrap[],
      currentEscapePortalPosition: AxialCoordinates | null,
      currentPendingSpawnHexes: AxialCoordinates[] | null,
      currentCollectorDrones: CollectorDroneEntity[],
      currentEnemies: Enemy[],
      addMsgFn: (key: string, params?: Record<string, string | number>) => void
    ): {
      spawnedDataChips: DataChipPickup[]
      updatedDataChips: DataChipPickup[]
      spawnedSpareBatteries: SpareBatteryPickup[]
      updatedSpareBatteries: SpareBatteryPickup[]
    } => {
      let newItemsResult = {
        spawnedDataChips: [] as DataChipPickup[],
        updatedDataChips: [...currentDataChips],
        spawnedSpareBatteries: [] as SpareBatteryPickup[],
        updatedSpareBatteries: [...currentSpareBatteriesOnMap],
      }
      if (!currentStageDef || !currentPlayer || !currentStageDef.itemSpawns) return newItemsResult

      const itemsToSpawnThisTurn = currentStageDef.itemSpawns.filter(
        (itemEvent: ItemSpawnEventDefinition) => itemEvent.triggerTurn === currentTurnNum
      )

      if (itemsToSpawnThisTurn.length === 0) return newItemsResult

      const nonSpawnableHexIds = new Set<string>()
      if (currentPlayer) nonSpawnableHexIds.add(axialToId(currentPlayer.q, currentPlayer.r))
      currentPlacedEmpTraps.forEach((t) => nonSpawnableHexIds.add(axialToId(t.q, t.r)))
      if (currentEscapePortalPosition)
        nonSpawnableHexIds.add(axialToId(currentEscapePortalPosition.q, currentEscapePortalPosition.r))
      currentPendingSpawnHexes?.forEach((ps) => nonSpawnableHexIds.add(axialToId(ps.q, ps.r)))
      currentCollectorDrones.forEach((cd) => nonSpawnableHexIds.add(axialToId(cd.q, cd.r)))
      currentEnemies.forEach((e) => nonSpawnableHexIds.add(axialToId(e.q, e.r)))

      itemsToSpawnThisTurn.forEach((itemEvent) => {
        for (let i = 0; i < itemEvent.quantity; i++) {
          let availableHexesForItemSpawn = Array.from(currentHexes.values()).filter(
            (h) =>
              h &&
              !h.isWall &&
              axialDistance(h, currentPlayer) >= DATA_CHIP_MIN_SPAWN_DISTANCE_FROM_PLAYER &&
              !nonSpawnableHexIds.has(h.id)
          )

          if (itemEvent.itemType === 'dataChip') {
            availableHexesForItemSpawn = availableHexesForItemSpawn.filter(
              (h) => !newItemsResult.updatedSpareBatteries.some((sb) => sb.q === h.q && sb.r === h.r)
            )
          } else if (itemEvent.itemType === 'spareBattery') {
            availableHexesForItemSpawn = availableHexesForItemSpawn.filter(
              (h) => !newItemsResult.updatedDataChips.some((dc) => dc.q === h.q && dc.r === h.r)
            )
          }

          if (availableHexesForItemSpawn.length === 0) {
            addLog({ type: 'INFO', message: `Stage item spawn: No valid hex for ${itemEvent.itemType}` })
            continue
          }

          const spawnHex = availableHexesForItemSpawn[Math.floor(Math.random() * availableHexesForItemSpawn.length)]
          const itemNameKey =
            itemEvent.itemType === 'dataChip' ? DATA_CHIP_CONFIG.nameKey : SPARE_BATTERY_CONFIG.nameKey

          if (itemEvent.itemType === 'dataChip') {
            const existingChipIndex = newItemsResult.updatedDataChips.findIndex(
              (dc) => dc.q === spawnHex.q && dc.r === spawnHex.r
            )
            if (existingChipIndex !== -1) {
              const updatedChip = {
                ...newItemsResult.updatedDataChips[existingChipIndex],
                count: newItemsResult.updatedDataChips[existingChipIndex].count + 1,
              }
              newItemsResult.updatedDataChips = newItemsResult.updatedDataChips.map((chip, index) =>
                index === existingChipIndex ? updatedChip : chip
              )
              addLog({
                type: 'INFO',
                message: `Stage: Data Chip STACKED at (${spawnHex.q},${spawnHex.r}) for turn ${currentTurnNum}. New Stack: ${updatedChip.count}`,
              })
            } else {
              const newChip = {
                id: nanoid(),
                q: spawnHex.q,
                r: spawnHex.r,
                expValue: DATA_CHIP_CONFIG.baseValue,
                count: 1,
              }
              newItemsResult.updatedDataChips = [...newItemsResult.updatedDataChips, newChip]
              addLog({
                type: 'INFO',
                message: `Stage: Data Chip SPAWNED at (${spawnHex.q},${spawnHex.r}) for turn ${currentTurnNum}. New Stack: ${newChip.count}`,
              })
            }
            addMsgFn('MESSAGE_ITEM_DETECTED_ON_MAP', { itemName: t(itemNameKey) })
          } else if (itemEvent.itemType === 'spareBattery') {
            const existingBatteryIndex = newItemsResult.updatedSpareBatteries.findIndex(
              (sb) => sb.q === spawnHex.q && sb.r === sb.r
            )
            if (existingBatteryIndex !== -1) {
              const updatedBattery = {
                ...newItemsResult.updatedSpareBatteries[existingBatteryIndex],
                count: newItemsResult.updatedSpareBatteries[existingBatteryIndex].count + 1,
              }
              newItemsResult.updatedSpareBatteries = newItemsResult.updatedSpareBatteries.map((battery, index) =>
                index === existingBatteryIndex ? updatedBattery : battery
              )
              addLog({
                type: 'INFO',
                message: `Stage: Spare Battery STACKED at (${spawnHex.q},${spawnHex.r}) for turn ${currentTurnNum}. New Stack: ${updatedBattery.count}`,
              })
            } else {
              const newBattery = { id: nanoid(), q: spawnHex.q, r: spawnHex.r, count: 1 }
              newItemsResult.updatedSpareBatteries = [...newItemsResult.updatedSpareBatteries, newBattery]
              addLog({
                type: 'INFO',
                message: `Stage: Spare Battery SPAWNED at (${spawnHex.q},${spawnHex.r}) for turn ${currentTurnNum}. New Stack: ${newBattery.count}`,
              })
            }
            addMsgFn('MESSAGE_ITEM_DETECTED_ON_MAP', { itemName: t(itemNameKey) })
          }
        }
      })
      return newItemsResult
    },
    [t, addLog]
  )

  return {
    getEnemyScoreValue,
    getEnemyTypeAndLevelForEndlessMode,
    getEnemyTypeFromPool,
    determineEnemiesForWave,
    selectSpawnLocations,
    handleStageItemSpawningInternal,
  }
}
