import React, { useState, useEffect, useMemo } from 'react'
import { GameStatistics, GameMode, ArmamentName } from '../types'
import { useLanguage } from '../contexts/LanguageContext'
import { ARMAMENT_ICONS, ARMAMENT_STATS_GETTERS } from '../constants'

interface ResultScreenProps {
  stats: GameStatistics
  finalScore: number
  finalTurn: number
  finalLevel: number
  gameMode: GameMode
  stageNameKey: string | null
  mapRadius: number
  onPlayAgain: () => void
  onClose: () => void
}

const CountUp: React.FC<{ end: number; duration?: number; isInt?: boolean }> = ({
  end,
  duration = 1500,
  isInt = true,
}) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    let animationFrameId: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const currentVal = end * progress
      setCount(isInt ? Math.floor(currentVal) : currentVal)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        setCount(end) // Ensure it ends on the exact number
      }
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrameId)
  }, [end, duration, isInt])

  return <span>{count.toLocaleString()}</span>
}

const StatItem: React.FC<{ labelKey: string; value?: number; children?: React.ReactNode }> = ({
  labelKey,
  value,
  children,
}) => {
  const { t } = useLanguage()
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-gray-400">{t(labelKey)}</span>
      {children || <span className="font-bold">{value !== undefined ? value.toLocaleString() : '-'}</span>}
    </div>
  )
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  stats,
  finalScore,
  finalTurn,
  finalLevel,
  gameMode,
  stageNameKey,
  mapRadius,
  onPlayAgain,
  onClose,
}) => {
  const { t } = useLanguage()
  const {
    enemiesDefeatedByType,
    maxCombo,
    armamentsUsedCount,
    dataChipsCollected,
    spareBatteriesCollected,
    spareBatteriesUsed,
  } = stats

  const totalEnemiesDefeated = useMemo(
    () => Object.values(enemiesDefeatedByType).reduce((sum, count) => sum + count, 0),
    [enemiesDefeatedByType]
  )

  const modeName = useMemo(() => {
    if (gameMode === 'stage' && stageNameKey) return t('RESULT_STAGE_MODE_NAME', { stageName: t(stageNameKey) })
    if (gameMode === 'endless') return t('RESULT_ENDLESS_MODE_NAME', { radius: mapRadius })
    return gameMode
  }, [gameMode, stageNameKey, mapRadius, t])

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[5000] p-4"
      aria-labelledby="result-screen-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-gray-800 border-2 border-yellow-500/50 rounded-xl shadow-2xl w-full max-w-4xl text-white p-4 md:p-6 lg:p-8 animate-fade-in flex flex-col max-h-[90vh]">
        <div className="flex-shrink-0">
          <h2 id="result-screen-title" className="text-3xl md:text-4xl font-bold text-yellow-400 mb-6 text-center">
            {t('RESULT_SCREEN_TITLE')}
          </h2>
        </div>
        <div className="flex-grow overflow-y-auto pr-2 no-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Main Stats */}
            <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-sky-300 border-b border-sky-300/20 pb-2">
                {t('RESULT_OVERVIEW_TITLE')}
              </h3>
              <StatItem labelKey="RESULT_FINAL_SCORE">
                <span className="font-bold text-2xl text-yellow-300">
                  <CountUp end={finalScore} />
                </span>
              </StatItem>
              <StatItem labelKey="RESULT_TURNS_SURVIVED" value={finalTurn} />
              <StatItem labelKey="RESULT_FINAL_DRONE_LEVEL" value={finalLevel} />
              <div className="flex justify-between items-baseline">
                <span className="text-gray-400">{t('RESULT_PLAY_MODE')}</span>
                <span className="font-bold text-right">{modeName}</span>
              </div>
              <h3 className="text-lg font-semibold text-sky-300 border-b border-sky-300/20 pb-2 pt-4">
                {t('RESULT_RESOURCE_RECORD')}
              </h3>
              <StatItem labelKey="RESULT_DATA_CHIPS_COLLECTED" value={dataChipsCollected} />
              <StatItem labelKey="RESULT_BATTERIES_COLLECTED" value={spareBatteriesCollected} />
              <StatItem labelKey="RESULT_BATTERIES_USED" value={spareBatteriesUsed} />
            </div>

            {/* Right Column: Details */}
            <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-sky-300 border-b border-sky-300/20 pb-2">
                {t('RESULT_COMBAT_RECORD')}
              </h3>
              <StatItem labelKey="RESULT_TOTAL_ENEMIES_DEFEATED" value={totalEnemiesDefeated} />
              <div className="text-sm">
                <p className="text-gray-400">{t('RESULT_DEFEATED_BREAKDOWN')}:</p>
                <div className="pl-4 text-gray-300">
                  {Object.keys(enemiesDefeatedByType).length > 0 ? (
                    Object.entries(enemiesDefeatedByType)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([level, count]) => (
                        <div key={level} className="flex justify-between">
                          <span>Lv.{level}:</span>
                          <span>{count}</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-gray-500 italic">None</div>
                  )}
                </div>
              </div>
              <StatItem labelKey="RESULT_MAX_COMBO" value={maxCombo} />

              <h3 className="text-lg font-semibold text-sky-300 border-b border-sky-300/20 pb-2 pt-4">
                {t('RESULT_ARMAMENT_USAGE_TITLE')}
              </h3>
              <div className="text-sm space-y-1">
                {armamentsUsedCount && Object.keys(armamentsUsedCount).length > 0 ? (
                  Object.entries(armamentsUsedCount)
                    .sort(([, countA = 0], [, countB = 0]) => countB - countA)
                    .map(([id, count]) => (
                      <div key={id} className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <span className="text-lg w-6 text-center">{ARMAMENT_ICONS[id as ArmamentName]}</span>
                          {t(ARMAMENT_STATS_GETTERS[id as ArmamentName](1).titleKey)}
                        </span>
                        <span className="font-mono">{count}</span>
                      </div>
                    ))
                ) : (
                  <div className="text-gray-500 italic">{t('RESULT_NO_ARMAMENTS_USED')}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex-shrink-0 pt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onPlayAgain}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform hover:scale-105"
          >
            {t('RESULT_BUTTON_PLAY_AGAIN')}
          </button>
          <button
            onClick={onClose}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform hover:scale-105"
          >
            {t('RESULT_BUTTON_CLOSE')}
          </button>
        </div>
      </div>
      <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .animate-fade-in {
                animation: fade-in 0.5s ease-out forwards;
            }
        `}</style>
    </div>
  )
}
