import { useMemo } from 'react'
import { GameLogicState } from '../../gameLogic/initialState'
import {
  GamePhase,
  Hex,
  Player,
  Enemy,
  PlacedTrap,
  PlacedBarricade,
  PlacedChargeField,
  CollectorDroneEntity,
  DataChipPickup,
  SpareBatteryPickup,
} from '../../types'
import { getNeighbors, axialToId } from '../../utils/hexUtils'
import { ENEMY_BASE_DENSITY } from '../../constants'

export const useGameSelectors = (gameState: GameLogicState) => {
  const {
    gamePhase,
    player,
    hexes,
    enemies,
    dataChips,
    spareBatteriesOnMap,
    placedEmpTraps,
    placedBarricades,
    placedChargeFields,
    placedCollectorDrones, // Added placedCollectorDrones
    pendingSpawnLocations,
    gameMode,
  } = gameState

  const targetEnemyCount = useMemo(() => {
    if (hexes.size === 0 || gameMode === 'stage') return 0
    return Math.floor(hexes.size * ENEMY_BASE_DENSITY)
  }, [hexes.size, gameMode])

  const movableHexIds = useMemo(() => {
    if (!player || (gamePhase !== 'PlayerTurn' && gamePhase !== 'Playing')) return []
    const pendingSpawnHexIdsSet = new Set((pendingSpawnLocations || []).map((loc) => axialToId(loc.q, loc.r)))
    return getNeighbors(player)
      .filter((n) => {
        const hexId = axialToId(n.q, n.r)
        const hexValue = hexes.get(hexId)
        // Traps no longer block player movement.

        // Player can move onto a barricade hex (to destroy it), or a collector drone hex (to swap).
        // Player cannot move onto a wall or a pending spawn location.
        return hexValue && !hexValue.isWall && !pendingSpawnHexIdsSet.has(hexId)
      })
      .map((n) => axialToId(n.q, n.r))
  }, [player, hexes, gamePhase, pendingSpawnLocations])

  const empTrapPlacementTargetHexIds = useMemo(() => {
    if (!player || gamePhase !== 'PlacingEmpTrap') return []
    return getNeighbors(player)
      .filter((n) => {
        const id = axialToId(n.q, n.r)
        const hexValue = hexes.get(id)
        return (
          hexValue &&
          !hexValue.isWall &&
          !enemies.some((e) => e.q === n.q && e.r === n.r) &&
          !dataChips.some((p) => p.q === n.q && p.r === n.r) &&
          !spareBatteriesOnMap.some((p) => p.q === n.q && p.r === n.r) &&
          !placedEmpTraps.some((t) => t.q === n.q && t.r === n.r) &&
          !placedChargeFields.some((cf) => cf.q === n.q && cf.r === n.r) &&
          !placedCollectorDrones.some((cd) => cd.q === n.q && cd.r === n.r) && // Cannot place on collector drone
          !placedBarricades.some((b) => b.q === n.q && b.r === n.r)
        )
      })
      .map((n) => axialToId(n.q, n.r))
  }, [
    player,
    hexes,
    gamePhase,
    enemies,
    dataChips,
    spareBatteriesOnMap,
    placedEmpTraps,
    placedBarricades,
    placedChargeFields,
    placedCollectorDrones,
  ])

  const barricadePlacementTargetHexIds = useMemo(() => {
    if (!player || gamePhase !== 'PlacingBarricade') return []
    return getNeighbors(player)
      .filter((n) => {
        const id = axialToId(n.q, n.r)
        const hexValue = hexes.get(id)
        return (
          hexValue &&
          !hexValue.isWall &&
          !enemies.some((e) => e.q === n.q && e.r === n.r) &&
          !dataChips.some((p) => p.q === n.q && p.r === n.r) &&
          !spareBatteriesOnMap.some((p) => p.q === n.q && p.r === n.r) &&
          !placedEmpTraps.some((t) => t.q === n.q && t.r === n.r) &&
          !placedChargeFields.some((cf) => cf.q === n.q && cf.r === n.r) &&
          !placedCollectorDrones.some((cd) => cd.q === n.q && cd.r === n.r) && // Cannot place on collector drone
          !placedBarricades.some((b) => b.q === n.q && b.r === n.r)
        )
      })
      .map((n) => axialToId(n.q, n.r))
  }, [
    player,
    hexes,
    gamePhase,
    enemies,
    dataChips,
    spareBatteriesOnMap,
    placedEmpTraps,
    placedBarricades,
    placedChargeFields,
    placedCollectorDrones,
  ])

  const chargeFieldPlacementTargetHexIds = useMemo(() => {
    if (!player || gamePhase !== 'PlacingChargeField') return []
    return getNeighbors(player)
      .filter((n) => {
        const id = axialToId(n.q, n.r)
        const hexValue = hexes.get(id)
        return (
          hexValue &&
          !hexValue.isWall &&
          !enemies.some((e) => e.q === n.q && e.r === n.r) &&
          !dataChips.some((p) => p.q === n.q && p.r === n.r) &&
          !spareBatteriesOnMap.some((p) => p.q === n.q && p.r === n.r) &&
          !placedEmpTraps.some((t) => t.q === n.q && t.r === n.r) &&
          !placedBarricades.some((b) => b.q === n.q && b.r === n.r) &&
          !placedCollectorDrones.some((cd) => cd.q === n.q && cd.r === n.r) && // Cannot place on collector drone
          !placedChargeFields.some((cf) => cf.q === n.q && cf.r === n.r)
        )
      })
      .map((n) => axialToId(n.q, n.r))
  }, [
    player,
    hexes,
    gamePhase,
    enemies,
    dataChips,
    spareBatteriesOnMap,
    placedEmpTraps,
    placedBarricades,
    placedChargeFields,
    placedCollectorDrones,
  ])

  const collectorDronePlacementTargetHexIds = useMemo(() => {
    // New
    if (!player || gamePhase !== 'PlacingCollectorDrone') return []
    return getNeighbors(player)
      .filter((n) => {
        const id = axialToId(n.q, n.r)
        const hexValue = hexes.get(id)
        return (
          hexValue &&
          !hexValue.isWall &&
          !enemies.some((e) => e.q === n.q && e.r === n.r) &&
          !dataChips.some((p) => p.q === n.q && p.r === n.r) &&
          !spareBatteriesOnMap.some((p) => p.q === n.q && p.r === n.r) &&
          !placedEmpTraps.some((t) => t.q === n.q && t.r === n.r) &&
          !placedBarricades.some((b) => b.q === n.q && b.r === n.r) &&
          !placedChargeFields.some((cf) => cf.q === n.q && cf.r === n.r) &&
          !placedCollectorDrones.some((cd) => cd.q === n.q && cd.r === n.r)
        ) // Cannot place on another collector drone
      })
      .map((n) => axialToId(n.q, n.r))
  }, [
    player,
    hexes,
    gamePhase,
    enemies,
    dataChips,
    spareBatteriesOnMap,
    placedEmpTraps,
    placedBarricades,
    placedChargeFields,
    placedCollectorDrones,
  ])

  return {
    targetEnemyCount,
    movableHexIds,
    empTrapPlacementTargetHexIds,
    barricadePlacementTargetHexIds,
    chargeFieldPlacementTargetHexIds,
    collectorDronePlacementTargetHexIds, // New
  }
}
