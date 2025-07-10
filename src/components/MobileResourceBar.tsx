import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { ActiveArmamentBuffs, ArmamentLevels, CrashBombStats } from '../types'
import { MAX_HEAT_CRASH_BOMB, ARMAMENT_STATS_GETTERS } from '../constants'

interface MobileResourceBarProps {
  currentEnergy: number
  previewEnergyCost: number
  maxEnergy: number
  playerLevel: number
  currentExp: number
  expToNextLevel: number
  activeBuffs: ActiveArmamentBuffs
  armamentLevels: ArmamentLevels
}

export const MobileResourceBar: React.FC<MobileResourceBarProps> = ({
  currentEnergy,
  previewEnergyCost,
  maxEnergy,
  playerLevel,
  currentExp,
  expToNextLevel,
  activeBuffs,
  armamentLevels,
}) => {
  const { t } = useLanguage()

  const energyAfterPreview = Math.max(0, currentEnergy - previewEnergyCost)
  const currentEnergyPercentage = maxEnergy > 0 ? (currentEnergy / maxEnergy) * 100 : 0
  const energyAfterPreviewPercentage = maxEnergy > 0 ? (energyAfterPreview / maxEnergy) * 100 : 0
  const dataPercentage = expToNextLevel > 0 ? (currentExp / expToNextLevel) * 100 : 0

  let heatPercentage = 0
  let turnsToCooldownCrashBomb: number | null = null
  if (activeBuffs.overheat.isActive) {
    heatPercentage = (activeBuffs.overheat.currentHeat / MAX_HEAT_CRASH_BOMB) * 100
    if (armamentLevels.crash_bomb > 0) {
      const crashBombStats = ARMAMENT_STATS_GETTERS.crash_bomb(armamentLevels.crash_bomb) as CrashBombStats
      if (crashBombStats.coolingRatePerTurn > 0) {
        turnsToCooldownCrashBomb = Math.ceil(activeBuffs.overheat.currentHeat / crashBombStats.coolingRatePerTurn)
      }
    }
  }

  return (
    <div className="px-2 pt-1 pb-2">
      {/* Bars grid */}
      <div className="grid grid-cols-2 gap-x-3 items-start">
        {/* Energy/Heat Bar */}
        <div>
          {activeBuffs.overheat.isActive ? (
            <>
              <div
                className="flex justify-between items-baseline text-xs text-red-400 uppercase"
                style={{ fontSize: '0.6rem' }}
              >
                <span>{t('INFO_OVERHEAT_STATUS_GAUGE_LABEL')}</span>
                <span className="flex items-baseline">
                  <span className="mr-1">
                    {activeBuffs.overheat.currentHeat}/{MAX_HEAT_CRASH_BOMB}
                  </span>
                  {turnsToCooldownCrashBomb !== null && turnsToCooldownCrashBomb > 0 && (
                    <span className="text-red-300">
                      ({t('INFO_OVERHEAT_COOLDOWN_TURNS', { turns: turnsToCooldownCrashBomb })})
                    </span>
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-red-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${heatPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={activeBuffs.overheat.currentHeat}
                  aria-valuemin={0}
                  aria-valuemax={MAX_HEAT_CRASH_BOMB}
                  aria-label={t('INFO_OVERHEAT_STATUS_GAUGE_LABEL')}
                ></div>
              </div>
            </>
          ) : (
            <>
              <div
                className="flex justify-between items-baseline text-xs text-cyan-400 uppercase"
                style={{ fontSize: '0.6rem' }}
              >
                <span>{t('INFO_ENERGY')}</span>
                <span>
                  {previewEnergyCost > 0 ? `${energyAfterPreview} / ${maxEnergy}` : `${currentEnergy} / ${maxEnergy}`}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5 relative">
                {previewEnergyCost > 0 && (
                  <div
                    className="absolute top-0 left-0 bg-yellow-500/70 h-1.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${currentEnergyPercentage}%` }}
                    aria-hidden="true"
                  ></div>
                )}
                <div
                  className="absolute top-0 left-0 bg-cyan-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${energyAfterPreviewPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={energyAfterPreview}
                  aria-valuemin={0}
                  aria-valuemax={maxEnergy}
                  aria-label={t('INFO_ENERGY')}
                ></div>
              </div>
            </>
          )}
        </div>

        {/* Level & EXP */}
        <div>
          <div
            className="flex justify-between items-baseline text-xs text-purple-400 uppercase"
            style={{ fontSize: '0.6rem' }}
          >
            <span>
              {t('INFO_SYS_LEVEL')} <span className="text-xs font-bold text-white">{playerLevel}</span>
            </span>
            <span className="text-indigo-400">
              {currentExp}/{expToNextLevel}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${dataPercentage}%` }}
              role="progressbar"
              aria-valuenow={currentExp}
              aria-valuemin={0}
              aria-valuemax={expToNextLevel}
              aria-label={t('INFO_DATA')}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}
