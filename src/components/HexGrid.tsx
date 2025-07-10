import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Hex,
  Player,
  Enemy,
  PlacedTrap,
  PlacedBarricade,
  PlacedChargeField,
  CollectorDroneEntity,
  AxialCoordinates,
  GamePhase,
  DataChipPickup,
  SpareBatteryPickup,
  ActiveArmamentBuffs,
} from '../types'
import { HexCell } from './HexCell'
import { PlayerSprite } from './PlayerSprite'
import { EnemySprite } from './EnemySprite'
import { BarricadeSprite } from './BarricadeSprite'
import { ChargeFieldSprite } from './ChargeFieldSprite'
import { CollectorDroneSprite } from './CollectorDroneSprite'
import { ShockwaveEffectSprite } from './ShockwaveEffectSprite'
import { JammerEffectSprite } from './JammerEffectSprite'
import { ChargeFieldPlacementEffectSprite } from './ChargeFieldPlacementEffectSprite'
import { ChargeFieldRecoveryEffectSprite } from './ChargeFieldRecoveryEffectSprite'
import { CollectorDronePlacementEffectSprite } from './CollectorDronePlacementEffectSprite'
import { CrashBombEffectSprite } from './CrashBombEffectSprite'
import { HEX_SIZE, ESCAPE_PORTAL_ICON, SPAWN_WARNING_ICON, ESCAPE_PORTAL_NAME_KEY } from '../constants'
import {
  axialToPixel,
  pixelToAxial,
  idToAxial,
  axialToId,
  getHexesInRange,
  areAxialCoordsEqual,
} from '../utils/hexUtils'
import { useLanguage } from '../contexts/LanguageContext'

interface HexGridProps {
  hexes: Map<string, Hex>
  player: Player | null
  enemies: Enemy[]
  dataChips: DataChipPickup[]
  spareBatteriesOnMap: SpareBatteryPickup[]
  placedEmpTraps: PlacedTrap[]
  placedBarricades: PlacedBarricade[]
  placedChargeFields: PlacedChargeField[]
  placedCollectorDrones: CollectorDroneEntity[]
  onHexClick: (hex: Hex) => void
  onGridAreaClick: () => void
  onHexHover: (hex: Hex | null) => void
  movableHexIds: string[]
  sightRangeHexIds: string[]
  collectorSightRangeHexIds: Set<string> // Added for collector drone sight
  trapPlacementTargetHexIds: string[]
  barricadePlacementTargetHexIds: string[]
  chargeFieldPlacementTargetHexIds: string[]
  collectorDronePlacementTargetHexIds: string[]
  activeChargeFieldHexIds: Set<string>
  isDangerMapVisible: boolean
  isObserverCountMapVisible: boolean
  mapRadius: number
  gamePhase: GamePhase
  escapePortalPosition: AxialCoordinates | null
  pendingSpawnLocations: AxialCoordinates[] | null
  activeBuffs: ActiveArmamentBuffs
  showShockwaveEffectAt: AxialCoordinates | null
  showJammerEffectAt: AxialCoordinates | null
  showChargeFieldPlacementEffectAt: AxialCoordinates | null
  showChargeFieldRecoveryEffectAt: AxialCoordinates | null
  showCollectorDronePlacementEffectAt: AxialCoordinates | null
  showCrashBombEffect: boolean
}

const DRAG_THRESHOLD = 5

export const HexGrid: React.FC<HexGridProps> = ({
  hexes,
  player,
  enemies,
  dataChips,
  spareBatteriesOnMap,
  placedEmpTraps,
  placedBarricades,
  placedChargeFields,
  placedCollectorDrones,
  onHexClick,
  onGridAreaClick,
  onHexHover,
  movableHexIds,
  sightRangeHexIds,
  collectorSightRangeHexIds, // Destructure new prop
  trapPlacementTargetHexIds,
  barricadePlacementTargetHexIds,
  chargeFieldPlacementTargetHexIds,
  collectorDronePlacementTargetHexIds,
  activeChargeFieldHexIds,
  isDangerMapVisible,
  isObserverCountMapVisible,
  mapRadius,
  gamePhase,
  escapePortalPosition,
  pendingSpawnLocations,
  activeBuffs,
  showShockwaveEffectAt,
  showJammerEffectAt,
  showChargeFieldPlacementEffectAt,
  showChargeFieldRecoveryEffectAt,
  showCollectorDronePlacementEffectAt,
  showCrashBombEffect,
}) => {
  const { t } = useLanguage()
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const gridContainerRef = useRef<HTMLDivElement>(null)

  const isDraggingRef = useRef(false)
  const didDragRef = useRef(false)
  const mouseDownPosRef = useRef({ x: 0, y: 0 })
  const lastMousePosRef = useRef({ x: 0, y: 0 })

  const getAdjustedPixelPos = useCallback((coords: AxialCoordinates) => {
    const offsetX = (gridContainerRef.current?.clientWidth || 0) / 2
    const offsetY = (gridContainerRef.current?.clientHeight || 0) / 2

    const { x, y } = axialToPixel(coords, HEX_SIZE)
    return { x: x + offsetX, y: y + offsetY }
  }, [])

  useEffect(() => {
    const container = gridContainerRef.current
    if (!container) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const panSpeed = 1
      const zoomFactor = 0.001

      if (event.ctrlKey) {
        const currentScale = scale
        let newScale = currentScale - event.deltaY * zoomFactor
        newScale = Math.max(0.2, Math.min(3, newScale))

        const rect = container.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top

        const worldXBeforeZoom = (mouseX - translate.x) / currentScale
        const worldYBeforeZoom = (mouseY - translate.y) / currentScale

        const newTranslateX = mouseX - worldXBeforeZoom * newScale
        const newTranslateY = mouseY - worldYBeforeZoom * newScale

        setScale(newScale)
        setTranslate({ x: newTranslateX, y: newTranslateY })
      } else if (event.shiftKey) {
        setTranslate((prev) => ({
          ...prev,
          x: prev.x - event.deltaY * panSpeed,
        }))
      } else {
        setTranslate((prev) => ({
          x: prev.x - event.deltaX * panSpeed,
          y: prev.y - event.deltaY * panSpeed,
        }))
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [scale, translate])

  useEffect(() => {
    const container = gridContainerRef.current
    if (!container) return

    const handleMouseDown = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('button, select, input')) {
        return
      }
      isDraggingRef.current = true
      didDragRef.current = false
      mouseDownPosRef.current = { x: event.clientX, y: event.clientY }
      lastMousePosRef.current = { x: event.clientX, y: event.clientY }
      container.style.cursor = 'grabbing'
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return
      const dx = event.clientX - lastMousePosRef.current.x
      const dy = event.clientY - lastMousePosRef.current.y
      setTranslate((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      lastMousePosRef.current = { x: event.clientX, y: event.clientY }

      const dragDistance = Math.sqrt(
        Math.pow(event.clientX - mouseDownPosRef.current.x, 2) + Math.pow(event.clientY - mouseDownPosRef.current.y, 2)
      )
      if (dragDistance > DRAG_THRESHOLD) {
        didDragRef.current = true
      }
    }

    const handleMouseUp = (event: MouseEvent) => {
      if (!isDraggingRef.current) return

      if (!didDragRef.current) {
        const rect = container.getBoundingClientRect()
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          const mouseXInContainer = event.clientX - rect.left
          const mouseYInContainer = event.clientY - rect.top

          const mouseXInMapContent = (mouseXInContainer - translate.x) / scale
          const mouseYInMapContent = (mouseYInContainer - translate.y) / scale

          const centerX = (container.clientWidth || 0) / 2
          const centerY = (container.clientHeight || 0) / 2

          const targetAxial = pixelToAxial(mouseXInMapContent - centerX, mouseYInMapContent - centerY, HEX_SIZE)
          const clickedHexId = axialToId(targetAxial.q, targetAxial.r)
          const hexToClick = hexes.get(clickedHexId)

          if (hexToClick) {
            onHexClick(hexToClick)
          } else {
            onGridAreaClick()
          }
        }
      }
      isDraggingRef.current = false
      container.style.cursor = 'grab'
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        if ((event.target as HTMLElement).closest('button, select, input')) {
          return
        }
        isDraggingRef.current = true
        didDragRef.current = false
        const touch = event.touches[0]
        mouseDownPosRef.current = { x: touch.clientX, y: touch.clientY }
        lastMousePosRef.current = { x: touch.clientX, y: touch.clientY }
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDraggingRef.current || event.touches.length !== 1) return
      if (isDraggingRef.current) event.preventDefault()

      const touch = event.touches[0]
      const dx = touch.clientX - lastMousePosRef.current.x
      const dy = touch.clientY - lastMousePosRef.current.y
      setTranslate((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      lastMousePosRef.current = { x: touch.clientX, y: touch.clientY }

      const dragDistance = Math.sqrt(
        Math.pow(touch.clientX - mouseDownPosRef.current.x, 2) + Math.pow(touch.clientY - mouseDownPosRef.current.y, 2)
      )
      if (dragDistance > DRAG_THRESHOLD) {
        didDragRef.current = true
      }
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (!isDraggingRef.current) return

      if (!didDragRef.current) {
        const touch = event.changedTouches[0]
        if (touch) {
          const rect = container.getBoundingClientRect()
          if (
            touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom
          ) {
            const mouseXInContainer = touch.clientX - rect.left
            const mouseYInContainer = touch.clientY - rect.top

            const mouseXInMapContent = (mouseXInContainer - translate.x) / scale
            const mouseYInMapContent = (mouseYInContainer - translate.y) / scale

            const centerX = (container.clientWidth || 0) / 2
            const centerY = (container.clientHeight || 0) / 2

            const targetAxial = pixelToAxial(mouseXInMapContent - centerX, mouseYInMapContent - centerY, HEX_SIZE)
            const clickedHexId = axialToId(targetAxial.q, targetAxial.r)
            const hexToClick = hexes.get(clickedHexId)

            if (hexToClick) {
              onHexClick(hexToClick)
            } else {
              onGridAreaClick()
            }
          }
        }
      }
      isDraggingRef.current = false
    }

    container.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [hexes, onHexClick, onGridAreaClick, scale, translate])

  useEffect(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [mapRadius])

  const portalTitle = t(ESCAPE_PORTAL_NAME_KEY)
  const spawnWarningTitle = t('SPAWN_WARNING_TOOLTIP')
  const playerPixelPos = player ? getAdjustedPixelPos(player) : { x: 0, y: 0 }

  return (
    <div
      ref={gridContainerRef}
      className="w-full h-full bg-gray-900 rounded-lg shadow-inner overflow-hidden relative cursor-grab no-scrollbar"
      onMouseLeave={() => onHexHover(null)}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {Array.from(hexes.values()).map((hex) => {
          const pixelPos = getAdjustedPixelPos(hex)
          const dataChipOnHex = dataChips.find((p) => p.q === hex.q && p.r === hex.r)
          const spareBatteryOnHex = spareBatteriesOnMap.find((p) => p.q === hex.q && p.r === hex.r)
          const empTrapOnHex = placedEmpTraps.find((t) => t.q === hex.q && t.r === hex.r)
          const isEscapePortalHere = escapePortalPosition?.q === hex.q && escapePortalPosition?.r === hex.r
          const isSpawnWarningHere = pendingSpawnLocations?.some((loc) => areAxialCoordsEqual(loc, hex))

          const isPlayerOnHex = player && player.q === hex.q && player.r === hex.r
          const isEnemyOnHex = enemies.some((enemy) => enemy.q === hex.q && enemy.r === hex.r)
          const isCollectorDroneOnHex = placedCollectorDrones.some((cd) => cd.q === hex.q && cd.r === hex.r)
          const isOccupiedBySprite = isPlayerOnHex || isEnemyOnHex || isCollectorDroneOnHex

          return (
            <HexCell
              key={hex.id}
              hex={hex}
              size={HEX_SIZE}
              pixelPos={pixelPos}
              onMouseEnter={onHexHover}
              onMouseLeave={() => {}}
              dataChipHere={dataChipOnHex}
              spareBatteryHere={spareBatteryOnHex}
              empTrapHere={empTrapOnHex}
              isMovable={
                gamePhase === 'PlayerTurn' &&
                !isDangerMapVisible &&
                !isObserverCountMapVisible &&
                movableHexIds.includes(hex.id)
              }
              isSightRange={sightRangeHexIds.includes(hex.id)}
              isCollectorSightRange={collectorSightRangeHexIds.has(hex.id)}
              isTrapPlacementTarget={gamePhase === 'PlacingEmpTrap' && trapPlacementTargetHexIds.includes(hex.id)}
              isBarricadePlacementTarget={
                gamePhase === 'PlacingBarricade' && barricadePlacementTargetHexIds.includes(hex.id)
              }
              isChargeFieldPlacementTarget={
                gamePhase === 'PlacingChargeField' && chargeFieldPlacementTargetHexIds.includes(hex.id)
              }
              isCollectorDronePlacementTarget={
                gamePhase === 'PlacingCollectorDrone' && collectorDronePlacementTargetHexIds.includes(hex.id)
              }
              isChargeFieldActiveZone={activeChargeFieldHexIds.has(hex.id)}
              isDangerMapVisible={isDangerMapVisible}
              isObserverCountMapVisible={isObserverCountMapVisible}
              isOccupiedBySprite={isOccupiedBySprite}
              isEscapePortal={isEscapePortalHere}
              isSpawnWarning={isSpawnWarningHere}
            />
          )
        })}

        {player && gamePhase !== 'GameOver' && (
          <PlayerSprite
            player={player}
            pixelPos={getAdjustedPixelPos(player)}
            isBoosterActive={activeBuffs.boosterActiveThisTurn}
            isStealthActive={activeBuffs.stealth.isActive}
            boosterActionsAvailable={activeBuffs.boosterActionsAvailableThisTurn}
          />
        )}
        {enemies.map((enemy) => (
          <EnemySprite
            key={enemy.id}
            enemy={enemy}
            pixelPos={getAdjustedPixelPos(enemy)}
            initialAnimationState={enemy.isNewlySpawned ? 'spawning' : 'idle'}
            showStealthAvoidanceEffect={enemy.showStealthAvoidanceEffect}
            activeGameBuffs={activeBuffs}
          />
        ))}
        {placedBarricades.map((barricade) => (
          <BarricadeSprite key={barricade.id} barricade={barricade} pixelPos={getAdjustedPixelPos(barricade)} />
        ))}
        {placedChargeFields.map((chargeField) => (
          <ChargeFieldSprite
            key={chargeField.id}
            chargeField={chargeField}
            pixelPos={getAdjustedPixelPos(chargeField)}
          />
        ))}
        {placedCollectorDrones.map((collectorDrone) => (
          <CollectorDroneSprite
            key={collectorDrone.id}
            collectorDrone={collectorDrone}
            pixelPos={getAdjustedPixelPos(collectorDrone)}
          />
        ))}
        {escapePortalPosition && (
          <div
            className="absolute flex items-center justify-center text-3xl z-10 animate-pulse"
            style={{
              width: `${HEX_SIZE}px`,
              height: `${HEX_SIZE}px`,
              left: `${getAdjustedPixelPos(escapePortalPosition).x - HEX_SIZE / 2}px`,
              top: `${getAdjustedPixelPos(escapePortalPosition).y - HEX_SIZE / 2}px`,
            }}
            title={portalTitle}
          >
            {ESCAPE_PORTAL_ICON}
          </div>
        )}
        {pendingSpawnLocations?.map((loc) => (
          <div
            key={`warn-${loc.q}-${loc.r}`}
            className="absolute flex items-center justify-center text-2xl z-10 opacity-70 animate-ping"
            style={{
              width: `${HEX_SIZE}px`,
              height: `${HEX_SIZE}px`,
              left: `${getAdjustedPixelPos(loc).x - HEX_SIZE / 2}px`,
              top: `${getAdjustedPixelPos(loc).y - HEX_SIZE / 2}px`,
              pointerEvents: 'none',
            }}
            title={spawnWarningTitle}
          >
            {SPAWN_WARNING_ICON}
          </div>
        ))}
        {showShockwaveEffectAt && (
          <ShockwaveEffectSprite pixelPos={getAdjustedPixelPos(showShockwaveEffectAt)} hexSize={HEX_SIZE} />
        )}
        {showJammerEffectAt && (
          <JammerEffectSprite pixelPos={getAdjustedPixelPos(showJammerEffectAt)} hexSize={HEX_SIZE} />
        )}
        {showChargeFieldPlacementEffectAt && (
          <ChargeFieldPlacementEffectSprite
            pixelPos={getAdjustedPixelPos(showChargeFieldPlacementEffectAt)}
            hexSize={HEX_SIZE}
          />
        )}
        {showChargeFieldRecoveryEffectAt && player && (
          <ChargeFieldRecoveryEffectSprite pixelPos={getAdjustedPixelPos(player)} hexSize={HEX_SIZE} />
        )}
        {showCollectorDronePlacementEffectAt && (
          <CollectorDronePlacementEffectSprite
            pixelPos={getAdjustedPixelPos(showCollectorDronePlacementEffectAt)}
            hexSize={HEX_SIZE}
          />
        )}
        {showCrashBombEffect && player && <CrashBombEffectSprite playerPixelPos={playerPixelPos} />}
      </div>
      {activeBuffs.jammerFieldEffect.isActive && <div className="global-jammer-field-overlay" aria-hidden="true"></div>}
    </div>
  )
}
