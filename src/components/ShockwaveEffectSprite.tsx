import React from 'react'
import { AxialCoordinates } from '../types' // Assuming AxialCoordinates is here
import { SHOCKWAVE_ICON } from '../constants' // If you have a specific icon

interface ShockwaveEffectSpriteProps {
  pixelPos: { x: number; y: number }
  hexSize: number // To scale the effect appropriately
}

export const ShockwaveEffectSprite: React.FC<ShockwaveEffectSpriteProps> = ({ pixelPos, hexSize }) => {
  // The container helps center the pulse effect on the player's sprite location
  // The pulse itself will expand from the center of this container.
  // The actual player sprite is drawn separately. This is just the effect.
  const effectBaseSize = hexSize * 0.8 // Base size of the pulse container, relative to hex size

  return (
    <div
      className="player-shockwave-pulse-container"
      style={{
        left: `${pixelPos.x}px`, // Centered on the hex's pixel position
        top: `${pixelPos.y}px`,
        width: `${effectBaseSize}px`,
        height: `${effectBaseSize}px`,
        // transform: 'translate(-50%, -50%)', // Already handled by CSS if using top/left 50%
      }}
      aria-hidden="true" // Decorative effect
    >
      <div className="player-shockwave-pulse" style={{ animationDelay: '0s' }}></div>
      {/* You can add multiple divs with delays for a more complex wave, like the booster */}
      {/* <div className="player-shockwave-pulse" style={{ animationDelay: '0.1s' }}></div> */}
    </div>
  )
}
