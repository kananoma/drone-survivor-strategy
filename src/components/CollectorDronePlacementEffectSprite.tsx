import React from 'react'
// COLLECTOR_DRONE_PLACEMENT_EFFECT_DURATION_MS is used by CSS variable

interface CollectorDronePlacementEffectSpriteProps {
  pixelPos: { x: number; y: number } // Center of the hex where the drone is placed
  hexSize: number
}

export const CollectorDronePlacementEffectSprite: React.FC<CollectorDronePlacementEffectSpriteProps> = ({
  pixelPos,
  hexSize,
}) => {
  const effectBaseSize = hexSize * 0.8 // Base size of the pulse container

  return (
    <div
      className="collector-drone-placement-effect-container" // Ensure this class exists in index.html
      style={{
        left: `${pixelPos.x}px`, // Centered on the hex's pixel position
        top: `${pixelPos.y}px`,
        width: `${effectBaseSize}px`,
        height: `${effectBaseSize}px`,
        zIndex: 37, // Consistent with other placement effects
      }}
      aria-hidden="true"
    >
      <div className="collector-drone-placement-pulse"></div> {/* Ensure this class exists in index.html */}
    </div>
  )
}
