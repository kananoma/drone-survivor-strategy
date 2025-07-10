import React from 'react'
import { PlacedBarricade } from '../types'
import { HEX_SIZE, BARRICADE_ICON } from '../constants'
import { useLanguage } from '../contexts/LanguageContext'

interface BarricadeSpriteProps {
  barricade: PlacedBarricade
  pixelPos: { x: number; y: number }
}

export const BarricadeSprite: React.FC<BarricadeSpriteProps> = ({ barricade, pixelPos }) => {
  const { t } = useLanguage()
  const spriteSize = HEX_SIZE * 0.7 // Slightly larger for visibility

  return (
    <div
      className="sprite absolute flex items-center justify-center text-2xl" // Reusing 'sprite' class structure
      style={{
        width: `${spriteSize}px`,
        height: `${spriteSize}px`,
        left: `${pixelPos.x - spriteSize / 2}px`,
        top: `${pixelPos.y - spriteSize / 2}px`,
        // backgroundColor: 'rgba(100, 100, 100, 0.5)', // Optional: semi-transparent background
        // border: '1px dashed #ccc', // Optional: border
        // borderRadius: '10%', // Optional: slight rounding for a blocky look
        zIndex: 15, // Below enemies/player, above hex highlights
        pointerEvents: 'none',
      }}
      title={`${t('ITEM_BARRICADE_NAME')} (${t('INFO_TURN_REMAINING', { turns: barricade.turnsLeft })})`}
    >
      {BARRICADE_ICON}
      {barricade.turnsLeft > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-red-500 text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full shadow-md"
          aria-label={t('INFO_TURN_REMAINING', { turns: barricade.turnsLeft })}
        >
          {barricade.turnsLeft}
        </span>
      )}
    </div>
  )
}

// Add to en.json and ja.json
// "INFO_TURN_REMAINING": "Turns: {turns}" (EN)
// "INFO_TURN_REMAINING": "残ターン: {turns}" (JA)
// "ITEM_BARRICADE_NAME": "Barricade" / "バリケード" (already added)
