import React from 'react'
import { Player } from '../types'
import { HEX_SIZE } from '../constants'
import { useLanguage } from '../contexts/LanguageContext'

interface PlayerSpriteProps {
  player: Player
  pixelPos: { x: number; y: number }
  isBoosterActive: boolean
  isStealthActive: boolean
  boosterActionsAvailable: number
}

export const PlayerSprite: React.FC<PlayerSpriteProps> = ({
  player,
  pixelPos,
  isBoosterActive,
  isStealthActive,
  boosterActionsAvailable,
}) => {
  const { t } = useLanguage()
  const spriteSize = HEX_SIZE * 0.6

  const actionPointsElements = []
  if (boosterActionsAvailable > 0) {
    for (let i = 0; i < boosterActionsAvailable; i++) {
      actionPointsElements.push(
        <span
          key={`booster-ap-${i}`}
          className="text-orange-400 text-xl"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          title={t('INFO_ACTION_POINT_BOOSTER')}
        >
          ◆
        </span>
      )
    }
  }

  return (
    <div
      className="sprite player-sprite bg-blue-500"
      style={{
        width: `${spriteSize}px`,
        height: `${spriteSize}px`,
        left: `${pixelPos.x - spriteSize / 2}px`,
        top: `${pixelPos.y - spriteSize / 2}px`,
        opacity: isStealthActive ? 0.5 : 1,
      }}
      title={t('PLAYER_DRONE_TOOLTIP') + (isStealthActive ? ` (${t('ARMAMENT_STEALTH_TITLE')} Active)` : '')}
    >
      {isBoosterActive && (
        <div className="player-booster-wave-container">
          <div className="player-booster-wave" style={{ animationDelay: '0s' }}></div>
          <div className="player-booster-wave" style={{ animationDelay: '0.4s' }}></div>
          <div className="player-booster-wave" style={{ animationDelay: '0.8s' }}></div>
        </div>
      )}
      P
      {actionPointsElements.length > 0 && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-0.5 w-max">
          {actionPointsElements}
        </div>
      )}
    </div>
  )
}
