import React from 'react'
import { CRASH_BOMB_EFFECT_DURATION_MS } from '../constants' // Used by CSS

interface CrashBombEffectSpriteProps {
  playerPixelPos: { x: number; y: number }
}

export const CrashBombEffectSprite: React.FC<CrashBombEffectSpriteProps> = ({ playerPixelPos }) => {
  // This component will render an effect centered on the player.
  // The outer container is positioned at the player's location.
  // Inner ripples and glitch effects are relative to this container.
  return (
    <div
      className="crash-bomb-effect-container" // Renamed from -fullscreen-overlay
      style={{
        position: 'absolute',
        left: `${playerPixelPos.x}px`,
        top: `${playerPixelPos.y}px`,
        // width/height can be small, as ripples expand greatly
        width: '10px',
        height: '10px',
        transform: 'translate(-50%, -50%)', // Center the small container on player pos
      }}
      aria-hidden="true"
    >
      <div className="crash-bomb-ripple" style={{ animationDelay: '0s' }}></div>
      <div className="crash-bomb-ripple" style={{ animationDelay: '0.1s' }}></div>
      <div className="crash-bomb-ripple" style={{ animationDelay: '0.2s' }}></div>
      <div className="crash-bomb-glitch-overlay"></div>
    </div>
  )
}
