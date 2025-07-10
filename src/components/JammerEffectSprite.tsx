import React from 'react'

interface JammerEffectSpriteProps {
  pixelPos: { x: number; y: number } // This is the center of the hex where the effect originates
  hexSize: number // Base hex size, used for reference if needed for scaling the container
}

export const JammerEffectSprite: React.FC<JammerEffectSpriteProps> = ({ pixelPos, hexSize }) => {
  // The container's size can be relative to the hex size.
  // The inner .player-jammer-pulse will animate based on this container's dimensions.
  // For example, make the container roughly the size of a hex.
  const containerSize = hexSize * 1.5 // Adjust as needed for visual balance

  return (
    <div
      className="player-jammer-pulse-container"
      style={{
        // Position the container so its center is at pixelPos
        left: `${pixelPos.x - containerSize / 2}px`,
        top: `${pixelPos.y - containerSize / 2}px`,
        width: `${containerSize}px`,
        height: `${containerSize}px`,
      }}
      aria-hidden="true" // Decorative effect
    >
      <div className="player-jammer-pulse"></div>
    </div>
  )
}
