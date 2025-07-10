import { useCallback } from 'react'
import { GameLogicState } from '../../gameLogic/initialState'
import {
  GamePhase,
  ArmamentName,
  UpgradeOption,
  BoosterStats,
  StealthStats,
  EmpTrapStats,
  BarricadeStats,
  ShockwaveStats,
  JammerStats,
  ChargeFieldStats,
  CollectorDroneStats,
  CrashBombStats,
} from '../../types'
import {
  INITIAL_EXP_TO_NEXT_LEVEL,
  LEVEL_EXP_SCALING_FACTOR,
  ARMAMENT_STATS_GETTERS,
  INITIAL_ENERGY_RECOVERY_PER_TURN,
  UPGRADE_MAX_ENERGY_MK1_VALUE,
  UPGRADE_ENERGY_RECOVERY_MK1_VALUE,
  MAX_INSTALLED_ARMAMENTS_COUNT,
} from '../../constants'

export const useUpgradeSystem = (
  gameState: GameLogicState,
  setGameState: React.Dispatch<React.SetStateAction<GameLogicState>>,
  addMessage: (msgKey: string, params?: Record<string, string | number>, isImportant?: boolean) => void,
  t: (key: string, params?: Record<string, string | number>) => string,
  addLog: (logData: any) => void
) => {
  const {
    playerLevel,
    upgradePoints,
    gamePhase,
    armamentLevels,
    maxEnergy,
    bonusEnergyRecoveryPerTurn,
    upgradeOptions: currentUpgradeOptions,
  } = gameState

  const generateUpgradeOptions = useCallback((): UpgradeOption[] => {
    const availableOptions: UpgradeOption[] = []
    const installedArmamentTypesCount = (Object.keys(armamentLevels) as ArmamentName[]).filter(
      (id) => armamentLevels[id] > 0
    ).length

    ;(Object.keys(ARMAMENT_STATS_GETTERS) as ArmamentName[]).forEach((armamentId) => {
      const currentLevel = armamentLevels[armamentId]
      const nextLevel = currentLevel + 1

      let armamentMaxLevel = 0
      let armamentMaxLevelDetermined = false
      let testLevel = 1
      while (true) {
        const statsAtTestLevel = ARMAMENT_STATS_GETTERS[armamentId](testLevel)
        if (statsAtTestLevel.isMaxLevel) {
          armamentMaxLevel = testLevel
          armamentMaxLevelDetermined = true
          break
        }
        // Safety break for poorly defined max levels in constants
        if (testLevel > 15) {
          const exampleStats = ARMAMENT_STATS_GETTERS[armamentId](1) as any
          let inferredMax = 10 // Default to 10 if specific fallback logic is missing
          // Fallback logic for specific armaments if their 'isMaxLevel' isn't hit by testLevel 15
          if (armamentId === 'booster' && exampleStats.usesPerTurn !== undefined) inferredMax = 10
          else if (armamentId === 'stealth' && exampleStats.avoidanceChance !== undefined) inferredMax = 10
          else if (armamentId === 'trap' && exampleStats.maxCharges !== undefined) inferredMax = 10
          else if (armamentId === 'barricade' && exampleStats.duration !== undefined) inferredMax = 10
          else if (armamentId === 'shockwave' && exampleStats.pushDistance !== undefined) inferredMax = 10
          else if (armamentId === 'jammer' && exampleStats.levelReduction !== undefined) inferredMax = 10
          else if (armamentId === 'charge_field' && exampleStats.recoveryAmount !== undefined) inferredMax = 10
          else if (armamentId === 'collector_drone' && exampleStats.searchRadius !== undefined) inferredMax = 10
          else if (armamentId === 'crash_bomb' && exampleStats.coolingRatePerTurn !== undefined) inferredMax = 10

          armamentMaxLevel = inferredMax
          armamentMaxLevelDetermined = true
          addLog({
            type: 'INFO',
            message: `Warning: Max level for ${armamentId} inferred by fallback (${armamentMaxLevel}) due to loop limit.`,
          })
          break
        }
        testLevel++
      }
      if (!armamentMaxLevelDetermined) {
        armamentMaxLevel = 10 // Final fallback if loop somehow exits without determining
        addLog({
          type: 'INFO',
          message: `Critical Warning: Max level for ${armamentId} defaulted to ${armamentMaxLevel}, loop exited unexpectedly.`,
        })
      }

      if (currentLevel < armamentMaxLevel) {
        const nextLevelStatsFn = ARMAMENT_STATS_GETTERS[armamentId]
        const nextLevelStats = nextLevelStatsFn(nextLevel)
        const translatedArmamentName = t(nextLevelStats.titleKey)

        let titleKey: string
        let titleParams: Record<string, string | number>
        let descriptionKey: string
        let descriptionParams: Record<string, string | number> = {}
        let optionType: 'install_armament' | 'upgrade_armament'

        if (currentLevel === 0) {
          if (installedArmamentTypesCount >= MAX_INSTALLED_ARMAMENTS_COUNT) {
            return
          }
          optionType = 'install_armament'
          titleKey = 'UPGRADE_INSTALL_TITLE_PREFIX'
          titleParams = { armamentName: translatedArmamentName }
          descriptionKey = nextLevelStats.descriptionKey
          descriptionParams = { cost: nextLevelStats.energyCost, level: nextLevel }
          if (armamentId === 'booster') {
            descriptionParams.actionsGranted = (nextLevelStats as BoosterStats).actionsGranted
            descriptionParams.usesPerTurn = (nextLevelStats as BoosterStats).usesPerTurn
          } else if (armamentId === 'stealth') {
            descriptionParams.duration = (nextLevelStats as StealthStats).duration
            descriptionParams.avoidanceChance = (nextLevelStats as StealthStats).avoidanceChance
          } else if (armamentId === 'trap') {
            descriptionParams.stunDuration = (nextLevelStats as EmpTrapStats).stunDuration
            descriptionParams.maxCharges = (nextLevelStats as EmpTrapStats).maxCharges
          } else if (armamentId === 'barricade') {
            descriptionParams.duration = (nextLevelStats as BarricadeStats).duration
            descriptionParams.maxCharges = (nextLevelStats as BarricadeStats).maxCharges
          } else if (armamentId === 'shockwave') {
            descriptionParams.pushDistance = (nextLevelStats as ShockwaveStats).pushDistance
            descriptionParams.stunDuration = (nextLevelStats as ShockwaveStats).stunDuration
          } else if (armamentId === 'jammer') {
            descriptionParams.reduction = (nextLevelStats as JammerStats).levelReduction
            descriptionParams.duration = (nextLevelStats as JammerStats).duration
          } else if (armamentId === 'charge_field') {
            descriptionParams.radius = (nextLevelStats as ChargeFieldStats).effectRadius
            descriptionParams.recovery = (nextLevelStats as ChargeFieldStats).recoveryAmount
            descriptionParams.duration = (nextLevelStats as ChargeFieldStats).duration
            descriptionParams.maxPlaced = (nextLevelStats as ChargeFieldStats).maxPlaced
          } else if (armamentId === 'collector_drone') {
            descriptionParams.searchRadius = (nextLevelStats as CollectorDroneStats).searchRadius
            descriptionParams.lifespan = (nextLevelStats as CollectorDroneStats).lifespan
            descriptionParams.maxPlaced = (nextLevelStats as CollectorDroneStats).maxPlaced
          } else if (armamentId === 'crash_bomb') {
            const cbStats = nextLevelStats as CrashBombStats
            descriptionParams.initialCost = cbStats.energyCost
            descriptionParams.maxHeat = cbStats.maxHeat
            descriptionParams.coolingRatePerTurn = cbStats.coolingRatePerTurn
          }
        } else {
          optionType = 'upgrade_armament'
          titleKey = 'UPGRADE_UPGRADE_TITLE_PREFIX'
          titleParams = { armamentName: translatedArmamentName, currentLevel, nextLevel }
          const currentStats = ARMAMENT_STATS_GETTERS[armamentId](currentLevel)
          descriptionParams = {
            currentCost: currentStats.energyCost,
            newCost: nextLevelStats.energyCost,
            currentLevel,
            nextLevel,
          }
          if (armamentId === 'booster') {
            descriptionKey = 'UPGRADE_ARMAMENT_BOOSTER_EFFECT_DESC'
            descriptionParams.currentUsesPerTurn = (currentStats as BoosterStats).usesPerTurn
            descriptionParams.newUsesPerTurn = (nextLevelStats as BoosterStats).usesPerTurn
            descriptionParams.actionsGranted = (nextLevelStats as BoosterStats).actionsGranted
          } else if (armamentId === 'stealth') {
            descriptionKey = 'UPGRADE_ARMAMENT_STEALTH_EFFECT_DESC'
            descriptionParams.currentDuration = (currentStats as StealthStats).duration
            descriptionParams.newDuration = (nextLevelStats as StealthStats).duration
            descriptionParams.currentAvoidanceChance = (currentStats as StealthStats).avoidanceChance
            descriptionParams.newAvoidanceChance = (nextLevelStats as StealthStats).avoidanceChance
          } else if (armamentId === 'trap') {
            descriptionKey = 'UPGRADE_ARMAMENT_TRAP_EFFECT_DESC'
            descriptionParams.currentStunDuration = (currentStats as EmpTrapStats).stunDuration
            descriptionParams.newStunDuration = (nextLevelStats as EmpTrapStats).stunDuration
            descriptionParams.currentMaxCharges = (currentStats as EmpTrapStats).maxCharges
            descriptionParams.newMaxCharges = (nextLevelStats as EmpTrapStats).maxCharges
          } else if (armamentId === 'barricade') {
            descriptionKey = 'UPGRADE_ARMAMENT_BARRICADE_EFFECT_DESC'
            descriptionParams.currentDuration = (currentStats as BarricadeStats).duration
            descriptionParams.newDuration = (nextLevelStats as BarricadeStats).duration
            descriptionParams.currentMaxCharges = (currentStats as BarricadeStats).maxCharges
            descriptionParams.newMaxCharges = (nextLevelStats as BarricadeStats).maxCharges
          } else if (armamentId === 'shockwave') {
            descriptionKey = 'UPGRADE_ARMAMENT_SHOCKWAVE_EFFECT_DESC'
            descriptionParams.currentPushDistance = (currentStats as ShockwaveStats).pushDistance
            descriptionParams.newPushDistance = (nextLevelStats as ShockwaveStats).pushDistance
            descriptionParams.currentStunDuration = (currentStats as ShockwaveStats).stunDuration
            descriptionParams.newStunDuration = (nextLevelStats as ShockwaveStats).stunDuration
          } else if (armamentId === 'jammer') {
            descriptionKey = 'UPGRADE_ARMAMENT_JAMMER_GLOBAL_EFFECT_DESC'
            descriptionParams.currentReduction = (currentStats as JammerStats).levelReduction
            descriptionParams.newReduction = (nextLevelStats as JammerStats).levelReduction
            descriptionParams.currentDuration = (currentStats as JammerStats).duration
            descriptionParams.newDuration = (nextLevelStats as JammerStats).duration
          } else if (armamentId === 'charge_field') {
            descriptionKey = 'UPGRADE_ARMAMENT_CHARGE_FIELD_EFFECT_DESC'
            descriptionParams.currentRadius = (currentStats as ChargeFieldStats).effectRadius
            descriptionParams.newRadius = (nextLevelStats as ChargeFieldStats).effectRadius
            descriptionParams.currentRecovery = (currentStats as ChargeFieldStats).recoveryAmount
            descriptionParams.newRecovery = (nextLevelStats as ChargeFieldStats).recoveryAmount
            descriptionParams.currentDuration = (currentStats as ChargeFieldStats).duration
            descriptionParams.newDuration = (nextLevelStats as ChargeFieldStats).duration
            descriptionParams.currentMaxPlaced = (currentStats as ChargeFieldStats).maxPlaced
            descriptionParams.newMaxPlaced = (nextLevelStats as ChargeFieldStats).maxPlaced
          } else if (armamentId === 'collector_drone') {
            descriptionKey = 'UPGRADE_ARMAMENT_COLLECTOR_DRONE_EFFECT_DESC'
            descriptionParams.currentSearchRadius = (currentStats as CollectorDroneStats).searchRadius
            descriptionParams.newSearchRadius = (nextLevelStats as CollectorDroneStats).searchRadius
            descriptionParams.currentLifespan = (currentStats as CollectorDroneStats).lifespan
            descriptionParams.newLifespan = (nextLevelStats as CollectorDroneStats).lifespan
            descriptionParams.currentMaxPlaced = (currentStats as CollectorDroneStats).maxPlaced
            descriptionParams.newMaxPlaced = (nextLevelStats as CollectorDroneStats).maxPlaced
          } else if (armamentId === 'crash_bomb') {
            descriptionKey = 'UPGRADE_ARMAMENT_CRASH_BOMB_EFFECT_DESC'
            const currentCbStats = currentStats as CrashBombStats
            const nextCbStats = nextLevelStats as CrashBombStats
            descriptionParams.currentInitialCost = currentCbStats.energyCost
            descriptionParams.newInitialCost = nextCbStats.energyCost
            descriptionParams.maxHeat = nextCbStats.maxHeat // Max heat is fixed
            descriptionParams.currentCoolingRatePerTurn = currentCbStats.coolingRatePerTurn
            descriptionParams.newCoolingRatePerTurn = nextCbStats.coolingRatePerTurn
          } else descriptionKey = nextLevelStats.descriptionKey
        }
        availableOptions.push({
          id: `${armamentId}_to_lv${nextLevel}`,
          armamentId,
          type: optionType,
          titleKey,
          descriptionKey,
          titleParams,
          descriptionParams,
          isLearning: currentLevel === 0,
          targetLevel: nextLevel,
        })
      }
    })
    availableOptions.push({
      id: 'drone_max_energy_1',
      type: 'drone_enhancement',
      titleKey: 'UPGRADE_MAX_ENERGY1_TITLE',
      descriptionKey: 'UPGRADE_MAX_ENERGY1_DESC',
      descriptionParams: {
        value: UPGRADE_MAX_ENERGY_MK1_VALUE,
        currentMaxEnergy: maxEnergy,
        newMaxEnergy: maxEnergy + UPGRADE_MAX_ENERGY_MK1_VALUE,
      },
      enhancementKey: 'maxEnergy',
      enhancementValue: UPGRADE_MAX_ENERGY_MK1_VALUE,
    })
    const currentEffectiveRecovery = INITIAL_ENERGY_RECOVERY_PER_TURN + bonusEnergyRecoveryPerTurn
    availableOptions.push({
      id: 'drone_energy_recovery_1',
      type: 'drone_enhancement',
      titleKey: 'UPGRADE_ENERGY_RECOVERY1_TITLE',
      descriptionKey: 'UPGRADE_ENERGY_RECOVERY1_DESC',
      descriptionParams: {
        value: UPGRADE_ENERGY_RECOVERY_MK1_VALUE,
        currentRecovery: currentEffectiveRecovery,
        newRecovery: currentEffectiveRecovery + UPGRADE_ENERGY_RECOVERY_MK1_VALUE,
      },
      enhancementKey: 'energyRecovery',
      enhancementValue: UPGRADE_ENERGY_RECOVERY_MK1_VALUE,
    })
    return availableOptions
  }, [armamentLevels, maxEnergy, bonusEnergyRecoveryPerTurn, t, addLog])

  const handleOpenUpgradeModal = useCallback(() => {
    if (upgradePoints > 0 && (gamePhase === 'PlayerTurn' || gamePhase === 'Playing')) {
      const allOptions = generateUpgradeOptions()
      if (allOptions.length > 0) {
        const shuffledOptions = [...allOptions].sort(() => 0.5 - Math.random())
        const selectedOptions = shuffledOptions.slice(0, 3)
        const calculatedEffectiveLevel = playerLevel - upgradePoints + 1
        setGameState((prev) => ({
          ...prev,
          isUpgradeSelection: true,
          isDebugUpgradeSelection: false,
          upgradeOptions: selectedOptions,
          gamePhase: 'UpgradeSelection',
          effectiveLevelForUpgradeContext: calculatedEffectiveLevel,
        }))
        addMessage('MESSAGE_SYSTEM_ENHANCEMENT_OPENED')
      } else {
        const installedArmamentTypesCount = (Object.keys(armamentLevels) as ArmamentName[]).filter(
          (id) => armamentLevels[id] > 0
        ).length
        if (
          installedArmamentTypesCount >= MAX_INSTALLED_ARMAMENTS_COUNT &&
          allOptions.every((opt) => opt.type === 'install_armament')
        ) {
          addMessage('MESSAGE_MAX_ARMAMENTS_REACHED', { maxCount: MAX_INSTALLED_ARMAMENTS_COUNT })
        } else {
          addLog({ type: 'INFO', message: t('MESSAGE_UPGRADE_ATTEMPT_FAILED_NO_OPTIONS') })
          addMessage('MESSAGE_UPGRADE_ATTEMPT_FAILED_NO_OPTIONS')
        }
      }
    } else {
      if (upgradePoints <= 0) addMessage('MESSAGE_NO_UPGRADE_POINTS')
      else addMessage('MESSAGE_CANNOT_ACCESS_UPGRADES_NOW')
    }
  }, [
    upgradePoints,
    gamePhase,
    playerLevel,
    generateUpgradeOptions,
    addMessage,
    addLog,
    t,
    setGameState,
    armamentLevels,
  ])

  const handleOpenDebugUpgradeModal = useCallback(() => {
    const allOptions = generateUpgradeOptions()
    if (allOptions.length > 0) {
      setGameState((prev) => ({
        ...prev,
        isUpgradeSelection: true,
        isDebugUpgradeSelection: true,
        upgradeOptions: allOptions,
        gamePhase: 'UpgradeSelection',
        effectiveLevelForUpgradeContext: prev.playerLevel,
      }))
      addMessage('MESSAGE_SYSTEM_ENHANCEMENT_OPENED_DEBUG')
    } else {
      addLog({ type: 'INFO', message: t('MESSAGE_UPGRADE_ATTEMPT_FAILED_NO_OPTIONS') })
      addMessage('MESSAGE_UPGRADE_ATTEMPT_FAILED_NO_OPTIONS')
    }
  }, [generateUpgradeOptions, addMessage, addLog, t, setGameState])

  const handleSelectUpgradeOption = useCallback(
    (optionId: string) => {
      const selectedOption = currentUpgradeOptions.find((opt) => opt.id === optionId)
      if (!selectedOption) {
        addLog({ type: 'INFO', message: `Error: Selected upgrade option ID ${optionId} not found.` })
        setGameState((prev) => ({
          ...prev,
          isUpgradeSelection: false,
          isDebugUpgradeSelection: false,
          effectiveLevelForUpgradeContext: undefined,
          gamePhase: 'PlayerTurn',
        }))
        return
      }
      addMessage('MESSAGE_UPGRADE_APPLIED', { optionTitle: t(selectedOption.titleKey, selectedOption.titleParams) })
      setGameState((prev) => {
        let newArmamentLevels = { ...prev.armamentLevels }
        let newMaxEnergy = prev.maxEnergy
        let newBonusEnergyRecovery = prev.bonusEnergyRecoveryPerTurn
        let newUpgradePoints = prev.upgradePoints

        if (selectedOption.type === 'install_armament' && selectedOption.armamentId && selectedOption.targetLevel)
          newArmamentLevels[selectedOption.armamentId] = selectedOption.targetLevel
        else if (selectedOption.type === 'upgrade_armament' && selectedOption.armamentId && selectedOption.targetLevel)
          newArmamentLevels[selectedOption.armamentId] = selectedOption.targetLevel
        else if (selectedOption.type === 'drone_enhancement') {
          if (selectedOption.enhancementKey === 'maxEnergy' && selectedOption.enhancementValue)
            newMaxEnergy += selectedOption.enhancementValue
          else if (selectedOption.enhancementKey === 'energyRecovery' && selectedOption.enhancementValue)
            newBonusEnergyRecovery += selectedOption.enhancementValue
        }
        if (!prev.isDebugUpgradeSelection) newUpgradePoints = Math.max(0, newUpgradePoints - 1)
        return {
          ...prev,
          armamentLevels: newArmamentLevels,
          maxEnergy: newMaxEnergy,
          bonusEnergyRecoveryPerTurn: newBonusEnergyRecovery,
          isUpgradeSelection: false,
          isDebugUpgradeSelection: false,
          upgradeOptions: [],
          upgradePoints: newUpgradePoints,
          gamePhase: 'PlayerTurn',
          effectiveLevelForUpgradeContext: undefined,
        }
      })
    },
    [addMessage, currentUpgradeOptions, addLog, t, setGameState]
  )

  return {
    generateUpgradeOptions,
    handleOpenUpgradeModal,
    handleOpenDebugUpgradeModal,
    handleSelectUpgradeOption,
  }
}
