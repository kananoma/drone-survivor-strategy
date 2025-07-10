import { useCallback } from 'react'
import { GameLogicState } from '../../gameLogic/initialState'
import {
  Hex,
  GamePhase,
  ArmamentName,
  PlacedTrap,
  PlacedBarricade,
  PlacedChargeField,
  CollectorDroneEntity,
  BoosterStats,
  StealthStats,
  EmpTrapStats,
  BarricadeStats,
  ShockwaveStats,
  JammerStats,
  ChargeFieldStats,
  CollectorDroneStats,
  CrashBombStats,
  Enemy,
  AxialCoordinates,
  DataChipPickup,
  SpareBatteryPickup,
  ActiveJammerFieldEffect,
} from '../../types'
import { axialToId, getNeighbors, axialDistance } from '../../utils/hexUtils'
import {
  ANIMATION_DURATION_MS,
  DATA_CHIP_CONFIG,
  SPARE_BATTERY_CONFIG,
  ARMAMENT_STATS_GETTERS,
  ENEMY_XP_VALUES,
  SHOCKWAVE_EFFECT_DURATION_MS,
  JAMMER_EFFECT_DURATION_MS,
  CHARGE_FIELD_PLACEMENT_EFFECT_DURATION_MS,
  COLLECTOR_DRONE_PLACEMENT_EFFECT_DURATION_MS,
  CRASH_BOMB_EFFECT_DURATION_MS,
  MAX_HEAT_CRASH_BOMB,
  LEVEL_EXP_SCALING_FACTOR,
} from '../../constants'
import { nanoid } from 'nanoid'
import { DefeatLog } from '../../types/debug'

interface PlayerActionDeps {
  movableHexIds: string[]
  empTrapPlacementTargetHexIds: string[]
  barricadePlacementTargetHexIds: string[]
  chargeFieldPlacementTargetHexIds: string[]
  collectorDronePlacementTargetHexIds: string[]
  addMessage: (msgKey: string, params?: Record<string, string | number>) => void
  addLog: (logData: any) => void
  t: (key: string, params?: Record<string, string | number>) => string
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
  selectedArmament: ArmamentName | null
}

export const usePlayerActions = (
  gameState: GameLogicState,
  setGameState: React.Dispatch<React.SetStateAction<GameLogicState>>,
  deps: PlayerActionDeps
) => {
  const {
    addMessage,
    addLog,
    t,
    movableHexIds,
    empTrapPlacementTargetHexIds,
    barricadePlacementTargetHexIds,
    chargeFieldPlacementTargetHexIds,
    collectorDronePlacementTargetHexIds,
    handleExperienceGain,
    selectedArmament,
  } = deps

  const handlePlayerMove = useCallback(
    (targetHex: Hex) => {
      const { player, playerActionsRemaining, gamePhase } = gameState

      if (!player || playerActionsRemaining <= 0 || (gamePhase !== 'PlayerTurn' && gamePhase !== 'Playing')) return

      if (selectedArmament) return // Don't move if an armament is selected

      const targetHexId = axialToId(targetHex.q, targetHex.r)

      // `movableHexIds` is the single source of truth for valid adjacent moves.
      // It already accounts for walls, pending spawns, etc.
      if (!movableHexIds.includes(targetHexId)) {
        // For a better user experience, we can check if the hex was non-adjacent vs. just blocked.
        const isAdjacent = getNeighbors(player).some((n) => n.q === targetHex.q && n.r === targetHex.r)
        if (!isAdjacent) {
          addMessage('MESSAGE_MANEUVER_IMPOSSIBLE_NON_ADJACENT')
        } else {
          // If it's adjacent but not movable, it's a wall, spawn point, etc.
          // A log is sufficient as this should be visually clear to the player.
          addLog({
            type: 'INFO',
            message: `Player move blocked to non-movable adjacent hex ${targetHex.q},${targetHex.r}.`,
          })
        }
        return
      }

      setGameState((prev) => {
        let newScore = prev.score
        let newEnemies = [...prev.enemies]
        let newDataChips = [...prev.dataChips]
        let newSpareBatteriesOnMap = [...prev.spareBatteriesOnMap]
        let newSpareBatteriesCount = prev.spareBatteriesCount
        let newPlacedBarricades = [...prev.placedBarricades]
        let newPlacedCollectorDrones = [...prev.placedCollectorDrones]
        let actionScopedNewComboCount = prev.comboCount
        let actionScopedNewComboBaseScore = prev.currentComboBaseScore
        let actionScopedDefeatedEnemyThisTurnCycle = prev.defeatedEnemyThisTurnCycle
        let newGameStats = { ...prev.gameStats }
        let expGainedThisAction = 0

        const barricadeAtTargetIndex = newPlacedBarricades.findIndex((b) => b.q === targetHex.q && b.r === targetHex.r)
        if (barricadeAtTargetIndex !== -1) {
          newPlacedBarricades.splice(barricadeAtTargetIndex, 1)
          addMessage('MESSAGE_BARRICADE_DESTROYED_BY_PLAYER', { q: targetHex.q, r: targetHex.r })
        }

        const collectorDroneAtTargetIndex = newPlacedCollectorDrones.findIndex(
          (cd) => cd.q === targetHex.q && cd.r === targetHex.r
        )
        if (collectorDroneAtTargetIndex !== -1) {
          const droneToSwap = newPlacedCollectorDrones[collectorDroneAtTargetIndex]
          newPlacedCollectorDrones[collectorDroneAtTargetIndex] = {
            ...droneToSwap,
            q: prev.player!.q,
            r: prev.player!.r,
          }
          addMessage('MESSAGE_PLAYER_SWAPPED_WITH_COLLECTOR_DRONE', {
            droneId: droneToSwap.id.substring(0, 4),
            q: prev.player!.q,
            r: prev.player!.r,
          })
        }

        const enemyAtTargetIndex = newEnemies.findIndex((e) => e.q === targetHex.q && e.r === targetHex.r)
        if (enemyAtTargetIndex !== -1) {
          const defeatedEnemy = newEnemies.splice(enemyAtTargetIndex, 1)[0]
          const scoreGainedFromEnemy = ENEMY_XP_VALUES[defeatedEnemy.level] || 0
          expGainedThisAction += scoreGainedFromEnemy
          newScore += scoreGainedFromEnemy
          actionScopedDefeatedEnemyThisTurnCycle = true
          actionScopedNewComboCount = prev.comboCount > 0 ? prev.comboCount + 1 : 1
          actionScopedNewComboBaseScore =
            prev.comboCount > 0 ? prev.currentComboBaseScore + scoreGainedFromEnemy : scoreGainedFromEnemy

          if (actionScopedNewComboCount > newGameStats.maxCombo) {
            newGameStats.maxCombo = actionScopedNewComboCount
          }
          newGameStats.enemiesDefeatedByType[defeatedEnemy.level] =
            (newGameStats.enemiesDefeatedByType[defeatedEnemy.level] || 0) + 1

          let bonusForThisKill = 0
          if (actionScopedNewComboCount > 1) {
            const previousTotalBonusAwarded =
              prev.comboCount > 1 ? prev.currentComboBaseScore * (prev.comboCount - 1) * 0.5 : 0
            const newPotentialTotalBonus = actionScopedNewComboBaseScore * (actionScopedNewComboCount - 1) * 0.5
            bonusForThisKill = newPotentialTotalBonus - previousTotalBonusAwarded
            if (bonusForThisKill > 0) newScore += bonusForThisKill
          }
          addMessage('MESSAGE_HOSTILE_NEUTRALIZED', { level: defeatedEnemy.level })
          addLog({
            type: 'DEFEAT',
            payload: {
              enemyLevel: defeatedEnemy.level,
              baseScoreGained: scoreGainedFromEnemy,
              comboCount: actionScopedNewComboCount,
              currentComboBaseScore: actionScopedNewComboBaseScore,
              bonusScoreForThisKill: bonusForThisKill,
            },
          })
        }

        const dataChipIndex = newDataChips.findIndex((p) => p.q === targetHex.q && p.r === targetHex.r)
        if (dataChipIndex !== -1) {
          const chip = newDataChips.splice(dataChipIndex, 1)[0]
          expGainedThisAction += chip.expValue * chip.count
          newGameStats.dataChipsCollected = (newGameStats.dataChipsCollected || 0) + chip.count
          addMessage('MESSAGE_ACQUIRED_ITEM', {
            itemName: t(DATA_CHIP_CONFIG.nameKey) + (chip.count > 1 ? ` (x${chip.count})` : ''),
          })
        }

        const spareBatteryIndex = newSpareBatteriesOnMap.findIndex((p) => p.q === targetHex.q && p.r === targetHex.r)
        if (spareBatteryIndex !== -1) {
          const battery = newSpareBatteriesOnMap.splice(spareBatteryIndex, 1)[0]
          newSpareBatteriesCount += battery.count
          newGameStats.spareBatteriesCollected = (newGameStats.spareBatteriesCollected || 0) + battery.count
          addMessage('MESSAGE_ACQUIRED_ITEM', {
            itemName: t(SPARE_BATTERY_CONFIG.nameKey) + (battery.count > 1 ? ` (x${battery.count})` : ''),
          })
        }

        const expResult = handleExperienceGain(
          prev.currentExp,
          prev.playerLevel,
          prev.expToNextLevel,
          prev.upgradePoints,
          expGainedThisAction
        )

        const newPlayerPos = { ...prev.player!, q: targetHex.q, r: targetHex.r }

        const playerActionsCost = 1
        const consumedFromBooster = Math.min(playerActionsCost, prev.activeBuffs.boosterActionsAvailableThisTurn)
        const newBoosterActionsAvailableThisTurn =
          prev.activeBuffs.boosterActionsAvailableThisTurn - consumedFromBooster

        return {
          ...prev,
          player: newPlayerPos,
          enemies: newEnemies,
          dataChips: newDataChips,
          spareBatteriesOnMap: newSpareBatteriesOnMap,
          spareBatteriesCount: newSpareBatteriesCount,
          placedBarricades: newPlacedBarricades,
          placedCollectorDrones: newPlacedCollectorDrones,
          score: newScore,
          comboCount: actionScopedNewComboCount,
          currentComboBaseScore: actionScopedNewComboBaseScore,
          playerActionsRemaining: prev.playerActionsRemaining - playerActionsCost,
          activeBuffs: { ...prev.activeBuffs, boosterActionsAvailableThisTurn: newBoosterActionsAvailableThisTurn },
          defeatedEnemyThisTurnCycle: actionScopedDefeatedEnemyThisTurnCycle,
          gamePhase: 'Animating',
          gameStats: newGameStats,
          ...expResult,
          showLevelUpBanner: expResult.showLevelUpBanner || prev.showLevelUpBanner,
        }
      })

      setTimeout(() => {
        setGameState((prev) => {
          if (prev.gamePhase === 'GameOver' || prev.gamePhase === 'StageComplete') return prev
          if (
            prev.gameMode === 'stage' &&
            prev.escapePortalPosition &&
            prev.player &&
            prev.player.q === prev.escapePortalPosition.q &&
            prev.player.r === prev.escapePortalPosition.r
          ) {
            addMessage('MESSAGE_ESCAPE_PORTAL_ENTERED')
            return { ...prev, gamePhase: 'StageComplete' }
          }
          if (prev.isUpgradeSelection) return { ...prev, gamePhase: 'UpgradeSelection' }

          const nextPhaseDeterminedByActions = prev.playerActionsRemaining > 0 ? 'PlayerTurn' : 'CollectorDroneTurn'
          let finalComboCount = prev.comboCount
          let finalComboBaseScore = prev.currentComboBaseScore
          if (nextPhaseDeterminedByActions === 'CollectorDroneTurn' && !prev.defeatedEnemyThisTurnCycle) {
            finalComboCount = 0
            finalComboBaseScore = 0
          }
          return {
            ...prev,
            gamePhase: nextPhaseDeterminedByActions,
            comboCount: finalComboCount,
            currentComboBaseScore: finalComboBaseScore,
          }
        })
      }, ANIMATION_DURATION_MS)
    },
    [gameState, setGameState, addMessage, addLog, t, movableHexIds, handleExperienceGain, selectedArmament]
  )

  const handleUseArmament = useCallback(
    (armamentId: ArmamentName) => {
      const {
        player,
        gamePhase,
        armamentLevels,
        activeBuffs,
        currentEnergy,
        playerActionsRemaining,
        placedEmpTraps,
        placedBarricades,
        placedChargeFields,
        placedCollectorDrones,
      } = gameState

      if (!player || (gamePhase !== 'PlayerTurn' && gamePhase !== 'Playing') || armamentLevels[armamentId] === 0) {
        addMessage('MESSAGE_CANNOT_ACTIVATE_ARMAMENT_NOW')
        return
      }
      if (activeBuffs.overheat.isActive && armamentId !== 'crash_bomb') {
        addMessage('MESSAGE_OVERHEAT_ARMAMENTS_DISABLED')
        return
      }

      const currentArmamentLevel = armamentLevels[armamentId]
      const armamentStats = ARMAMENT_STATS_GETTERS[armamentId](currentArmamentLevel)
      const armamentTitle = t(ARMAMENT_STATS_GETTERS[armamentId](0).titleKey)
      const energyCost = armamentStats.energyCost

      const playerActionsCost = armamentId === 'booster' ? 0 : 1

      if (currentEnergy < energyCost && armamentId !== 'crash_bomb') {
        addMessage('MESSAGE_NOT_ENOUGH_ENERGY_FOR_ARMAMENT', {
          armamentName: armamentTitle,
          cost: energyCost,
          currentEnergy,
        })
        return
      }
      if (armamentId === 'crash_bomb' && currentEnergy < (armamentStats as CrashBombStats).energyCost) {
        addMessage('MESSAGE_NOT_ENOUGH_ENERGY_FOR_ARMAMENT', {
          armamentName: armamentTitle,
          cost: (armamentStats as CrashBombStats).energyCost,
          currentEnergy,
        })
        return
      }
      if (playerActionsCost > 0 && playerActionsRemaining < playerActionsCost) {
        addLog({
          type: 'INFO',
          message: `Armament ${armamentId} use failed: Not enough actions. Has ${playerActionsRemaining}, needs ${playerActionsCost}`,
        })
        return
      }

      const updateStatsForArmament = (prev: GameLogicState) => {
        const newGameStats = { ...prev.gameStats }
        newGameStats.armamentsUsedCount[armamentId] = (newGameStats.armamentsUsedCount[armamentId] || 0) + 1
        return newGameStats
      }

      const basePayload = {
        gameStats: updateStatsForArmament(gameState),
      }

      const transitionToNextPhase = () => {
        setTimeout(() => {
          setGameState((prev) => {
            if (prev.gamePhase === 'GameOver' || prev.gamePhase === 'StageComplete') return prev
            if (prev.isUpgradeSelection) return { ...prev, gamePhase: 'UpgradeSelection' }

            const nextPhase = prev.playerActionsRemaining > 0 ? 'PlayerTurn' : 'CollectorDroneTurn'
            let finalComboCount = prev.comboCount
            let finalComboBaseScore = prev.currentComboBaseScore

            if (nextPhase === 'CollectorDroneTurn' && !prev.defeatedEnemyThisTurnCycle) {
              finalComboCount = 0
              finalComboBaseScore = 0
            }

            return {
              ...prev,
              gamePhase: nextPhase,
              comboCount: finalComboCount,
              currentComboBaseScore: finalComboBaseScore,
            }
          })
        }, ANIMATION_DURATION_MS)
      }

      switch (armamentId) {
        case 'booster': {
          const boosterStats = armamentStats as BoosterStats
          if (activeBuffs.boosterUsesThisTurn >= boosterStats.usesPerTurn) {
            addMessage('MESSAGE_BOOSTER_MAX_USES_REACHED', { usesPerTurn: boosterStats.usesPerTurn })
            return
          }
          setGameState((prev) => ({
            ...prev,
            ...basePayload,
            currentEnergy: prev.currentEnergy - energyCost,
            playerActionsRemaining: prev.playerActionsRemaining + boosterStats.actionsGranted,
            activeBuffs: {
              ...prev.activeBuffs,
              boosterUsesThisTurn: prev.activeBuffs.boosterUsesThisTurn + 1,
              boosterActiveThisTurn: true,
              boosterActionsAvailableThisTurn:
                prev.activeBuffs.boosterActionsAvailableThisTurn + boosterStats.actionsGranted,
            },
          }))
          addMessage('MESSAGE_BOOSTER_ACTIVATED', {
            armamentTitle,
            actionsGranted: boosterStats.actionsGranted,
            cost: energyCost,
            usesLeft: boosterStats.usesPerTurn - (activeBuffs.boosterUsesThisTurn + 1),
            totalUses: boosterStats.usesPerTurn,
          })
          break
        }
        case 'stealth': {
          const stealthStats = armamentStats as StealthStats
          if (activeBuffs.stealth.isActive) {
            addMessage('MESSAGE_STEALTH_ALREADY_ACTIVE')
            return
          }
          setGameState((prev) => {
            const consumedFromBooster = Math.min(playerActionsCost, prev.activeBuffs.boosterActionsAvailableThisTurn)
            return {
              ...prev,
              ...basePayload,
              currentEnergy: prev.currentEnergy - energyCost,
              playerActionsRemaining: prev.playerActionsRemaining - playerActionsCost,
              activeBuffs: {
                ...prev.activeBuffs,
                stealth: { isActive: true, turnsLeft: stealthStats.duration },
                boosterActionsAvailableThisTurn: prev.activeBuffs.boosterActionsAvailableThisTurn - consumedFromBooster,
              },
              gamePhase: 'Animating',
            }
          })
          addMessage('MESSAGE_STEALTH_ENGAGED_SUCCESS', {
            armamentTitle: t(stealthStats.titleKey),
            duration: stealthStats.duration,
            cost: energyCost,
          })
          transitionToNextPhase()
          break
        }
        case 'trap': {
          const trapStats = armamentStats as EmpTrapStats
          if (placedEmpTraps.length >= trapStats.maxCharges) {
            addMessage('MESSAGE_CANNOT_DEPLOY_MORE_TRAPS')
            return
          }
          setGameState((prev) => ({ ...prev, gamePhase: 'PlacingEmpTrap' }))
          addMessage('MESSAGE_TRAP_INITIATING', { cost: energyCost })
          break
        }
        case 'barricade': {
          const barricadeStats = armamentStats as BarricadeStats
          if (placedBarricades.length >= barricadeStats.maxCharges) {
            addMessage('MESSAGE_CANNOT_DEPLOY_MORE_BARRICADES')
            return
          }
          setGameState((prev) => ({ ...prev, gamePhase: 'PlacingBarricade' }))
          addMessage('MESSAGE_BARRICADE_INITIATING', { cost: energyCost })
          break
        }
        case 'charge_field': {
          const chargeFieldStats = armamentStats as ChargeFieldStats
          if (placedChargeFields.length >= chargeFieldStats.maxPlaced) {
            addMessage('MESSAGE_CANNOT_DEPLOY_MORE_CHARGE_FIELDS')
            return
          }
          setGameState((prev) => ({ ...prev, gamePhase: 'PlacingChargeField' }))
          addMessage('MESSAGE_CHARGE_FIELD_INITIATING', { cost: energyCost })
          break
        }
        case 'collector_drone': {
          const collectorDroneStats = armamentStats as CollectorDroneStats
          if (placedCollectorDrones.length >= collectorDroneStats.maxPlaced) {
            addMessage('MESSAGE_CANNOT_DEPLOY_MORE_COLLECTOR_DRONES')
            return
          }
          setGameState((prev) => ({ ...prev, gamePhase: 'PlacingCollectorDrone' }))
          addMessage('MESSAGE_COLLECTOR_DRONE_INITIATING', { cost: energyCost })
          break
        }
        case 'shockwave': {
          const shockwaveStats = armamentStats as ShockwaveStats
          setGameState((prev) => {
            const consumedFromBooster = Math.min(playerActionsCost, prev.activeBuffs.boosterActionsAvailableThisTurn)
            let enemiesAfterShockwave = [...prev.enemies]
            getNeighbors(player).forEach((adjHex) => {
              const enemyIdx = enemiesAfterShockwave.findIndex((e) => e.q === adjHex.q && e.r === adjHex.r)
              if (enemyIdx !== -1) {
                const enemyToUpdate = { ...enemiesAfterShockwave[enemyIdx] }
                enemyToUpdate.isStunnedTurns += shockwaveStats.stunDuration
                const dq = enemyToUpdate.q - player.q
                const dr = enemyToUpdate.r - player.r
                let currentQ = enemyToUpdate.q
                let currentR = enemyToUpdate.r
                for (let i = 0; i < shockwaveStats.pushDistance; i++) {
                  const nextQ = currentQ + dq
                  const nextR = currentR + dr
                  const nextHex = prev.hexes.get(axialToId(nextQ, nextR))
                  if (
                    !nextHex ||
                    nextHex.isWall ||
                    enemiesAfterShockwave.some((e) => e.id !== enemyToUpdate.id && e.q === nextQ && e.r === nextR)
                  )
                    break
                  currentQ = nextQ
                  currentR = nextR
                }
                enemyToUpdate.q = currentQ
                enemyToUpdate.r = currentR
                enemiesAfterShockwave[enemyIdx] = enemyToUpdate
              }
            })
            return {
              ...prev,
              ...basePayload,
              currentEnergy: prev.currentEnergy - energyCost,
              playerActionsRemaining: prev.playerActionsRemaining - playerActionsCost,
              activeBuffs: {
                ...prev.activeBuffs,
                boosterActionsAvailableThisTurn: prev.activeBuffs.boosterActionsAvailableThisTurn - consumedFromBooster,
              },
              enemies: enemiesAfterShockwave,
              showShockwaveEffectAt: { q: player.q, r: player.r },
              gamePhase: 'Animating',
            }
          })
          addMessage('MESSAGE_SHOCKWAVE_ACTIVATED', { armamentTitle, cost: energyCost })
          setTimeout(() => {
            setGameState((prev) => ({ ...prev, showShockwaveEffectAt: null }))
            transitionToNextPhase()
          }, SHOCKWAVE_EFFECT_DURATION_MS)
          break
        }
        case 'jammer': {
          const jammerStats = armamentStats as JammerStats
          setGameState((prev) => {
            const consumedFromBooster = Math.min(playerActionsCost, prev.activeBuffs.boosterActionsAvailableThisTurn)
            const newEnemies = prev.enemies.map((e) => ({
              ...e,
              level: Math.max(0, e.originalLevel - jammerStats.levelReduction),
              sightRange: Math.max(0, e.originalLevel - jammerStats.levelReduction),
            }))
            return {
              ...prev,
              ...basePayload,
              currentEnergy: prev.currentEnergy - energyCost,
              playerActionsRemaining: prev.playerActionsRemaining - playerActionsCost,
              activeBuffs: {
                ...prev.activeBuffs,
                jammerFieldEffect: {
                  isActive: true,
                  turnsLeft: jammerStats.duration,
                  levelReductionAmount: jammerStats.levelReduction,
                },
                boosterActionsAvailableThisTurn: prev.activeBuffs.boosterActionsAvailableThisTurn - consumedFromBooster,
              },
              enemies: newEnemies,
              showJammerEffectAt: { q: player.q, r: player.r },
              gamePhase: 'Animating',
            }
          })
          addMessage('MESSAGE_JAMMER_GLOBAL_ACTIVATED', {
            armamentTitle,
            duration: jammerStats.duration,
            reduction: jammerStats.levelReduction,
            cost: energyCost,
          })
          setTimeout(() => {
            setGameState((prev) => ({ ...prev, showJammerEffectAt: null }))
            transitionToNextPhase()
          }, JAMMER_EFFECT_DURATION_MS)
          break
        }
        case 'crash_bomb': {
          setGameState((prev) => {
            let expGainedFromCrashBomb = 0
            prev.enemies.forEach((enemy) => {
              expGainedFromCrashBomb += ENEMY_XP_VALUES[enemy.originalLevel] || 0
            })

            const expResult = handleExperienceGain(
              prev.currentExp,
              prev.playerLevel,
              prev.expToNextLevel,
              prev.upgradePoints,
              expGainedFromCrashBomb
            )

            return {
              ...prev,
              ...basePayload,
              currentEnergy: 0,
              activeBuffs: { ...prev.activeBuffs, overheat: { isActive: true, currentHeat: MAX_HEAT_CRASH_BOMB } },
              enemies: [],
              dataChips: [],
              spareBatteriesOnMap: [],
              placedEmpTraps: [],
              placedBarricades: [],
              placedChargeFields: [],
              placedCollectorDrones: [],
              showCrashBombEffect: true,
              gamePhase: 'Animating',
              ...expResult,
              showLevelUpBanner: expResult.showLevelUpBanner || prev.showLevelUpBanner,
            }
          })
          addMessage('MESSAGE_CRASH_BOMB_ACTIVATED')
          setTimeout(() => {
            setGameState((prev) => ({ ...prev, showCrashBombEffect: false }))
            transitionToNextPhase()
          }, CRASH_BOMB_EFFECT_DURATION_MS)
          break
        }
      }
    },
    [gameState, setGameState, addMessage, addLog, t]
  )

  const handlePlaceEmpTrap = useCallback(
    (targetHex: Hex) => {
      const { gamePhase, armamentLevels } = gameState
      if (gamePhase !== 'PlacingEmpTrap') return
      if (!empTrapPlacementTargetHexIds.includes(axialToId(targetHex.q, targetHex.r))) {
        addMessage('MESSAGE_CANNOT_DEPLOY_TRAP_HERE')
        return
      }
      const trapStats = ARMAMENT_STATS_GETTERS.trap(armamentLevels.trap) as EmpTrapStats
      setGameState((prev) => {
        const playerActionsCost = 1
        const consumedFromBooster = Math.min(playerActionsCost, prev.activeBuffs.boosterActionsAvailableThisTurn)
        const newGameStats = { ...prev.gameStats }
        newGameStats.armamentsUsedCount['trap'] = (newGameStats.armamentsUsedCount['trap'] || 0) + 1
        return {
          ...prev,
          currentEnergy: prev.currentEnergy - trapStats.energyCost,
          placedEmpTraps: [...prev.placedEmpTraps, { id: nanoid(), q: targetHex.q, r: targetHex.r }],
          playerActionsRemaining: prev.playerActionsRemaining - playerActionsCost,
          activeBuffs: {
            ...prev.activeBuffs,
            boosterActionsAvailableThisTurn: prev.activeBuffs.boosterActionsAvailableThisTurn - consumedFromBooster,
          },
          gamePhase: 'Animating',
          gameStats: newGameStats,
        }
      })
      addMessage('MESSAGE_TRAP_DEPLOYED_AT', { q: targetHex.q, r: targetHex.r })
      setTimeout(() => {
        setGameState((prev) => {
          if (prev.gamePhase === 'GameOver' || prev.gamePhase === 'StageComplete') return prev
          if (prev.isUpgradeSelection) return { ...prev, gamePhase: 'UpgradeSelection' }
          const nextPhase = prev.playerActionsRemaining > 0 ? 'PlayerTurn' : 'CollectorDroneTurn'
          return { ...prev, gamePhase: nextPhase }
        })
      }, ANIMATION_DURATION_MS)
    },
    [gameState, setGameState, addMessage, empTrapPlacementTargetHexIds]
  )

  const handlePlaceBarricade = useCallback(
    (targetHex: Hex) => {
      const { gamePhase, armamentLevels } = gameState
      if (gamePhase !== 'PlacingBarricade') return
      if (!barricadePlacementTargetHexIds.includes(axialToId(targetHex.q, targetHex.r))) {
        addMessage('MESSAGE_CANNOT_DEPLOY_BARRICADE_HERE')
        return
      }
      const barricadeStats = ARMAMENT_STATS_GETTERS.barricade(armamentLevels.barricade) as BarricadeStats
      setGameState((prev) => {
        const playerActionsCost = 1
        const consumedFromBooster = Math.min(playerActionsCost, prev.activeBuffs.boosterActionsAvailableThisTurn)
        const newGameStats = { ...prev.gameStats }
        newGameStats.armamentsUsedCount['barricade'] = (newGameStats.armamentsUsedCount['barricade'] || 0) + 1
        return {
          ...prev,
          currentEnergy: prev.currentEnergy - barricadeStats.energyCost,
          placedBarricades: [
            ...prev.placedBarricades,
            { id: nanoid(), q: targetHex.q, r: targetHex.r, turnsLeft: barricadeStats.duration },
          ],
          playerActionsRemaining: prev.playerActionsRemaining - playerActionsCost,
          activeBuffs: {
            ...prev.activeBuffs,
            boosterActionsAvailableThisTurn: prev.activeBuffs.boosterActionsAvailableThisTurn - consumedFromBooster,
          },
          gamePhase: 'Animating',
          gameStats: newGameStats,
        }
      })
      addMessage('MESSAGE_BARRICADE_DEPLOYED_AT', { q: targetHex.q, r: targetHex.r })
      setTimeout(() => {
        setGameState((prev) => {
          if (prev.gamePhase === 'GameOver' || prev.gamePhase === 'StageComplete') return prev
          if (prev.isUpgradeSelection) return { ...prev, gamePhase: 'UpgradeSelection' }
          const nextPhase = prev.playerActionsRemaining > 0 ? 'PlayerTurn' : 'CollectorDroneTurn'
          return { ...prev, gamePhase: nextPhase }
        })
      }, ANIMATION_DURATION_MS)
    },
    [gameState, setGameState, addMessage, barricadePlacementTargetHexIds]
  )

  const handlePlaceChargeField = useCallback(
    (targetHex: Hex) => {
      const { gamePhase, armamentLevels } = gameState
      if (gamePhase !== 'PlacingChargeField') return
      if (!chargeFieldPlacementTargetHexIds.includes(axialToId(targetHex.q, targetHex.r))) {
        addMessage('MESSAGE_CANNOT_DEPLOY_CHARGE_FIELD_HERE')
        return
      }
      const chargeFieldStats = ARMAMENT_STATS_GETTERS.charge_field(armamentLevels.charge_field) as ChargeFieldStats
      setGameState((prev) => {
        const playerActionsCost = 1
        const consumedFromBooster = Math.min(playerActionsCost, prev.activeBuffs.boosterActionsAvailableThisTurn)
        const newGameStats = { ...prev.gameStats }
        newGameStats.armamentsUsedCount['charge_field'] = (newGameStats.armamentsUsedCount['charge_field'] || 0) + 1
        return {
          ...prev,
          currentEnergy: prev.currentEnergy - chargeFieldStats.energyCost,
          placedChargeFields: [
            ...prev.placedChargeFields,
            {
              id: nanoid(),
              q: targetHex.q,
              r: targetHex.r,
              turnsLeft: chargeFieldStats.duration,
              recoveryAmount: chargeFieldStats.recoveryAmount,
              effectRadius: chargeFieldStats.effectRadius,
            },
          ],
          playerActionsRemaining: prev.playerActionsRemaining - playerActionsCost,
          activeBuffs: {
            ...prev.activeBuffs,
            boosterActionsAvailableThisTurn: prev.activeBuffs.boosterActionsAvailableThisTurn - consumedFromBooster,
          },
          gamePhase: 'Animating',
          showChargeFieldPlacementEffectAt: { q: targetHex.q, r: targetHex.r },
          gameStats: newGameStats,
        }
      })
      addMessage('MESSAGE_CHARGE_FIELD_DEPLOYED_AT', { q: targetHex.q, r: targetHex.r })
      setTimeout(() => {
        setGameState((prev) => {
          if (prev.gamePhase === 'GameOver' || prev.gamePhase === 'StageComplete') return prev
          if (prev.isUpgradeSelection) return { ...prev, gamePhase: 'UpgradeSelection' }
          const nextPhase = prev.playerActionsRemaining > 0 ? 'PlayerTurn' : 'CollectorDroneTurn'
          return { ...prev, gamePhase: nextPhase, showChargeFieldPlacementEffectAt: null }
        })
      }, CHARGE_FIELD_PLACEMENT_EFFECT_DURATION_MS)
    },
    [gameState, setGameState, addMessage, chargeFieldPlacementTargetHexIds]
  )

  const handlePlaceCollectorDrone = useCallback(
    (targetHex: Hex) => {
      const { gamePhase, armamentLevels } = gameState
      if (gamePhase !== 'PlacingCollectorDrone') return
      if (!collectorDronePlacementTargetHexIds.includes(axialToId(targetHex.q, targetHex.r))) {
        addMessage('MESSAGE_CANNOT_DEPLOY_COLLECTOR_DRONE_HERE')
        return
      }
      const collectorDroneStats = ARMAMENT_STATS_GETTERS.collector_drone(
        armamentLevels.collector_drone
      ) as CollectorDroneStats
      setGameState((prev) => {
        const playerActionsCost = 1
        const consumedFromBooster = Math.min(playerActionsCost, prev.activeBuffs.boosterActionsAvailableThisTurn)
        const newGameStats = { ...prev.gameStats }
        newGameStats.armamentsUsedCount['collector_drone'] =
          (newGameStats.armamentsUsedCount['collector_drone'] || 0) + 1
        return {
          ...prev,
          currentEnergy: prev.currentEnergy - collectorDroneStats.energyCost,
          placedCollectorDrones: [
            ...prev.placedCollectorDrones,
            {
              id: nanoid(),
              q: targetHex.q,
              r: targetHex.r,
              turnsLeft: collectorDroneStats.lifespan,
              searchRadius: collectorDroneStats.searchRadius,
              targetItemId: null,
              path: [],
            },
          ],
          playerActionsRemaining: prev.playerActionsRemaining - playerActionsCost,
          activeBuffs: {
            ...prev.activeBuffs,
            boosterActionsAvailableThisTurn: prev.activeBuffs.boosterActionsAvailableThisTurn - consumedFromBooster,
          },
          gamePhase: 'Animating',
          showCollectorDronePlacementEffectAt: { q: targetHex.q, r: targetHex.r },
          gameStats: newGameStats,
        }
      })
      addMessage('MESSAGE_COLLECTOR_DRONE_DEPLOYED_AT', { q: targetHex.q, r: targetHex.r })
      setTimeout(() => {
        setGameState((prev) => {
          if (prev.gamePhase === 'GameOver' || prev.gamePhase === 'StageComplete') return prev
          if (prev.isUpgradeSelection) return { ...prev, gamePhase: 'UpgradeSelection' }
          const nextPhase = prev.playerActionsRemaining > 0 ? 'PlayerTurn' : 'CollectorDroneTurn'
          return { ...prev, gamePhase: nextPhase, showCollectorDronePlacementEffectAt: null }
        })
      }, COLLECTOR_DRONE_PLACEMENT_EFFECT_DURATION_MS)
    },
    [gameState, setGameState, addMessage, collectorDronePlacementTargetHexIds]
  )

  const handleUseSpareBattery = useCallback(() => {
    const { spareBatteriesCount, currentEnergy, maxEnergy, activeBuffs } = gameState
    if (spareBatteriesCount <= 0 || currentEnergy >= maxEnergy || activeBuffs.overheat.isActive) return
    setGameState((prev) => ({
      ...prev,
      currentEnergy: Math.min(prev.maxEnergy, prev.currentEnergy + SPARE_BATTERY_CONFIG.energyValue),
      spareBatteriesCount: prev.spareBatteriesCount - 1,
      gameStats: { ...prev.gameStats, spareBatteriesUsed: (prev.gameStats.spareBatteriesUsed || 0) + 1 },
    }))
    addMessage('MESSAGE_USED_SPARE_BATTERY', { energyValue: SPARE_BATTERY_CONFIG.energyValue })
  }, [gameState, setGameState, addMessage])

  return {
    handlePlayerMove,
    handleUseArmament,
    handlePlaceEmpTrap,
    handlePlaceBarricade,
    handlePlaceChargeField,
    handlePlaceCollectorDrone,
    handleUseSpareBattery,
  }
}
