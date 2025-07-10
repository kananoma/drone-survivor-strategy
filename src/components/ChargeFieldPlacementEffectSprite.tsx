import React from 'react'
// CHARGE_FIELD_PLACEMENT_EFFECT_DURATION_MS is used by CSS variable now

interface ChargeFieldPlacementEffectSpriteProps {
  pixelPos: { x: number; y: number } // Center of the hex where the field is placed
  hexSize: number
}

export const ChargeFieldPlacementEffectSprite: React.FC<ChargeFieldPlacementEffectSpriteProps> = ({
  pixelPos,
  hexSize,
}) => {
  const effectBaseSize = hexSize * 0.8 // Base size of the pulse container

  return (
    <div
      className="charge-field-placement-effect-container"
      style={{
        left: `${pixelPos.x}px`, // Centered on the hex's pixel position
        top: `${pixelPos.y}px`,
        width: `${effectBaseSize}px`,
        height: `${effectBaseSize}px`,
      }}
      aria-hidden="true"
    >
      <div className="charge-field-placement-pulse"></div>
    </div>
  )
}
