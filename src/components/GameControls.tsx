import React, { useState, useEffect } from 'react'
import { MAP_RADIUS_OPTIONS, DEFAULT_MAP_RADIUS } from '../constants'
import { GameMode, StageDefinition, GamePhase } from '../types' // Language type removed
import { useLanguage } from '../contexts/LanguageContext'

const ENDLESS_MODE_VALUE = 'endless'

interface GameControlsProps {
  onStartGame: (mode: GameMode, options: { radius?: number; stageId?: string }) => void
  availableStages: StageDefinition[]
  initialDefaultRadius: number
  currentActualGameMode: GameMode
  currentActualMapRadius: number
  currentActualStageId: string | null
  isDangerMapVisible: boolean
  toggleDangerMap: () => void
  isObserverCountMapVisible: boolean
  toggleObserverCountMap: () => void
  gamePhase: GamePhase
  disabled?: boolean
}

export const GameControls: React.FC<GameControlsProps> = ({
  onStartGame,
  availableStages,
  initialDefaultRadius,
  currentActualGameMode,
  currentActualMapRadius,
  currentActualStageId,
  isDangerMapVisible,
  toggleDangerMap,
  isObserverCountMapVisible,
  toggleObserverCountMap,
  gamePhase,
  disabled = false,
}) => {
  const { t } = useLanguage()

  const [selectedConfigModeOrStageId, setSelectedConfigModeOrStageId] = useState<string>(ENDLESS_MODE_VALUE)
  const [selectedConfigRadius, setSelectedConfigRadius] = useState<number>(initialDefaultRadius)
  const [isRadiusConfigDisabled, setIsRadiusConfigDisabled] = useState<boolean>(false)

  useEffect(() => {
    if (
      currentActualGameMode === 'stage' &&
      currentActualStageId &&
      availableStages.some((s) => s.id === currentActualStageId)
    ) {
      setSelectedConfigModeOrStageId(currentActualStageId)
      const stage = availableStages.find((s) => s.id === currentActualStageId)
      if (stage) {
        setSelectedConfigRadius(stage.mapRadius)
        setIsRadiusConfigDisabled(true)
      }
    } else {
      setSelectedConfigModeOrStageId(ENDLESS_MODE_VALUE)
      setSelectedConfigRadius(currentActualMapRadius > 0 ? currentActualMapRadius : initialDefaultRadius)
      setIsRadiusConfigDisabled(false)
    }
  }, [currentActualGameMode, currentActualMapRadius, currentActualStageId, availableStages, initialDefaultRadius])

  const handleModeOrStageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setSelectedConfigModeOrStageId(value)

    if (value === ENDLESS_MODE_VALUE) {
      setIsRadiusConfigDisabled(false)
    } else {
      const stage = availableStages.find((s) => s.id === value)
      if (stage) {
        setSelectedConfigRadius(stage.mapRadius)
        setIsRadiusConfigDisabled(true)
      }
    }
  }

  const handleRadiusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isRadiusConfigDisabled) {
      setSelectedConfigRadius(Number(event.target.value))
    }
  }

  const handleStartGameClick = () => {
    if (selectedConfigModeOrStageId === ENDLESS_MODE_VALUE) {
      onStartGame('endless', { radius: selectedConfigRadius })
    } else {
      onStartGame('stage', { stageId: selectedConfigModeOrStageId })
    }
  }

  const canDisplayGameSpecificControls =
    gamePhase !== 'PreGameSelection' && gamePhase !== 'GameOver' && gamePhase !== 'StageComplete'

  return (
    <div className="space-y-3">
      {/* Game Configuration */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center space-x-2">
          <label htmlFor="stageSelect" className="text-sm font-medium text-gray-300 flex-shrink-0">
            {t('CONTROLS_SELECT_MODE_STAGE_LABEL')}
          </label>
          <select
            id="stageSelect"
            value={selectedConfigModeOrStageId}
            onChange={handleModeOrStageChange}
            disabled={disabled}
            className="block w-full bg-gray-700 border border-gray-600 text-white py-1.5 px-2 rounded text-sm leading-tight focus:outline-none focus:bg-gray-600 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value={ENDLESS_MODE_VALUE}>{t('MODE_ENDLESS_DROPDOWN_LABEL')}</option>
            {availableStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {t(stage.nameKey)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="mapRadiusSelectConfig" className="text-sm font-medium text-gray-300 flex-shrink-0">
            {t('CONTROLS_SECTOR_RADIUS')}
          </label>
          <select
            id="mapRadiusSelectConfig"
            value={selectedConfigRadius}
            onChange={handleRadiusChange}
            disabled={isRadiusConfigDisabled || disabled}
            className="block w-full bg-gray-700 border border-gray-600 text-white py-1.5 px-2 rounded text-sm leading-tight focus:outline-none focus:bg-gray-600 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {MAP_RADIUS_OPTIONS.map((radius) => (
              <option key={radius} value={radius}>
                {radius}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleStartGameClick}
          disabled={disabled}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('CONTROLS_START_GAME_NEW')}
        </button>
      </div>

      {canDisplayGameSpecificControls && gamePhase !== 'UpgradeSelection' && (
        <div className="pt-2 border-t border-gray-700 space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={toggleDangerMap}
              disabled={disabled}
              className={`w-full px-3 py-1.5 rounded font-semibold text-xs transition-colors ${
                isDangerMapVisible
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={t(isDangerMapVisible ? 'CONTROLS_THREAT_TOOLTIP_ACTIVE' : 'CONTROLS_THREAT_TOOLTIP_INACTIVE')}
            >
              {isDangerMapVisible ? t('CONTROLS_THREAT_BUTTON_ON') : t('CONTROLS_THREAT_BUTTON_OFF')}
            </button>
            <button
              onClick={toggleObserverCountMap}
              disabled={disabled}
              className={`w-full px-3 py-1.5 rounded font-semibold text-xs transition-colors ${
                isObserverCountMapVisible
                  ? 'bg-purple-500 hover:bg-purple-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={t(
                isObserverCountMapVisible
                  ? 'CONTROLS_OBSERVER_COUNT_TOOLTIP_ACTIVE'
                  : 'CONTROLS_OBSERVER_COUNT_TOOLTIP_INACTIVE'
              )}
            >
              {isObserverCountMapVisible
                ? t('CONTROLS_OBSERVER_COUNT_BUTTON_ON')
                : t('CONTROLS_OBSERVER_COUNT_BUTTON_OFF')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
