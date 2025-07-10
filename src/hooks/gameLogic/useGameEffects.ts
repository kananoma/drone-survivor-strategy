import { useEffect } from 'react'
import { GameLogicState } from '../../gameLogic/initialState'
import { GamePhase, Hex, Player, Enemy, ActiveArmamentBuffs } from '../../types'
import { DANGER_COLORS, MAX_DANGER_FOR_COLOR_SCALE, ENEMY_XP_VALUES } from '../../constants'
import { axialDistance } from '../../utils/hexUtils'

export const useGameEffects = (
  gameState: GameLogicState,
  setGameState: React.Dispatch<React.SetStateAction<GameLogicState>>,
  processCollectorDroneActions: () => Promise<void>,
  processEnemyTurns: () => Promise<void>
) => {
  const {
    gamePhase,
    enemies,
    player,
    mapRadius,
    hexes,
    activeBuffs,
    isProcessingEnemyTurn,
    isProcessingCollectorDroneTurn,
    isUpgradeSelection,
    isDangerMapVisible,
    isObserverCountMapVisible,
  } = gameState

  useEffect(() => {
    if (
      !player ||
      (gamePhase !== 'PlayerTurn' &&
        gamePhase !== 'EnemyTurn' &&
        gamePhase !== 'PlacingEmpTrap' &&
        gamePhase !== 'Playing' &&
        gamePhase !== 'Animating' &&
        gamePhase !== 'UpgradeSelection' &&
        gamePhase !== 'CollectorDroneTurn')
    ) {
      if (!isDangerMapVisible && !isObserverCountMapVisible) {
        let needsReset = false
        hexes.forEach((hex) => {
          if (hex.fillColorClass && hex.fillColorClass !== 'bg-white hover:bg-gray-100') {
            needsReset = true
          }
        })
        if (needsReset) {
          const resetHexes = new Map<string, Hex>()
          hexes.forEach((currentHex, id) => {
            resetHexes.set(id, {
              ...currentHex,
              fillColorClass: 'bg-white hover:bg-gray-100',
              dangerLevel: 0,
              observerCount: 0,
            })
          })
          setGameState((prev) => ({ ...prev, hexes: resetHexes }))
        }
      }
      return
    }

    let madeChanges = false
    const newCalculatedHexesMap = new Map<string, Hex>()
    const isGlobalJammerActive = activeBuffs.jammerFieldEffect.isActive
    // const globalJammerReduction = isGlobalJammerActive ? activeBuffs.jammerFieldEffect.levelReductionAmount : 0; // Not directly used here, already applied to enemy.level

    hexes.forEach((currentHexInstance, id) => {
      let newDangerLevel = 0
      let newObserverCount = 0

      enemies.forEach((enemy) => {
        if (enemy.isStunnedTurns > 0) return

        // Effective sight range IS the enemy's current (possibly jammed) level
        const effectiveSightRange = enemy.sightRange

        const dist = axialDistance(currentHexInstance, enemy)

        if (dist <= effectiveSightRange) {
          // Score value for danger could be based on originalLevel or current effective level
          // Let's use originalLevel for a consistent danger representation before jammer
          newDangerLevel += (ENEMY_XP_VALUES[enemy.originalLevel] || 0) / Math.pow(dist + 1, 2)
          newObserverCount++
        }
      })

      let newFillColorClass = 'bg-white hover:bg-gray-100'

      if (isObserverCountMapVisible) {
        if (newObserverCount === 0) {
          newFillColorClass = DANGER_COLORS[0]
        } else {
          const colorIndex = Math.min(newObserverCount, DANGER_COLORS.length - 1)
          newFillColorClass = DANGER_COLORS[colorIndex]
        }
      } else if (isDangerMapVisible) {
        if (newDangerLevel === 0) {
          newFillColorClass = DANGER_COLORS[0]
        } else {
          const rawRatio = Math.min(newDangerLevel / MAX_DANGER_FOR_COLOR_SCALE, 1)
          const scaledRatio = Math.sqrt(rawRatio)
          const numEffectiveColors = DANGER_COLORS.length - 1
          let colorBucket = Math.floor(scaledRatio * numEffectiveColors)
          colorBucket = Math.min(colorBucket, numEffectiveColors - 1)
          newFillColorClass = DANGER_COLORS[colorBucket + 1]
        }
      }

      if (
        currentHexInstance.dangerLevel !== newDangerLevel ||
        currentHexInstance.observerCount !== newObserverCount ||
        currentHexInstance.fillColorClass !== newFillColorClass
      ) {
        madeChanges = true
        newCalculatedHexesMap.set(id, {
          ...currentHexInstance,
          dangerLevel: newDangerLevel,
          observerCount: newObserverCount,
          fillColorClass: newFillColorClass,
        })
      } else {
        newCalculatedHexesMap.set(id, currentHexInstance)
      }
    })

    if (madeChanges) {
      setGameState((prev) => ({ ...prev, hexes: newCalculatedHexesMap }))
    }
  }, [
    enemies,
    player,
    gamePhase,
    mapRadius,
    hexes,
    isDangerMapVisible,
    isObserverCountMapVisible,
    activeBuffs.jammerFieldEffect,
    setGameState,
  ])

  useEffect(() => {
    if (gamePhase === 'CollectorDroneTurn' && !isProcessingCollectorDroneTurn && player && !isUpgradeSelection) {
      processCollectorDroneActions()
    }
  }, [gamePhase, isProcessingCollectorDroneTurn, player, isUpgradeSelection, processCollectorDroneActions])

  useEffect(() => {
    if (gamePhase === 'EnemyTurn' && !isProcessingEnemyTurn && player && !isUpgradeSelection) {
      processEnemyTurns()
    }
  }, [gamePhase, isProcessingEnemyTurn, player, isUpgradeSelection, processEnemyTurns])
}
