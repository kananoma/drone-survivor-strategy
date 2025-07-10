import React from 'react'
// CHARGE_FIELD_RECOVERY_EFFECT_DURATION_MS is used by CSS variable now

interface ChargeFieldRecoveryEffectSpriteProps {
  pixelPos: { x: number; y: number } // Player's current pixel position
  hexSize: number
}

export const ChargeFieldRecoveryEffectSprite: React.FC<ChargeFieldRecoveryEffectSpriteProps> = ({
  pixelPos,
  hexSize,
}) => {
  const effectBaseSize = hexSize * 0.8 // Base size for the effect container

  return (
    <div
      className="charge-field-recovery-effect-container"
      style={{
        left: `${pixelPos.x}px`,
        top: `${pixelPos.y}px`,
        width: `${effectBaseSize}px`,
        height: `${effectBaseSize}px`,
        zIndex: 40, // Ensure it's visible (e.g., above player sprite)
      }}
      aria-hidden="true"
    >
      <div className="charge-field-recovery-pulse"></div>
    </div>
  )
}
