import React, { useState } from 'react'
import { StageDefinition, GameMode } from '../types'
import { MAP_RADIUS_OPTIONS, DEFAULT_MAP_RADIUS } from '../constants'
import { useLanguage } from '../contexts/LanguageContext'

interface ModeSelectionScreenProps {
  availableStages: StageDefinition[]
  unlockedStageIds: string[]
  onStartGame: (mode: GameMode, options: { radius?: number; stageId?: string }) => void
}

export const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({
  availableStages,
  unlockedStageIds,
  onStartGame,
}) => {
  const { t } = useLanguage()
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null)
  const [selectedRadius, setSelectedRadius] = useState<number>(DEFAULT_MAP_RADIUS)

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode)
  }

  const handleStartEndless = () => {
    onStartGame('endless', { radius: selectedRadius })
  }

  const getStageName = (stage: StageDefinition) => {
    const name = t(stage.nameKey)
    return name === stage.nameKey ? stage.id : name // Fallback to ID if translation missing
  }

  const getStageDescription = (stage: StageDefinition) => {
    if (!stage.descriptionKey) return ''
    const description = t(stage.descriptionKey)
    return description === stage.descriptionKey ? '' : description
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-8">{t('APP_TITLE')}</h1>

      {!selectedMode && (
        <div className="space-y-4 w-full max-w-md">
          <button
            onClick={() => handleModeSelect('stage')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
          >
            {t('MODE_SELECTION_STAGE_MODE')}
          </button>
          <button
            onClick={() => handleModeSelect('endless')}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
          >
            {t('MODE_SELECTION_ENDLESS_MODE')}
          </button>
        </div>
      )}

      {selectedMode === 'endless' && (
        <div className="space-y-6 w-full max-w-md bg-gray-700 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-green-300 mb-4 text-center">{t('MODE_SELECTION_ENDLESS_MODE')}</h2>
          <div className="flex items-center space-x-3">
            <label htmlFor="mapRadiusSelect" className="text-md text-gray-300 whitespace-nowrap">
              {t('CONTROLS_SECTOR_RADIUS')}
            </label>
            <select
              id="mapRadiusSelect"
              value={selectedRadius}
              onChange={(e) => setSelectedRadius(Number(e.target.value))}
              className="block w-full bg-gray-600 border border-gray-500 text-white py-2 px-3 rounded leading-tight focus:outline-none focus:bg-gray-500 focus:border-gray-400"
            >
              {MAP_RADIUS_OPTIONS.map((radius) => (
                <option key={radius} value={radius}>
                  {radius}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleStartEndless}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
          >
            {t('MODE_SELECTION_START_ENDLESS')}
          </button>
          <button
            onClick={() => setSelectedMode(null)}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors mt-2"
          >
            {t('MODE_SELECTION_BACK')}
          </button>
        </div>
      )}

      {selectedMode === 'stage' && (
        <div className="space-y-6 w-full max-w-lg bg-gray-700 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-blue-300 mb-1 text-center">{t('MODE_SELECTION_STAGE_MODE')}</h2>
          <p className="text-sm text-gray-400 text-center mb-4">{t('MODE_SELECTION_CHOOSE_STAGE')}</p>
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2 no-scrollbar">
            {availableStages
              .filter((stage) => unlockedStageIds.includes(stage.id))
              .map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => onStartGame('stage', { stageId: stage.id })}
                  className={`w-full text-left p-3 rounded-md transition-colors bg-gray-600 hover:bg-blue-500 text-gray-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400`}
                >
                  <h3 className="font-semibold">{getStageName(stage)}</h3>
                  <p className="text-xs opacity-80">{getStageDescription(stage)}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {t('MODE_SELECTION_STAGE_INFO', {
                      turns: stage.totalTurns,
                      radius: stage.mapRadius,
                      waves: stage.waves.length,
                    })}
                  </p>
                </button>
              ))}
            {availableStages.filter((stage) => unlockedStageIds.includes(stage.id)).length === 0 && (
              <p className="text-gray-400 text-center py-4">{t('MODE_SELECTION_NO_STAGES_AVAILABLE')}</p>
            )}
          </div>
          <button
            onClick={() => setSelectedMode(null)}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors mt-4"
          >
            {t('MODE_SELECTION_BACK')}
          </button>
        </div>
      )}
    </div>
  )
}
