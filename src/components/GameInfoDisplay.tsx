import React, { useEffect, useRef } from 'react'
import { MESSAGE_LOG_MAX_MESSAGES, MAX_HEAT_CRASH_BOMB, ARMAMENT_STATS_GETTERS } from '../constants'
import { useLanguage } from '../contexts/LanguageContext'
import { GameMode, StageDefinition, ActiveArmamentBuffs, ArmamentLevels, CrashBombStats } from '../types'

interface GameInfoDisplayProps {
  score: number
  turnNumber: number
  comboCount: number
  messages: string[]
  playerLevel: number
  currentExp: number
  expToNextLevel: number
  currentEnergy: number
  previewEnergyCost: number
  maxEnergy: number
  gameMode: GameMode
  currentStage: StageDefinition | null
  currentWaveIndex: number
  activeBuffs: ActiveArmamentBuffs
  armamentLevels: ArmamentLevels
  isMobileView?: boolean
}

export const GameInfoDisplay: React.FC<GameInfoDisplayProps> = ({
  score,
  turnNumber,
  comboCount,
  messages,
  playerLevel,
  currentExp,
  expToNextLevel,
  currentEnergy,
  previewEnergyCost,
  maxEnergy,
  gameMode,
  currentStage,
  currentWaveIndex,
  activeBuffs,
  armamentLevels,
  isMobileView = false,
}) => {
  const { t } = useLanguage()
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

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

  const showWaveInfo = gameMode === 'stage' && currentStage && currentStage.waves.length > 0

  return (
    <div className="text-sm space-y-2">
      {/* Score, Combo, Turn, Wave (Horizontal) */}
      <div
        className={`flex flex-wrap items-center text-center gap-x-2 gap-y-1 ${
          isMobileView ? 'justify-start' : 'justify-around border-b border-gray-700 pb-2 mb-2'
        }`}
      >
        <div className="flex-shrink-0">
          <p className="text-xs text-blue-400 uppercase">{t('INFO_SCORE')}</p>
          <p className="text-lg font-bold text-white">{score}</p>
        </div>
        <div className="flex-shrink-0">
          <p className="text-xs text-yellow-400 uppercase">{t('INFO_COMBO')}</p>
          <p className="text-lg font-bold text-white">{comboCount > 1 ? `x${comboCount}` : '-'}</p>
        </div>
        <div className="flex-shrink-0">
          <p className="text-xs text-green-400 uppercase">
            {gameMode === 'stage' && currentStage ? t('INFO_STAGE_TURN') : t('INFO_TURN')}
          </p>
          <p className="text-lg font-bold text-white">
            {gameMode === 'stage' && currentStage ? `${turnNumber} / ${currentStage.totalTurns}` : turnNumber}
          </p>
        </div>
        {showWaveInfo && (
          <div className="flex-shrink-0">
            <p className="text-xs text-orange-400 uppercase">{t('INFO_WAVE')}</p>
            <p className="text-lg font-bold text-white">
              {currentWaveIndex < currentStage!.waves.length
                ? `${currentWaveIndex + 1} / ${currentStage!.waves.length}`
                : t('INFO_WAVE_COMPLETED')}
            </p>
          </div>
        )}
      </div>

      {!isMobileView && (
        <>
          {/* Energy Bar or Overheat Gauge */}
          <div className="mb-2">
            {activeBuffs.overheat.isActive ? (
              <>
                <div className="flex justify-between text-xs text-red-400 uppercase mb-0.5 items-baseline">
                  <span>{t('INFO_OVERHEAT_STATUS_GAUGE_LABEL')}</span>
                  <div className="flex items-baseline">
                    <span className="mr-1">
                      {activeBuffs.overheat.currentHeat} / {MAX_HEAT_CRASH_BOMB}
                    </span>
                    {turnsToCooldownCrashBomb !== null && turnsToCooldownCrashBomb > 0 && (
                      <span className="text-xs text-red-300">
                        ({t('INFO_OVERHEAT_COOLDOWN_TURNS', { turns: turnsToCooldownCrashBomb })})
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-300 ease-out"
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
                <div className="flex justify-between text-xs text-cyan-400 uppercase mb-0.5">
                  <span>{t('INFO_ENERGY')}</span>
                  <span>
                    {previewEnergyCost > 0 ? `${energyAfterPreview} / ${maxEnergy}` : `${currentEnergy} / ${maxEnergy}`}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 relative">
                  {previewEnergyCost > 0 && (
                    <div
                      className="absolute top-0 left-0 bg-yellow-500/70 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${currentEnergyPercentage}%` }}
                      aria-hidden="true"
                    ></div>
                  )}
                  <div
                    className="absolute top-0 left-0 bg-cyan-500 h-2 rounded-full transition-all duration-300 ease-out"
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

          {/* Drone Level & EXP */}
          <div>
            <div className="flex justify-between items-baseline text-xs text-purple-400 uppercase mb-0.5">
              <span>
                {t('INFO_SYS_LEVEL')} <span className="text-md font-bold text-white ml-1">{playerLevel}</span>
              </span>
              <span className="text-indigo-400">
                {currentExp} / {expToNextLevel}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${dataPercentage}%` }}
                role="progressbar"
                aria-valuenow={currentExp}
                aria-valuemin={0}
                aria-valuemax={expToNextLevel}
                aria-label={t('INFO_DATA')}
              ></div>
            </div>
          </div>

          <div
            ref={messagesContainerRef}
            className="h-24 bg-gray-700 p-1.5 rounded overflow-y-auto text-[0.65rem] space-y-0.5 no-scrollbar mt-2"
            aria-live="polite"
            role="log"
            aria-atomic="false"
            aria-relevant="additions text"
          >
            {messages.slice(-MESSAGE_LOG_MAX_MESSAGES).map((msg, index) => (
              <p key={index} className="text-gray-300">{`${t('INFO_LOG_PREFIX')}${msg}`}</p>
            ))}
            <div />
          </div>
        </>
      )}
    </div>
  )
}
