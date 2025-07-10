import React from 'react'
import { useDebug } from '../contexts/DebugContext'
import { LogEntry, SpawnLog, DefeatLog, InfoLog } from '../types/debug'
import { DEBUG_MODE as DEBUG_MODE_FROM_CONFIG } from '../constants'
import { useLanguage } from '../contexts/LanguageContext'

const MCTS_LOOKAHEAD_DEPTH_OPTIONS = Array.from({ length: 100 }, (_, i) => i + 1)
const MCTS_ITERATIONS_OPTIONS = [100, 500, 1000, 2000, 5000, 10000, 20000]

interface DebugPanelProps {
  currentTurn: number
  currentScore: number
  currentCombo: number
  enemyCount: number
  targetEnemyCount: number
  onRestoreEnergy: () => void
  isAutoMoveActive: boolean
  onToggleAutoMove: () => void
  isAiModeActive: boolean
  onToggleAiMode: () => void
  isMctsAiModeActive: boolean
  onToggleMctsAiMode: () => void
  mctsLookaheadDepth: number
  onSetMctsLookaheadDepth: (depth: number) => void
  mctsIterations: number
  onSetMctsIterations: (iterations: number) => void
  onRewindTurn: () => void
  canRewind: boolean
  onOpenDebugUpgradeModal?: () => void
  isUpgradeModalDisabled?: boolean
}

const renderLogDetails = (log: LogEntry) => {
  switch (log.type) {
    case 'SPAWN':
      const { payload } = log as SpawnLog
      return (
        <ul className="list-disc pl-5">
          <li>
            Attempt Result:{' '}
            <strong className={payload.didSpawn ? 'text-green-300' : 'text-red-300'}>
              {payload.didSpawn ? 'SUCCESS' : 'FAILURE'}
            </strong>
          </li>
          <li>
            Enemies Before Spawn: {payload.enemyCount} / {payload.targetEnemyCount} (Fill:{' '}
            {payload.enemyFillRatio.toFixed(2)})
          </li>
          <li>
            Safe Hexes: {payload.safeHexesCount} / {payload.totalHexesCount} (Ratio: {payload.safeTileRatio.toFixed(2)})
          </li>
          <li>Spawn Chance: {Math.round(payload.spawnChance * 100)}%</li>
          <li>Rolled: {Math.round(payload.randomNumber * 100)}%</li>
          {payload.spawnedEnemyLevel !== undefined && <li>Spawned Lv: {payload.spawnedEnemyLevel}</li>}
          {payload.debugMessage && <li>Note: {payload.debugMessage}</li>}
        </ul>
      )
    case 'DEFEAT':
      const { payload: defeatPayload } = log as DefeatLog
      return (
        <ul className="list-disc pl-5">
          <li>Defeated Enemy Lv: {defeatPayload.enemyLevel}</li>
          <li>Base Score Gained: {defeatPayload.baseScoreGained}</li>
          <li>New Combo Count: x{defeatPayload.comboCount}</li>
          <li>New Combo Base Score: {defeatPayload.currentComboBaseScore}</li>
          <li>Bonus for this Kill: +{defeatPayload.bonusScoreForThisKill.toFixed(0)}</li>
        </ul>
      )
    case 'INFO':
      const { message } = log as InfoLog
      return <p className="text-gray-300 py-1">{message}</p>
    default:
      const _exhaustiveCheck: never = log
      return null
  }
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  currentTurn,
  currentScore,
  currentCombo,
  enemyCount,
  targetEnemyCount,
  onRestoreEnergy,
  isAutoMoveActive,
  onToggleAutoMove,
  isAiModeActive,
  onToggleAiMode,
  isMctsAiModeActive,
  onToggleMctsAiMode,
  mctsLookaheadDepth,
  onSetMctsLookaheadDepth,
  mctsIterations,
  onSetMctsIterations,
  onRewindTurn,
  canRewind,
  onOpenDebugUpgradeModal,
  isUpgradeModalDisabled = false,
}) => {
  const { logs } = useDebug()
  const { t } = useLanguage()

  const IS_DEBUG_MODE =
    DEBUG_MODE_FROM_CONFIG ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true')

  if (!IS_DEBUG_MODE) {
    return null
  }
  const generalUIDisabled = isAiModeActive || isAutoMoveActive || isMctsAiModeActive
  const mctsSettingsControlsDisabled = isAiModeActive || isAutoMoveActive

  return (
    <div className="w-full flex flex-col text-green-400 font-mono text-xs no-scrollbar">
      <div className="flex-shrink-0 border-b border-green-700 pb-2 mb-2">
        <p>
          <strong>Turn:</strong> {currentTurn}
        </p>
        <p>
          <strong>Score:</strong> {currentScore}
        </p>
        <p>
          <strong>Combo:</strong> {currentCombo > 1 ? `x${currentCombo}` : '-'}
        </p>
        <p>
          <strong>Enemies:</strong> {enemyCount} (Target: {targetEnemyCount})
        </p>
      </div>

      <div className="flex-shrink-0 border-b border-green-700 pb-2 mb-2 space-y-1">
        <button
          onClick={onRestoreEnergy}
          disabled={generalUIDisabled}
          className={`w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-1 px-2 rounded text-xs transition-colors ${
            generalUIDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {t('DEBUG_RESTORE_ENERGY')}
        </button>
        <button
          onClick={onRewindTurn}
          disabled={!canRewind || generalUIDisabled}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs transition-colors ${
            !canRewind || generalUIDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {t('DEBUG_REWIND_TURN')}
        </button>
        {onOpenDebugUpgradeModal && (
          <button
            onClick={onOpenDebugUpgradeModal}
            disabled={isUpgradeModalDisabled || generalUIDisabled}
            className={`w-full font-bold py-1 px-2 rounded transition-colors text-white text-xs ${
              isUpgradeModalDisabled || generalUIDisabled
                ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
            aria-label={t('CONTROLS_UPGRADE_SYSTEM_DEBUG')}
          >
            {t('CONTROLS_UPGRADE_SYSTEM_DEBUG')}
          </button>
        )}
        <button
          onClick={onToggleAutoMove}
          disabled={generalUIDisabled && !isAutoMoveActive}
          className={`w-full font-bold py-1 px-2 rounded text-xs transition-colors ${
            isAutoMoveActive
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : generalUIDisabled
              ? 'bg-gray-600 opacity-50 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-black'
          }`}
        >
          {isAutoMoveActive ? t('DEBUG_AUTO_MOVE_TOGGLE_ON') : t('DEBUG_AUTO_MOVE_TOGGLE_OFF')}
        </button>
        <button
          onClick={onToggleAiMode}
          disabled={generalUIDisabled && !isAiModeActive}
          className={`w-full font-bold py-1 px-2 rounded text-xs transition-colors ${
            isAiModeActive
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : generalUIDisabled
              ? 'bg-gray-600 opacity-50 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700 text-black'
          }`}
        >
          {isAiModeActive ? t('DEBUG_AI_MODE_TOGGLE_ON') : t('DEBUG_AI_MODE_TOGGLE_OFF')}
        </button>

        <div className="space-y-1">
          <button
            onClick={onToggleMctsAiMode}
            disabled={generalUIDisabled && !isMctsAiModeActive}
            className={`w-full font-bold py-1 px-2 rounded text-xs transition-colors ${
              isMctsAiModeActive
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : generalUIDisabled
                ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-700 text-black'
            }`}
          >
            {isMctsAiModeActive ? t('DEBUG_MCTS_AI_MODE_TOGGLE_ON') : t('DEBUG_MCTS_AI_MODE_TOGGLE_OFF')}
          </button>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 flex-grow">
              <label
                htmlFor="mctsLookaheadDepthSelect"
                className="text-xs text-gray-300 flex-shrink-0"
                title={t('DEBUG_MCTS_LOOKAHEAD_DEPTH_LABEL_TITLE')}
              >
                {t('DEBUG_MCTS_LOOKAHEAD_DEPTH_LABEL')}
              </label>
              <select
                id="mctsLookaheadDepthSelect"
                value={mctsLookaheadDepth}
                onChange={(e) => onSetMctsLookaheadDepth(Number(e.target.value))}
                disabled={mctsSettingsControlsDisabled}
                title={t('DEBUG_MCTS_LOOKAHEAD_DEPTH_TOOLTIP')}
                className="bg-gray-700 border border-gray-600 text-white py-1 px-1 rounded text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50 w-full"
              >
                {MCTS_LOOKAHEAD_DEPTH_OPTIONS.map((depth) => (
                  <option key={depth} value={depth}>
                    {depth}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-1 flex-grow">
              <label
                htmlFor="mctsIterationsInput"
                className="text-xs text-gray-300 flex-shrink-0"
                title={t('DEBUG_MCTS_ITERATIONS_LABEL_TITLE')}
              >
                {t('DEBUG_MCTS_ITERATIONS_LABEL')}
              </label>
              <input
                type="number"
                id="mctsIterationsInput"
                list="mctsIterationsOptions"
                value={mctsIterations}
                onChange={(e) => onSetMctsIterations(Math.max(10, parseInt(e.target.value, 10) || 1000))}
                disabled={mctsSettingsControlsDisabled}
                title={t('DEBUG_MCTS_ITERATIONS_TOOLTIP')}
                className="bg-gray-700 border border-gray-600 text-white py-1 px-1 rounded text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50 w-full"
                min="10"
                step="10"
              />
              <datalist id="mctsIterationsOptions">
                {MCTS_ITERATIONS_OPTIONS.map((iter) => (
                  <option key={iter} value={iter}></option>
                ))}
              </datalist>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-1 max-h-[calc(100vh-350px)]">
        {' '}
        {/* Adjust max-h as needed */}
        {logs.map((log) => (
          <div key={log.id} className="border-b border-gray-700 last:border-b-0 py-1">
            <details className="group">
              <summary className="cursor-pointer list-none group-open:mb-1">
                <span className="font-bold">[{log.type}]</span>
                <span className="text-gray-500 ml-2">{log.timestamp}</span>
                {log.type === 'SPAWN' &&
                  ((log as SpawnLog).payload.didSpawn ? (
                    <span className="text-green-300 ml-1">- Success</span>
                  ) : (
                    <span className="text-red-300 ml-1">- Failure</span>
                  ))}
              </summary>
              <div className="pl-3 text-gray-200 bg-black bg-opacity-30 rounded p-1">{renderLogDetails(log)}</div>
            </details>
          </div>
        ))}
        {logs.length === 0 && <p className="text-gray-500 italic">No debug logs yet.</p>}
      </div>
    </div>
  )
}
