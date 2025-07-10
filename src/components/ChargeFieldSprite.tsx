import React from 'react'
import { PlacedChargeField } from '../types'
import { HEX_SIZE, CHARGE_FIELD_ICON } from '../constants'
import { useLanguage } from '../contexts/LanguageContext'

interface ChargeFieldSpriteProps {
  chargeField: PlacedChargeField
  pixelPos: { x: number; y: number }
}

export const ChargeFieldSprite: React.FC<ChargeFieldSpriteProps> = ({ chargeField, pixelPos }) => {
  const { t } = useLanguage()
  const spriteSize = HEX_SIZE * 0.7 // Standard item size

  return (
    <div
      className="sprite charge-field-sprite-item" // Reusing 'sprite' for base, specific class for unique style
      style={{
        width: `${spriteSize}px`,
        height: `${spriteSize}px`,
        left: `${pixelPos.x - spriteSize / 2}px`,
        top: `${pixelPos.y - spriteSize / 2}px`,
        zIndex: 14, // Consistent with other placed items, or adjust as needed
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
      }}
      title={t('CHARGE_FIELD_TOOLTIP', { recovery: chargeField.recoveryAmount, turnsLeft: chargeField.turnsLeft })}
    >
      {CHARGE_FIELD_ICON}
      {chargeField.turnsLeft > 0 && (
        <span
          className="absolute -top-2 -right-2 bg-blue-500 text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full shadow-md"
          aria-label={t('INFO_TURN_REMAINING', { turns: chargeField.turnsLeft })}
        >
          {chargeField.turnsLeft}
        </span>
      )}
    </div>
  )
}
