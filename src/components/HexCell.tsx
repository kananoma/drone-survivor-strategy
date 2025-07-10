import React from 'react'
import { Hex, PlacedTrap, DataChipPickup, SpareBatteryPickup, AxialCoordinates } from '../types'
import {
  DANGER_COLORS,
  DATA_CHIP_CONFIG,
  SPARE_BATTERY_CONFIG,
  ESCAPE_PORTAL_ICON,
  SPAWN_WARNING_ICON,
  ESCAPE_PORTAL_NAME_KEY,
  BARRICADE_ICON,
  EMP_TRAP_ICON,
} from '../constants'
import { useLanguage } from '../contexts/LanguageContext'

interface HexCellProps {
  hex: Hex
  size: number
  pixelPos: { x: number; y: number }
  onMouseEnter: (hex: Hex) => void
  onMouseLeave: (hex: Hex) => void
  dataChipHere?: DataChipPickup
  spareBatteryHere?: SpareBatteryPickup
  empTrapHere?: PlacedTrap
  isMovable: boolean
  isSightRange: boolean
  isCollectorSightRange?: boolean // Added for collector drone sight highlight
  isTrapPlacementTarget: boolean
  isBarricadePlacementTarget?: boolean
  isChargeFieldPlacementTarget?: boolean
  isCollectorDronePlacementTarget?: boolean
  isChargeFieldActiveZone?: boolean
  isDangerMapVisible: boolean
  isObserverCountMapVisible: boolean
  isOccupiedBySprite: boolean
  isEscapePortal?: boolean
  isSpawnWarning?: boolean
}

const ItemIcon: React.FC<{
  type: 'dataChip' | 'spareBattery' | 'empTrap' | 'escapePortal' | 'spawnWarning' | 'barricade'
  title: string
  count?: number
}> = ({ type, title, count }) => {
  let icon = ''
  let animateClass = ''
  switch (type) {
    case 'dataChip':
      icon = DATA_CHIP_CONFIG.icon
      animateClass = 'animate-pulse'
      break
    case 'spareBattery':
      icon = SPARE_BATTERY_CONFIG.icon
      animateClass = 'animate-bounce'
      break
    case 'empTrap':
      icon = EMP_TRAP_ICON
      break
    case 'barricade':
      icon = BARRICADE_ICON
      break
    case 'escapePortal':
      icon = ESCAPE_PORTAL_ICON
      animateClass = 'animate-pulse text-blue-400'
      break
    case 'spawnWarning':
      icon = SPAWN_WARNING_ICON
      animateClass = 'animate-ping text-red-400 opacity-70'
      break
  }
  return (
    <div className="relative" title={title}>
      <span className={`text-xl ${animateClass}`}>{icon}</span>
      {count && count > 1 && (
        <span
          className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none shadow-md"
          style={{ fontSize: '0.6rem' }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

export const HexCell: React.FC<HexCellProps> = React.memo(
  ({
    hex,
    size,
    pixelPos,
    onMouseEnter,
    onMouseLeave,
    dataChipHere,
    spareBatteryHere,
    empTrapHere,
    isMovable,
    isSightRange,
    isCollectorSightRange, // Destructure new prop
    isTrapPlacementTarget,
    isBarricadePlacementTarget,
    isChargeFieldPlacementTarget,
    isCollectorDronePlacementTarget,
    isChargeFieldActiveZone,
    isDangerMapVisible,
    isObserverCountMapVisible,
    isOccupiedBySprite,
    isEscapePortal,
    isSpawnWarning,
  }) => {
    const { t } = useLanguage()
    const hexWidth = size * 2
    const hexHeight = size * Math.sqrt(3)

    let cellClasses = `hex absolute flex items-center justify-center`
    const cellFillColor =
      hex.fillColorClass ||
      (isDangerMapVisible || isObserverCountMapVisible ? DANGER_COLORS[0] : 'bg-white hover:bg-gray-100')

    if (isMovable) cellClasses += ' hex-highlight-movable'
    if (isSightRange) cellClasses += ' hex-highlight-sight'
    if (isCollectorSightRange && !isDangerMapVisible && !isObserverCountMapVisible)
      cellClasses += ' hex-highlight-collector-sight' // Apply new highlight
    if (isTrapPlacementTarget) cellClasses += ' hex-highlight-trap-placement'
    if (isBarricadePlacementTarget) cellClasses += ' hex-highlight-barricade-placement'
    if (isChargeFieldPlacementTarget) cellClasses += ' hex-highlight-charge-field-placement'
    if (isCollectorDronePlacementTarget) cellClasses += ' hex-highlight-collector-drone-placement'
    if (isChargeFieldActiveZone && !isDangerMapVisible && !isObserverCountMapVisible)
      cellClasses += ' hex-highlight-charge-field-active-zone'

    if (isSpawnWarning && !isDangerMapVisible && !isObserverCountMapVisible) {
      cellClasses += ' hex-highlight-spawn-warning'
    }
    if (isEscapePortal && !isDangerMapVisible && !isObserverCountMapVisible) {
      cellClasses += ' hex-highlight-portal'
    }

    const baseTitle = t('HEX_TOOLTIP_COORDS', { q: hex.q, r: hex.r })
    let heatmapTitle = ''
    if (isObserverCountMapVisible && hex.observerCount !== undefined) {
      heatmapTitle = ` ${t('HEX_TOOLTIP_OBSERVER_COUNT', { count: hex.observerCount })}`
    } else if (isDangerMapVisible) {
      heatmapTitle = ` ${t('HEX_TOOLTIP_DANGER', { dangerLevel: hex.dangerLevel.toFixed(0) })}`
    }

    let cellTitle = `${baseTitle}${heatmapTitle}`
    if (isEscapePortal) cellTitle += ` | ${t(ESCAPE_PORTAL_NAME_KEY)}`
    if (isSpawnWarning) cellTitle += ` | ${t('SPAWN_WARNING_TOOLTIP')}`
    if (isChargeFieldActiveZone) cellTitle += ` | ${t('HEX_TOOLTIP_CHARGE_FIELD_ACTIVE')}`
    if (isCollectorSightRange) cellTitle += ` | ${t('HEX_TOOLTIP_COLLECTOR_SIGHT')}`

    const dataChipTitle =
      t(DATA_CHIP_CONFIG.nameKey) + (dataChipHere && dataChipHere.count > 1 ? ` (x${dataChipHere.count})` : '')
    const spareBatteryTitle =
      t(SPARE_BATTERY_CONFIG.nameKey) +
      (spareBatteryHere && spareBatteryHere.count > 1 ? ` (x${spareBatteryHere.count})` : '')
    const empTrapTitle = t('ITEM_EMP_TRAP_NAME')

    const dataChipPositionClass = isOccupiedBySprite && dataChipHere ? 'bottom-1 left-1' : ''
    const spareBatteryPositionClass = isOccupiedBySprite && spareBatteryHere ? 'bottom-1 right-1' : ''

    return (
      <div
        className={`${cellClasses} ${cellFillColor}`}
        style={{
          width: `${hexWidth}px`,
          height: `${hexHeight}px`,
          left: `${pixelPos.x - hexWidth / 2}px`,
          top: `${pixelPos.y - hexHeight / 2}px`,
        }}
        onMouseEnter={() => onMouseEnter(hex)}
        onMouseLeave={() => onMouseLeave(hex)}
        title={cellTitle}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {dataChipHere && (
            <div className={`absolute z-10 ${dataChipPositionClass}`}>
              <ItemIcon type="dataChip" title={dataChipTitle} count={dataChipHere.count} />
            </div>
          )}
          {spareBatteryHere && (
            <div className={`absolute z-10 ${spareBatteryPositionClass}`}>
              <ItemIcon type="spareBattery" title={spareBatteryTitle} count={spareBatteryHere.count} />
            </div>
          )}
          {empTrapHere && (
            <div
              className="absolute w-2/5 h-2/5 bg-gray-600 border-2 border-gray-500 flex items-center justify-center text-white text-xs z-10"
              title={empTrapTitle}
            >
              <ItemIcon type="empTrap" title={empTrapTitle} />
            </div>
          )}
        </div>
      </div>
    )
  }
)
