import React, { useState, useEffect } from 'react'
import { Enemy, ActiveArmamentBuffs } from '../types'
import { HEX_SIZE, ENEMY_LEVEL_COLORS, ENEMY_DEFAULT_COLOR, ANIMATION_DURATION_MS } from '../constants'
import { useLanguage } from '../contexts/LanguageContext'

type AnimationStateProp = 'spawning' | 'idle'

interface EnemySpriteProps {
  enemy: Enemy
  pixelPos: { x: number; y: number }
  initialAnimationState?: AnimationStateProp
  showStealthAvoidanceEffect?: boolean
  activeGameBuffs: ActiveArmamentBuffs
}

const SPAWN_ANIMATION_DURATION_MS = 50
const STEALTH_AVOID_EFFECT_DURATION_MS = 1500

export const EnemySprite: React.FC<EnemySpriteProps> = ({
  enemy,
  pixelPos,
  initialAnimationState = 'idle',
  showStealthAvoidanceEffect = false,
  activeGameBuffs,
}) => {
  const { t } = useLanguage()
  const [isFullySpawned, setIsFullySpawned] = useState(initialAnimationState === 'idle')
  const [hasStartedSpawningVisual, setHasStartedSpawningVisual] = useState(initialAnimationState === 'idle')
  const [timedShowStealthEffect, setTimedShowStealthEffect] = useState(false)

  useEffect(() => {
    if (initialAnimationState === 'spawning') {
      setIsFullySpawned(false)
      setHasStartedSpawningVisual(false)
      const startAnimTimer = setTimeout(() => setHasStartedSpawningVisual(true), 20)
      const fullySpawnedTimer = setTimeout(() => setIsFullySpawned(true), SPAWN_ANIMATION_DURATION_MS + 50)
      return () => {
        clearTimeout(startAnimTimer)
        clearTimeout(fullySpawnedTimer)
      }
    } else {
      setIsFullySpawned(true)
      setHasStartedSpawningVisual(true)
    }
  }, [initialAnimationState, enemy.id])

  useEffect(() => {
    if (showStealthAvoidanceEffect && !timedShowStealthEffect) {
      setTimedShowStealthEffect(true)
    }
  }, [showStealthAvoidanceEffect, timedShowStealthEffect, enemy.id])

  useEffect(() => {
    let timerId: number | undefined
    if (timedShowStealthEffect) {
      timerId = window.setTimeout(() => {
        setTimedShowStealthEffect(false)
      }, STEALTH_AVOID_EFFECT_DURATION_MS)
    }
    return () => {
      if (timerId) {
        clearTimeout(timerId)
      }
    }
  }, [timedShowStealthEffect, enemy.id])

  const spriteSize = HEX_SIZE * 0.6
  const enemyColor = ENEMY_LEVEL_COLORS[enemy.level] || ENEMY_DEFAULT_COLOR // Color based on current effective level
  const baseClasses = `sprite enemy-sprite ${enemyColor}`

  let visualClasses = ''
  let transitionClasses = ''

  if (!isFullySpawned) {
    visualClasses = hasStartedSpawningVisual ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
    transitionClasses = `transition-[opacity,transform] ease-out duration-[${SPAWN_ANIMATION_DURATION_MS}ms]`
  } else {
    visualClasses = 'scale-100 opacity-100'
    transitionClasses = `transition-[left,top,opacity] ease-in-out duration-[${ANIMATION_DURATION_MS}ms]`
  }

  let statusVisualClasses = ''
  if (enemy.isStunnedTurns > 0) {
    statusVisualClasses += 'opacity-50 ring-2 ring-yellow-300 '
  }

  const isJammedByGlobalEffect = activeGameBuffs.jammerFieldEffect.isActive
  const isLevelReduced = isJammedByGlobalEffect && enemy.level < enemy.originalLevel

  if (isJammedByGlobalEffect) {
    statusVisualClasses += 'enemy-sprite-jammed '
  }
  if (isLevelReduced) {
    statusVisualClasses += 'enemy-sprite-level-reduced '
  }

  let title = t('ENEMY_TOOLTIP_LEVEL', { level: enemy.level })
  if (enemy.isStunnedTurns > 0) {
    title += ` ${t('ENEMY_TOOLTIP_STUNNED', { turns: enemy.isStunnedTurns })}`
  }
  if (isJammedByGlobalEffect) {
    if (isLevelReduced) {
      title += ` ${t('ENEMY_TOOLTIP_LEVEL_REDUCED_BY_JAMMER', {
        reduction: activeGameBuffs.jammerFieldEffect.levelReductionAmount,
        turnsLeft: activeGameBuffs.jammerFieldEffect.turnsLeft,
        currentLevel: enemy.level,
        originalLevel: enemy.originalLevel,
      })}`
    } else {
      // Jammer active but this enemy might be at its min level (0) or already at original level
      title += ` ${t('ENEMY_TOOLTIP_JAMMED_NO_REDUCTION', {
        turnsLeft: activeGameBuffs.jammerFieldEffect.turnsLeft,
        currentLevel: enemy.level,
        originalLevel: enemy.originalLevel,
      })}`
    }
  }

  return (
    <div
      className={`${baseClasses} ${visualClasses} ${transitionClasses} ${statusVisualClasses.trim()}`}
      style={{
        width: `${spriteSize}px`,
        height: `${spriteSize}px`,
        left: `${pixelPos.x - spriteSize / 2}px`,
        top: `${pixelPos.y - spriteSize / 2}px`,
      }}
      title={title}
    >
      E{enemy.level}
      {enemy.isStunnedTurns > 0 && (
        <div
          className="absolute"
          style={{
            top: '-12px',
            right: '-12px',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
          aria-label={t('ENEMY_TOOLTIP_STUNNED', { turns: enemy.isStunnedTurns })}
        >
          <span className="absolute text-yellow-400 text-xl" style={{ filter: 'drop-shadow(0 0 1px black)' }}>
            ⭐
          </span>
          <span className="relative text-black text-[0.6rem] font-bold" style={{ lineHeight: '1' }}>
            {enemy.isStunnedTurns}
          </span>
        </div>
      )}
      {timedShowStealthEffect && (
        <span
          className="enemy-stealth-avoid-effect absolute -top-4 left-1/2 transform -translate-x-1/2 text-2xl text-yellow-300 font-bold"
          aria-hidden="true"
        >
          ?
        </span>
      )}
    </div>
  )
}
