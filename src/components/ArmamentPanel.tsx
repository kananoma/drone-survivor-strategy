import React from 'react'
import {
  ArmamentName,
  ArmamentLevels,
  ActiveArmamentBuffs,
  GamePhase,
  BoosterStats,
  StealthStats,
  EmpTrapStats,
  BarricadeStats,
  ShockwaveStats,
  JammerStats,
  ChargeFieldStats,
  CollectorDroneStats,
  CrashBombStats,
} from '../types'
import { ARMAMENT_STATS_GETTERS, SPARE_BATTERY_CONFIG, ARMAMENT_ICONS } from '../constants'
import { useLanguage } from '../contexts/LanguageContext'
import { ArmamentDetailDisplay } from './ArmamentDetailDisplay'

interface ArmamentPanelProps {
  onOpenUpgradeModal?: () => void
  canShowUpgradeButton?: boolean
  upgradePoints?: number
  armamentLevels: ArmamentLevels
  activeBuffs: ActiveArmamentBuffs
  onSelectArmament: (armamentId: ArmamentName) => void
  selectedArmament: ArmamentName | null
  gamePhase: GamePhase
  playerActionsRemaining: number
  placedEmpTrapsCount: number
  placedBarricadesCount?: number
  placedChargeFieldsCount?: number
  placedCollectorDronesCount?: number
  currentEnergy: number
  spareBatteriesCount: number
  onUseSpareBattery: () => void
  disabled?: boolean
  isPanelDisabled?: boolean
  isArmamentSelected?: boolean
}

export const ArmamentPanel: React.FC<ArmamentPanelProps> = ({
  onOpenUpgradeModal,
  canShowUpgradeButton,
  upgradePoints = 0,
  armamentLevels,
  activeBuffs,
  onSelectArmament,
  selectedArmament,
  gamePhase,
  playerActionsRemaining,
  placedEmpTrapsCount,
  placedBarricadesCount = 0,
  placedChargeFieldsCount = 0,
  placedCollectorDronesCount = 0,
  currentEnergy,
  spareBatteriesCount,
  onUseSpareBattery,
  disabled = false,
  isPanelDisabled = false,
  isArmamentSelected = false,
}) => {
  const { t } = useLanguage()

  const overallDisabled = disabled || isPanelDisabled

  const renderArmamentButton = (armamentId: ArmamentName) => {
    const level = armamentLevels[armamentId]
    if (level === 0) return null

    const stats = ARMAMENT_STATS_GETTERS[armamentId](level)
    const armamentTitle = t(stats.titleKey)

    const isThisArmamentSelected =
      selectedArmament === armamentId ||
      (gamePhase === 'PlacingEmpTrap' && armamentId === 'trap') ||
      (gamePhase === 'PlacingBarricade' && armamentId === 'barricade') ||
      (gamePhase === 'PlacingChargeField' && armamentId === 'charge_field') ||
      (gamePhase === 'PlacingCollectorDrone' && armamentId === 'collector_drone')

    let isButtonDisabled = overallDisabled
    let badgeText: string | null = null
    let buttonClasses = `flex-shrink-0 w-14 h-14 md:w-16 md:h-16 flex flex-col items-center justify-center text-2xl rounded-md relative transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50`

    if (isThisArmamentSelected) {
      buttonClasses += ' ring-2 ring-yellow-400'
    }

    let performanceText: string | null = null
    switch (armamentId) {
      case 'stealth':
        performanceText = t('ARMAMENT_STEALTH_AVOIDANCE_CHANCE_BADGE', {
          chance: (stats as StealthStats).avoidanceChance,
        })
        break
      case 'trap':
        performanceText = t('ARMAMENT_TRAP_PERFORMANCE_BADGE', { stunDuration: (stats as EmpTrapStats).stunDuration })
        break
      case 'barricade':
        performanceText = t('ARMAMENT_BARRICADE_PERFORMANCE_BADGE', { duration: (stats as BarricadeStats).duration })
        break
      case 'shockwave':
        performanceText = t('ARMAMENT_SHOCKWAVE_PERFORMANCE_BADGE', {
          stunDuration: (stats as ShockwaveStats).stunDuration,
        })
        break
      case 'jammer':
        performanceText = t('ARMAMENT_JAMMER_PERFORMANCE_BADGE', { reduction: (stats as JammerStats).levelReduction })
        break
      case 'charge_field':
        performanceText = t('ARMAMENT_CHARGE_FIELD_PERFORMANCE_BADGE', {
          recovery: (stats as ChargeFieldStats).recoveryAmount,
        })
        break
      case 'collector_drone':
        performanceText = t('ARMAMENT_COLLECTOR_DRONE_PERFORMANCE_BADGE', {
          radius: (stats as CollectorDroneStats).searchRadius,
        })
        break
      case 'crash_bomb':
        performanceText = t('ARMAMENT_CRASH_BOMB_PERFORMANCE_BADGE', {
          coolingRate: (stats as CrashBombStats).coolingRatePerTurn,
        })
        break
    }

    const energyCost = armamentId === 'crash_bomb' ? (stats as CrashBombStats).energyCost : stats.energyCost
    const energyPercentage =
      energyCost > 0 && energyCost !== Infinity ? Math.min(100, (currentEnergy / energyCost) * 100) : 0

    const progressStyle = {
      '--energy-progress': `${energyPercentage}%`,
    } as React.CSSProperties

    if (stats.energyCost > currentEnergy && armamentId !== 'crash_bomb') {
      isButtonDisabled = true
    } else if (armamentId === 'crash_bomb' && currentEnergy < (stats as CrashBombStats).energyCost) {
      isButtonDisabled = true
    }

    if (armamentId === 'booster') {
      const boosterStats = stats as BoosterStats
      const usesLeft = boosterStats.usesPerTurn - activeBuffs.boosterUsesThisTurn
      badgeText = t('ARMAMENT_BUTTON_USES_LEFT_BADGE', { usesLeft, totalUses: boosterStats.usesPerTurn })
      if (usesLeft <= 0) {
        isButtonDisabled = true
      }
    } else if (armamentId === 'stealth') {
      if (activeBuffs.stealth.isActive) {
        isButtonDisabled = true
        badgeText = t('ARMAMENT_BUTTON_ACTIVE_TURNS_BADGE', { turnsLeft: activeBuffs.stealth.turnsLeft })
        buttonClasses += ' ring-2 ring-green-400'
      }
    } else if (armamentId === 'trap') {
      const trapStats = stats as EmpTrapStats
      badgeText = t('ARMAMENT_BUTTON_MAX_TRAPS_DEPLOYED_BADGE', {
        current: placedEmpTrapsCount,
        max: trapStats.maxCharges,
      })
      if (placedEmpTrapsCount >= trapStats.maxCharges) {
        isButtonDisabled = true
      }
    } else if (armamentId === 'barricade') {
      const barricadeStats = stats as BarricadeStats
      badgeText = t('ARMAMENT_BUTTON_MAX_BARRICADES_DEPLOYED_BADGE', {
        current: placedBarricadesCount,
        max: barricadeStats.maxCharges,
      })
      if (placedBarricadesCount >= barricadeStats.maxCharges) {
        isButtonDisabled = true
      }
    } else if (armamentId === 'jammer') {
      if (activeBuffs.jammerFieldEffect.isActive) {
        isButtonDisabled = true
        badgeText = t('ARMAMENT_BUTTON_ACTIVE_TURNS_BADGE', { turnsLeft: activeBuffs.jammerFieldEffect.turnsLeft })
        buttonClasses += ' ring-2 ring-purple-400'
      }
    } else if (armamentId === 'charge_field') {
      const chargeFieldStats = stats as ChargeFieldStats
      badgeText = t('ARMAMENT_BUTTON_MAX_CHARGE_FIELDS_DEPLOYED_BADGE', {
        current: placedChargeFieldsCount,
        max: chargeFieldStats.maxPlaced,
      })
      if (placedChargeFieldsCount >= chargeFieldStats.maxPlaced) {
        isButtonDisabled = true
      }
    } else if (armamentId === 'collector_drone') {
      const collectorDroneStats = stats as CollectorDroneStats
      badgeText = t('ARMAMENT_BUTTON_MAX_COLLECTOR_DRONES_DEPLOYED_BADGE', {
        current: placedCollectorDronesCount,
        max: collectorDroneStats.maxPlaced,
      })
      if (placedCollectorDronesCount >= collectorDroneStats.maxPlaced) {
        isButtonDisabled = true
      }
    } else if (armamentId === 'crash_bomb') {
      if (activeBuffs.overheat.isActive) {
        isButtonDisabled = true
        badgeText = t('INFO_OVERHEAT_STATUS_GAUGE_LABEL')
      }
    }

    const canUseArmamentThisPhase = gamePhase === 'PlayerTurn' || gamePhase === 'Playing'

    const isInstantUse = ['booster', 'stealth', 'shockwave', 'jammer', 'crash_bomb'].includes(armamentId)
    if (!isInstantUse && playerActionsRemaining <= 0 && canUseArmamentThisPhase) {
      isButtonDisabled = true
    }

    if (activeBuffs.overheat.isActive && armamentId !== 'crash_bomb') {
      isButtonDisabled = true
    }

    if (isButtonDisabled) {
      buttonClasses += ' bg-gray-600 opacity-50 cursor-not-allowed'
    } else if (armamentId === 'crash_bomb') {
      buttonClasses += ' bg-red-700 hover:bg-red-800 text-white focus:ring-red-500'
    } else {
      buttonClasses += ' bg-sky-700 hover:bg-sky-600 text-white focus:ring-sky-500'
    }

    return (
      <button
        key={armamentId}
        onClick={() => onSelectArmament(armamentId)}
        disabled={isButtonDisabled}
        className={buttonClasses}
        aria-label={`${armamentTitle} Lv.${level}`}
      >
        <div className="armament-progress-overlay" style={progressStyle} />
        <span className="text-3xl relative z-10">{ARMAMENT_ICONS[armamentId]}</span>
        <span className="text-[0.6rem] leading-none mt-0.5 text-gray-200 relative z-10">Lv.{level}</span>
        {performanceText && (
          <span className="text-green-300 text-[0.75rem] font-bold leading-tight mt-0.5 relative z-10">
            {performanceText}
          </span>
        )}
        {badgeText && (
          <span
            className={`absolute -top-1 -right-1 text-white text-[0.75rem] font-bold px-1.5 py-0.5 rounded-full shadow-md leading-none z-20
            ${
              (armamentId === 'stealth' && activeBuffs.stealth.isActive) ||
              (armamentId === 'jammer' && activeBuffs.jammerFieldEffect.isActive)
                ? 'bg-green-500'
                : armamentId === 'crash_bomb' && activeBuffs.overheat.isActive
                ? 'bg-orange-500'
                : 'bg-blue-500'
            }`}
          >
            {badgeText}
          </span>
        )}
      </button>
    )
  }

  const installedArmaments = Object.keys(armamentLevels) as ArmamentName[]
  const regularArmamentsToDisplay = installedArmaments.filter((id) => armamentLevels[id] > 0)

  // Mobile layout adjustment
  return (
    <div className="md:space-y-3 w-full">
      {/* Desktop Layout */}
      <div className="hidden md:block w-full space-y-3">
        {onOpenUpgradeModal && (
          <button
            onClick={overallDisabled ? undefined : onOpenUpgradeModal}
            disabled={!canShowUpgradeButton || overallDisabled || isArmamentSelected}
            className={`w-full relative font-bold py-2 px-4 rounded transition-colors text-white text-sm
                        ${
                          canShowUpgradeButton && !overallDisabled && !isArmamentSelected
                            ? 'bg-yellow-500 hover:bg-yellow-600 animate-pulse'
                            : 'bg-gray-600 opacity-50 cursor-not-allowed'
                        }`}
            aria-label={t('CONTROLS_UPGRADE_SYSTEM') + (upgradePoints > 0 ? ` (${upgradePoints})` : '')}
          >
            {t('CONTROLS_UPGRADE_SYSTEM')}
            {upgradePoints > 0 && (
              <span className="absolute top-0 right-0 -mt-2 -mr-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full shadow-md">
                {upgradePoints}
              </span>
            )}
          </button>
        )}

        {regularArmamentsToDisplay.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-sky-400 mb-1.5 text-center uppercase tracking-wider hidden md:block">
              {t('ARMAMENT_PANEL_ARMAMENTS_SECTION_TITLE')}
            </h4>
            <div className="flex md:flex-wrap gap-2 justify-center md:justify-start overflow-x-auto no-scrollbar md:overflow-visible p-1 md:p-0">
              {regularArmamentsToDisplay.map(renderArmamentButton)}
            </div>
          </div>
        )}

        {regularArmamentsToDisplay.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">{t('ARMAMENT_PANEL_NO_ARMAMENTS')}</p>
        )}

        {spareBatteriesCount > 0 && (
          <div
            className={`mt-3 pt-3 ${
              regularArmamentsToDisplay.length > 0 ? 'border-t border-yellow-600 border-opacity-50' : ''
            }`}
          >
            <h4 className="text-xs font-semibold text-yellow-400 mb-1.5 text-center uppercase tracking-wider">
              {t('ARMAMENT_PANEL_CONSUMABLES')}
            </h4>
            <div className="flex justify-center">
              <button
                onClick={onUseSpareBattery}
                disabled={
                  overallDisabled ||
                  (gamePhase !== 'PlayerTurn' && gamePhase !== 'Playing') ||
                  activeBuffs.overheat.isActive ||
                  isArmamentSelected
                }
                className={`flex-shrink-0 w-14 h-14 md:w-16 md:h-16 flex flex-col items-center justify-center text-2xl rounded-md relative transition-colors
                              ${
                                overallDisabled ||
                                (gamePhase !== 'PlayerTurn' && gamePhase !== 'Playing') ||
                                activeBuffs.overheat.isActive ||
                                isArmamentSelected
                                  ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                                  : 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-300'
                              }`}
                title={
                  t('USE_SPARE_BATTERY_TOOLTIP', { energyValue: SPARE_BATTERY_CONFIG.energyValue }) +
                  (activeBuffs.overheat.isActive ? ` | ${t('ARMAMENT_TOOLTIP_OVERHEATED')}` : '')
                }
              >
                <span className="text-3xl">{SPARE_BATTERY_CONFIG.icon}</span>
                <span className="absolute -bottom-0.5 right-0 bg-blue-500 text-white text-[0.75rem] font-bold px-1 rounded-full shadow-md leading-none">
                  {spareBatteriesCount}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full flex justify-between items-start gap-2">
        {isArmamentSelected && (
          <div className="flex-grow w-1/2 pr-2">
            <ArmamentDetailDisplay
              selectedArmament={selectedArmament}
              gamePhase={gamePhase}
              armamentLevels={armamentLevels}
            />
          </div>
        )}
        <div className={`flex flex-col gap-2 ${isArmamentSelected ? 'items-end' : 'w-full'}`}>
          {onOpenUpgradeModal && (
            <button
              onClick={overallDisabled ? undefined : onOpenUpgradeModal}
              disabled={!canShowUpgradeButton || overallDisabled || isArmamentSelected}
              className={`w-full relative font-bold py-2 px-4 rounded transition-colors text-white text-sm
                        ${
                          canShowUpgradeButton && !overallDisabled && !isArmamentSelected
                            ? 'bg-yellow-500 hover:bg-yellow-600 animate-pulse'
                            : 'bg-gray-600 opacity-50 cursor-not-allowed'
                        }`}
              aria-label={t('CONTROLS_UPGRADE_SYSTEM') + (upgradePoints > 0 ? ` (${upgradePoints})` : '')}
            >
              {t('CONTROLS_UPGRADE_SYSTEM')}
              {upgradePoints > 0 && (
                <span className="absolute top-0 right-0 -mt-2 -mr-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full shadow-md">
                  {upgradePoints}
                </span>
              )}
            </button>
          )}

          {regularArmamentsToDisplay.length === 0 && !isArmamentSelected && (
            <p className="text-sm text-gray-400 text-center py-2 w-full">{t('ARMAMENT_PANEL_NO_ARMAMENTS')}</p>
          )}

          <div className={`flex flex-wrap gap-2 ${isArmamentSelected ? 'justify-end' : 'justify-center w-full'}`}>
            {regularArmamentsToDisplay.map(renderArmamentButton)}
          </div>

          {spareBatteriesCount > 0 && (
            <div className={`flex ${isArmamentSelected ? 'justify-end' : 'justify-center w-full'} mt-2`}>
              <button
                onClick={onUseSpareBattery}
                disabled={
                  overallDisabled ||
                  (gamePhase !== 'PlayerTurn' && gamePhase !== 'Playing') ||
                  activeBuffs.overheat.isActive ||
                  isArmamentSelected
                }
                className={`flex-shrink-0 w-14 h-14 flex flex-col items-center justify-center text-2xl rounded-md relative transition-colors
                              ${
                                overallDisabled ||
                                (gamePhase !== 'PlayerTurn' && gamePhase !== 'Playing') ||
                                activeBuffs.overheat.isActive ||
                                isArmamentSelected
                                  ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                                  : 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-300'
                              }`}
                title={
                  t('USE_SPARE_BATTERY_TOOLTIP', { energyValue: SPARE_BATTERY_CONFIG.energyValue }) +
                  (activeBuffs.overheat.isActive ? ` | ${t('ARMAMENT_TOOLTIP_OVERHEATED')}` : '')
                }
              >
                <span className="text-3xl">{SPARE_BATTERY_CONFIG.icon}</span>
                <span className="absolute -bottom-0.5 right-0 bg-blue-500 text-white text-[0.75rem] font-bold px-1 rounded-full shadow-md leading-none">
                  {spareBatteriesCount}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
