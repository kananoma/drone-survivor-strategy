import React from 'react'
import { CollectorDroneEntity } from '../types'
import { HEX_SIZE, COLLECTOR_DRONE_ICON } from '../constants'
import { useLanguage } from '../contexts/LanguageContext'

interface CollectorDroneSpriteProps {
  collectorDrone: CollectorDroneEntity
  pixelPos: { x: number; y: number }
}

export const CollectorDroneSprite: React.FC<CollectorDroneSpriteProps> = ({ collectorDrone, pixelPos }) => {
  const { t } = useLanguage()
  const spriteSize = HEX_SIZE * 0.6

  const droneSpriteItemClass = 'collector-drone-sprite-item'

  const title = t('COLLECTOR_DRONE_TOOLTIP', {
    id: collectorDrone.id.substring(0, 4),
    turnsLeft: collectorDrone.turnsLeft,
    searchRadius: collectorDrone.searchRadius, // Add searchRadius to tooltip
  })

  return (
    <div
      className={`sprite ${droneSpriteItemClass}`}
      style={{
        width: `${spriteSize}px`,
        height: `${spriteSize}px`,
        left: `${pixelPos.x - spriteSize / 2}px`,
        top: `${pixelPos.y - spriteSize / 2}px`,
        zIndex: 18,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem', // Adjusted font size for "CX"
        fontWeight: 'bold',
        color: 'white',
      }}
      title={title}
    >
      C{collectorDrone.searchRadius} {/* Display C{searchRadius} */}
      {collectorDrone.turnsLeft > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-green-600 text-white text-[0.55rem] font-bold px-1 py-0.5 rounded-full shadow-md"
          aria-label={t('INFO_TURN_REMAINING', { turns: collectorDrone.turnsLeft })}
          style={{ lineHeight: '1' }}
        >
          {collectorDrone.turnsLeft}
        </span>
      )}
    </div>
  )
}
