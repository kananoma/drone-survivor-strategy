import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { GameInfoDisplay } from './src/components/GameInfoDisplay'
import { GameControls } from './src/components/GameControls'
import { ArmamentPanel } from './src/components/ArmamentPanel'
import { ArmamentDetailDisplay } from './src/components/ArmamentDetailDisplay'
import { UpgradeModal } from './src/components/UpgradeModal'
import { HexGrid } from './src/components/HexGrid'
import { DebugPanel } from './src/components/DebugPanel'
import { CollapsiblePanel } from './src/components/CollapsiblePanel'
import { MobileControlsDrawer } from './src/components/MobileControlsDrawer'
import { MobileResourceBar } from './src/components/MobileResourceBar'
import { ResultScreen } from './src/components/ResultScreen'
import { DebugProvider } from './src/contexts/DebugContext'
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext'
import { Hex, GamePhase, GameMode, ArmamentName, CrashBombStats } from './src/types'
import { getHexesInRange } from './src/utils/hexUtils'
import { useGameLogic } from './src/hooks/gameLogic/useGameLogic'
import { useAIDebugManager } from './src/hooks/useAIDebugManager'
import { DEBUG_MODE, DEFAULT_MAP_RADIUS, MESSAGE_LOG_MAX_MESSAGES, ARMAMENT_STATS_GETTERS } from './src/constants'

const FLOATING_TEXT_DURATION = 1500

const AppContent: React.FC = () => {
  const { language, t } = useLanguage()

  const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null)
  const [hoveredCollectorDroneId, setHoveredCollectorDroneId] = useState<string | null>(null)
  const [isFloatingLevelUpTextVisible, setIsFloatingLevelUpTextVisible] = useState<boolean>(false)
  const [isGameOverOverlayVisible, setIsGameOverOverlayVisible] = useState<boolean>(false)
  const [isStageCompleteOverlayVisible, setIsStageCompleteOverlayVisible] = useState<boolean>(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false) // For mobile drawer menu

  const [lastGameConfig, setLastGameConfig] = useState<{
    mode: GameMode
    options: { radius?: number; stageId?: string }
  }>({ mode: 'endless', options: { radius: DEFAULT_MAP_RADIUS } })

  const aiDebugControls = useAIDebugManager()

  const handleShowFloatingLevelUpText = useCallback(() => {
    setIsFloatingLevelUpTextVisible(true)
  }, [])

  const gameLogic = useGameLogic({
    initialLanguage: language,
    t,
    onLevelUpBannerShow: handleShowFloatingLevelUpText,
    aiStates: aiDebugControls,
  })

  const {
    gameMode,
    currentStage,
    currentWaveIndex,
    escapePortalPosition,
    pendingSpawnLocations,
    gamePhase,
    hexes,
    player,
    enemies,
    score,
    turnNumber,
    messages,
    playerLevel,
    currentExp,
    expToNextLevel,
    upgradePoints,
    armamentLevels,
    activeBuffs,
    currentEnergy,
    maxEnergy,
    dataChips,
    spareBatteriesOnMap,
    placedEmpTraps,
    placedBarricades,
    placedChargeFields,
    placedCollectorDrones,
    spareBatteriesCount,
    playerActionsRemaining,
    comboCount,
    gameStats,
    isUpgradeSelection,
    upgradeOptions,
    effectiveLevelForUpgradeContext,
    initializeGame,
    handlePlayerMove,
    handleSelectArmament,
    selectedArmament,
    handlePlaceEmpTrap,
    handlePlaceBarricade,
    handlePlaceChargeField,
    handlePlaceCollectorDrone,
    handleUseSpareBattery,
    handleOpenUpgradeModal,
    handleOpenDebugUpgradeModal,
    handleSelectUpgradeOption,
    returnToMenu,
    movableHexIds,
    empTrapPlacementTargetHexIds,
    barricadePlacementTargetHexIds,
    chargeFieldPlacementTargetHexIds,
    collectorDronePlacementTargetHexIds,
    targetEnemyCount,
    availableStages,
    mapRadius,
    cancelUpgradeSelection,
    cancelArmamentSelection,
    activateInstantArmament,
    canRewind,
    handleRewindToPreviousTurnDebug,
    handleRestoreEnergyDebug,
    isDangerMapVisible,
    toggleDangerMap,
    isObserverCountMapVisible,
    toggleObserverCountMap,
    showShockwaveEffectAt,
    showJammerEffectAt,
    showChargeFieldPlacementEffectAt,
    showChargeFieldRecoveryEffectAt,
    showCollectorDronePlacementEffectAt,
    showCrashBombEffect,
  } = gameLogic

  useEffect(() => {
    document.title = t('APP_TITLE')
  }, [t, language])

  useEffect(() => {
    if (isFloatingLevelUpTextVisible) {
      const timer = setTimeout(() => {
        setIsFloatingLevelUpTextVisible(false)
      }, FLOATING_TEXT_DURATION)
      return () => clearTimeout(timer)
    }
  }, [isFloatingLevelUpTextVisible])

  const isGameOver = gamePhase === 'GameOver'
  const isStageComplete = gamePhase === 'StageComplete'

  useEffect(() => {
    if (isGameOver) setIsGameOverOverlayVisible(true)
    else setIsGameOverOverlayVisible(false)
  }, [isGameOver])

  useEffect(() => {
    if (isStageComplete) setIsStageCompleteOverlayVisible(true)
    else setIsStageCompleteOverlayVisible(false)
  }, [isStageComplete])

  const handleGridAndHexClick = useCallback(
    (hexClicked?: Hex) => {
      if (aiDebugControls.isAiModeActive || aiDebugControls.isAutoMoveActive || aiDebugControls.isMctsAiModeActive)
        return

      if (selectedArmament) {
        const instantUseArmaments: ArmamentName[] = ['booster', 'stealth', 'shockwave', 'jammer', 'crash_bomb']
        if (instantUseArmaments.includes(selectedArmament)) {
          activateInstantArmament(selectedArmament)
          return
        }
      }

      if (hexClicked) {
        if (gamePhase === 'PlayerTurn' || gamePhase === 'Playing') {
          if (!selectedArmament) handlePlayerMove(hexClicked)
        } else if (gamePhase === 'PlacingEmpTrap') handlePlaceEmpTrap(hexClicked)
        else if (gamePhase === 'PlacingBarricade') handlePlaceBarricade(hexClicked)
        else if (gamePhase === 'PlacingChargeField') handlePlaceChargeField(hexClicked)
        else if (gamePhase === 'PlacingCollectorDrone') handlePlaceCollectorDrone(hexClicked)
      } else if (selectedArmament) {
        cancelArmamentSelection()
      }
    },
    [
      selectedArmament,
      gamePhase,
      aiDebugControls,
      activateInstantArmament,
      handlePlayerMove,
      handlePlaceEmpTrap,
      handlePlaceBarricade,
      handlePlaceChargeField,
      handlePlaceCollectorDrone,
      cancelArmamentSelection,
    ]
  )

  const handleHexHover = useCallback(
    (hexHovered: Hex | null) => {
      if (hexHovered) {
        const enemyOnHex = enemies.find((e) => e.q === hexHovered.q && e.r === hexHovered.r)
        setHoveredEnemyId(enemyOnHex ? enemyOnHex.id : null)
        const collectorDroneOnHex = placedCollectorDrones.find((cd) => cd.q === hexHovered.q && cd.r === hexHovered.r)
        setHoveredCollectorDroneId(collectorDroneOnHex ? collectorDroneOnHex.id : null)
      } else {
        setHoveredEnemyId(null)
        setHoveredCollectorDroneId(null)
      }
    },
    [enemies, placedCollectorDrones]
  )

  const handleStartGameWithSettings = useCallback(
    (mode: GameMode, options: { radius?: number; stageId?: string }) => {
      setLastGameConfig({ mode, options })
      setIsGameOverOverlayVisible(false)
      setIsDrawerOpen(false)
      initializeGame(mode, options)
    },
    [initializeGame]
  )

  const handlePlayAgain = useCallback(() => {
    setIsGameOverOverlayVisible(false)
    initializeGame(lastGameConfig.mode, lastGameConfig.options)
  }, [initializeGame, lastGameConfig])

  const handleExitToMenu = useCallback(() => {
    setIsGameOverOverlayVisible(false)
    returnToMenu()
  }, [returnToMenu])

  const handleCloseResultScreen = useCallback(() => {
    setIsGameOverOverlayVisible(false)
  }, [])

  const sightRangeHexIds = useMemo(() => {
    if (isDangerMapVisible || isObserverCountMapVisible || !hoveredEnemyId) return []
    const enemy = enemies.find((e) => e.id === hoveredEnemyId)
    if (!enemy) return []
    return getHexesInRange(enemy, enemy.sightRange, hexes).map((h) => h.id)
  }, [isDangerMapVisible, isObserverCountMapVisible, hoveredEnemyId, enemies, hexes])

  const collectorSightRangeHexIds = useMemo(() => {
    if (isDangerMapVisible || isObserverCountMapVisible || !hoveredCollectorDroneId) return new Set<string>()
    const drone = placedCollectorDrones.find((cd) => cd.id === hoveredCollectorDroneId)
    if (!drone) return new Set<string>()
    return new Set(getHexesInRange(drone, drone.searchRadius, hexes).map((h) => h.id))
  }, [isDangerMapVisible, isObserverCountMapVisible, hoveredCollectorDroneId, placedCollectorDrones, hexes])

  const activeChargeFieldHexIds = useMemo(() => {
    const activeZone = new Set<string>()
    if (placedChargeFields && hexes) {
      placedChargeFields.forEach((field) => {
        const fieldHexes = getHexesInRange(field, field.effectRadius, hexes)
        fieldHexes.forEach((h) => activeZone.add(h.id))
      })
    }
    return activeZone
  }, [placedChargeFields, hexes])

  const isArmamentSelected = useMemo(
    () => !!selectedArmament || gamePhase.startsWith('Placing'),
    [selectedArmament, gamePhase]
  )

  const previewEnergyCost = useMemo(() => {
    let armamentForPreview: ArmamentName | null = selectedArmament

    // If we are in a placing phase but `selectedArmament` is somehow null (e.g. after a re-render),
    // determine it from the game phase to ensure the preview bar remains visible.
    if (!armamentForPreview) {
      if (gamePhase === 'PlacingEmpTrap') armamentForPreview = 'trap'
      else if (gamePhase === 'PlacingBarricade') armamentForPreview = 'barricade'
      else if (gamePhase === 'PlacingChargeField') armamentForPreview = 'charge_field'
      else if (gamePhase === 'PlacingCollectorDrone') armamentForPreview = 'collector_drone'
    }

    if (armamentForPreview) {
      const armamentId = armamentForPreview
      const stats = ARMAMENT_STATS_GETTERS[armamentId](armamentLevels[armamentId])

      if (stats && stats.energyCost !== Infinity && currentEnergy >= stats.energyCost) {
        if (armamentId === 'crash_bomb') {
          // Crash bomb uses all current energy, but its base cost must be met.
          return currentEnergy
        }
        return stats.energyCost
      }
    }
    return 0 // No preview cost
  }, [selectedArmament, gamePhase, armamentLevels, currentEnergy])

  const canShowUpgradeButton = upgradePoints > 0 && (gamePhase === 'PlayerTurn' || gamePhase === 'Playing')
  const showMainGamePanels = gamePhase !== 'PreGameSelection' && player
  const disableUI =
    aiDebugControls.isAiModeActive || aiDebugControls.isAutoMoveActive || aiDebugControls.isMctsAiModeActive

  const handleStageCompleteClick = () => {
    if (isStageComplete && isStageCompleteOverlayVisible) setIsStageCompleteOverlayVisible(false)
  }

  const gameInfoProps = {
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
  }

  const armamentDetailProps = { selectedArmament, gamePhase, armamentLevels }

  const armamentPanelProps = {
    onOpenUpgradeModal: disableUI ? undefined : handleOpenUpgradeModal,
    canShowUpgradeButton,
    upgradePoints,
    armamentLevels,
    activeBuffs,
    onSelectArmament: handleSelectArmament,
    selectedArmament,
    gamePhase,
    playerActionsRemaining,
    placedEmpTrapsCount: placedEmpTraps.length,
    placedBarricadesCount: placedBarricades.length,
    placedChargeFieldsCount: placedChargeFields.length,
    placedCollectorDronesCount: placedCollectorDrones.length,
    currentEnergy,
    spareBatteriesCount,
    onUseSpareBattery: handleUseSpareBattery,
    disabled: disableUI,
    isPanelDisabled: isGameOver || isStageComplete,
    isArmamentSelected,
  }

  const gameControlsProps = {
    onStartGame: handleStartGameWithSettings,
    availableStages,
    initialDefaultRadius: DEFAULT_MAP_RADIUS,
    currentActualGameMode: gameMode,
    currentActualMapRadius: mapRadius,
    currentActualStageId: currentStage?.id || null,
    isDangerMapVisible,
    toggleDangerMap,
    isObserverCountMapVisible,
    toggleObserverCountMap,
    gamePhase,
    disabled: disableUI || isArmamentSelected,
  }

  const debugPanelProps = {
    currentTurn: turnNumber,
    currentScore: score,
    currentCombo: comboCount,
    enemyCount: enemies.length,
    targetEnemyCount,
    onRestoreEnergy: handleRestoreEnergyDebug,
    isAutoMoveActive: aiDebugControls.isAutoMoveActive,
    onToggleAutoMove: aiDebugControls.toggleAutoMove,
    isAiModeActive: aiDebugControls.isAiModeActive,
    onToggleAiMode: aiDebugControls.toggleAiMode,
    isMctsAiModeActive: aiDebugControls.isMctsAiModeActive,
    onToggleMctsAiMode: aiDebugControls.toggleMctsAiMode,
    mctsLookaheadDepth: aiDebugControls.mctsLookaheadDepth,
    onSetMctsLookaheadDepth: aiDebugControls.setMctsLookaheadDepth,
    mctsIterations: aiDebugControls.mctsIterations,
    onSetMctsIterations: aiDebugControls.setMctsIterations,
    onRewindTurn: handleRewindToPreviousTurnDebug,
    canRewind: canRewind || isGameOver,
    isUpgradeModalDisabled: disableUI,
    onOpenDebugUpgradeModal: disableUI ? undefined : handleOpenDebugUpgradeModal,
  }

  const resourceBarProps = {
    currentEnergy,
    previewEnergyCost,
    maxEnergy,
    activeBuffs,
    playerLevel,
    currentExp,
    expToNextLevel,
    armamentLevels,
  }

  return (
    <>
      <div className="w-screen h-screen flex flex-col md:flex-row bg-gray-900 text-gray-100 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex flex-col gap-4 w-80 lg:w-96 flex-shrink-0 p-4 overflow-y-auto no-scrollbar">
          <CollapsiblePanel titleKey="GAME_CONTROLS_PANEL_TITLE">
            <GameControls {...gameControlsProps} />
          </CollapsiblePanel>
          {showMainGamePanels && (
            <>
              <CollapsiblePanel titleKey="GAME_INFO_PANEL_TITLE">
                <GameInfoDisplay {...gameInfoProps} isMobileView={false} />
              </CollapsiblePanel>
              <CollapsiblePanel titleKey="ARMAMENT_PANEL_TITLE">
                <ArmamentDetailDisplay {...armamentDetailProps} />
                <div className="mt-2">
                  <ArmamentPanel {...armamentPanelProps} />
                </div>
              </CollapsiblePanel>
            </>
          )}
          {DEBUG_MODE && (
            <CollapsiblePanel titleKey="DEBUG_PANEL_TITLE">
              <DebugPanel {...debugPanelProps} />
            </CollapsiblePanel>
          )}
        </div>

        {/* Main Content Area (Grid + Mobile UI) */}
        <div className="flex-grow flex flex-col order-1 md:order-2 min-h-0 relative">
          {/* Mobile Header */}
          {showMainGamePanels && (
            <div className="md:hidden flex-shrink-0 bg-gray-800/80 backdrop-blur-sm shadow-lg p-2 flex items-center justify-between z-10">
              <div className="flex-grow">
                <GameInfoDisplay {...gameInfoProps} isMobileView={true} />
              </div>
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="ml-2 p-2 rounded-md bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}

          {/* Game Grid Area */}
          <div className="flex-grow min-h-0 relative">
            {gamePhase === 'PreGameSelection' ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
                <div className="w-full max-w-lg mx-auto p-4">
                  <GameControls {...gameControlsProps} />
                </div>
              </div>
            ) : player && hexes.size > 0 ? (
              <HexGrid
                hexes={hexes}
                player={player}
                enemies={enemies}
                dataChips={dataChips}
                spareBatteriesOnMap={spareBatteriesOnMap}
                placedEmpTraps={placedEmpTraps}
                placedBarricades={placedBarricades}
                placedChargeFields={placedChargeFields}
                placedCollectorDrones={placedCollectorDrones}
                onHexClick={(hex) => handleGridAndHexClick(hex)}
                onGridAreaClick={() => handleGridAndHexClick()}
                onHexHover={handleHexHover}
                movableHexIds={movableHexIds}
                sightRangeHexIds={sightRangeHexIds}
                collectorSightRangeHexIds={collectorSightRangeHexIds}
                trapPlacementTargetHexIds={empTrapPlacementTargetHexIds}
                barricadePlacementTargetHexIds={barricadePlacementTargetHexIds}
                chargeFieldPlacementTargetHexIds={chargeFieldPlacementTargetHexIds}
                collectorDronePlacementTargetHexIds={collectorDronePlacementTargetHexIds}
                activeChargeFieldHexIds={activeChargeFieldHexIds}
                isDangerMapVisible={isDangerMapVisible}
                isObserverCountMapVisible={isObserverCountMapVisible}
                mapRadius={mapRadius}
                gamePhase={gamePhase}
                escapePortalPosition={escapePortalPosition}
                pendingSpawnLocations={pendingSpawnLocations}
                activeBuffs={activeBuffs}
                showShockwaveEffectAt={showShockwaveEffectAt}
                showJammerEffectAt={showJammerEffectAt}
                showChargeFieldPlacementEffectAt={showChargeFieldPlacementEffectAt}
                showChargeFieldRecoveryEffectAt={showChargeFieldRecoveryEffectAt}
                showCollectorDronePlacementEffectAt={showCollectorDronePlacementEffectAt}
                showCrashBombEffect={showCrashBombEffect}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-700 rounded-lg">
                <p className="text-lg text-gray-300">Awaiting game data...</p>
              </div>
            )}

            {isFloatingLevelUpTextVisible && (
              <div
                className="level-up-float-effect absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-yellow-400 text-4xl font-bold p-4 rounded-lg z-[100] pointer-events-none text-shadow"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}
              >
                {t('LEVEL_UP_BANNER_TITLE')}
              </div>
            )}
            {isStageComplete && isStageCompleteOverlayVisible && currentStage && !isGameOver && (
              <div
                className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-[5000] cursor-pointer"
                onClick={handleStageCompleteClick}
                role="button"
                tabIndex={0}
                aria-label={t('STAGE_COMPLETE_MESSAGE')}
              >
                <h2
                  className="text-7xl font-extrabold text-green-400 animate-pulse"
                  style={{ textShadow: '0 0 15px rgba(0,255,0,0.5)' }}
                >
                  {t('STAGE_COMPLETE_MESSAGE')}
                </h2>
                <p className="text-2xl text-gray-200 mt-4">
                  {t('STAGE_COMPLETE_TITLE', { stageName: t(currentStage.nameKey) })}
                </p>
                <p className="text-4xl text-white mt-6">{t('STAGE_COMPLETE_SCORE_CENTRAL', { score })}</p>
              </div>
            )}
            {isGameOver && isGameOverOverlayVisible && gameStats && (
              <ResultScreen
                stats={gameStats}
                finalScore={score}
                finalTurn={turnNumber}
                finalLevel={playerLevel}
                gameMode={gameMode}
                stageNameKey={currentStage?.nameKey || null}
                mapRadius={mapRadius}
                onPlayAgain={handlePlayAgain}
                onClose={handleCloseResultScreen}
              />
            )}
          </div>

          {/* Mobile Footer */}
          {showMainGamePanels && (
            <div className="md:hidden flex-shrink-0 bg-gray-800/80 backdrop-blur-sm shadow-lg z-10 flex flex-col divide-y divide-gray-700/50">
              <MobileResourceBar {...resourceBarProps} />
              <div className="p-1">
                <ArmamentPanel {...armamentPanelProps} />
              </div>
            </div>
          )}
        </div>
      </div>

      {isUpgradeSelection && effectiveLevelForUpgradeContext !== undefined && !disableUI && (
        <UpgradeModal
          options={upgradeOptions}
          onSelectOption={handleSelectUpgradeOption}
          playerLevel={playerLevel}
          effectiveLevelForUpgradeContext={effectiveLevelForUpgradeContext}
        />
      )}

      {/* Mobile Drawer Menu */}
      <MobileControlsDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <div className="p-4 space-y-4">
          <CollapsiblePanel titleKey="GAME_CONTROLS_PANEL_TITLE" defaultOpenOnMobile={true}>
            <GameControls {...gameControlsProps} />
          </CollapsiblePanel>
          {showMainGamePanels && (
            <div className="bg-gray-800 rounded-lg shadow-xl p-4">
              {/* Message Log for Mobile */}
              <div
                ref={null}
                className="h-48 bg-gray-700 p-1.5 rounded overflow-y-auto text-[0.65rem] space-y-0.5 no-scrollbar"
                aria-live="polite"
                role="log"
              >
                {messages.slice(-MESSAGE_LOG_MAX_MESSAGES).map((msg, index) => (
                  <p key={index} className="text-gray-300">{`${t('INFO_LOG_PREFIX')}${msg}`}</p>
                ))}
                <div />
              </div>
            </div>
          )}
          {DEBUG_MODE && (
            <CollapsiblePanel titleKey="DEBUG_PANEL_TITLE" defaultOpenOnMobile={true}>
              <DebugPanel {...debugPanelProps} />
            </CollapsiblePanel>
          )}
        </div>
      </MobileControlsDrawer>
    </>
  )
}

const App: React.FC = () => {
  return (
    <DebugProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </DebugProvider>
  )
}

export default App
