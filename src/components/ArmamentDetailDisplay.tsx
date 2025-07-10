import React from 'react'
import {
  ArmamentName,
  GamePhase,
  ArmamentLevels,
  BoosterStats,
  StealthStats,
  EmpTrapStats,
  BarricadeStats,
  ShockwaveStats,
  JammerStats,
  ChargeFieldStats,
  CollectorDroneStats,
  CrashBombStats,
} from '../types'
import { ARMAMENT_STATS_GETTERS, ARMAMENT_ICONS } from '../constants'
import { useLanguage } from '../contexts/LanguageContext'

// Helper component to format descriptions with highlighted numbers
const FormattedDescription: React.FC<{ text: string }> = ({ text }) => {
  const splitRegex = new RegExp('(\\d+(?:\\.\\d+)?%?)', 'g')
  const parts = text.split(splitRegex)
  const numericPartTestRegex = new RegExp('^(\\d+(?:\\.\\d+)?%?)$')

  return (
    <>
      {parts.map((part, index) => {
        if (numericPartTestRegex.test(part)) {
          return (
            <span key={index} className="text-green-400 font-bold">
              {part}
            </span>
          )
        }
        return part
      })}
    </>
  )
}

interface ArmamentDetailDisplayProps {
  selectedArmament: ArmamentName | null
  gamePhase: GamePhase
  armamentLevels: ArmamentLevels
}

export const ArmamentDetailDisplay: React.FC<ArmamentDetailDisplayProps> = ({
  selectedArmament,
  gamePhase,
  armamentLevels,
}) => {
  const { t } = useLanguage()

  let armamentToShow: ArmamentName | null = selectedArmament
  // If a placement is in progress, force the detail display to show that armament
  if (!armamentToShow) {
    if (gamePhase === 'PlacingEmpTrap') armamentToShow = 'trap'
    else if (gamePhase === 'PlacingBarricade') armamentToShow = 'barricade'
    else if (gamePhase === 'PlacingChargeField') armamentToShow = 'charge_field'
    else if (gamePhase === 'PlacingCollectorDrone') armamentToShow = 'collector_drone'
  }

  if (!armamentToShow) {
    return (
      <div className="p-4 bg-gray-900/50 rounded-lg min-h-[88px] flex items-center justify-center text-gray-500 italic text-sm">
        {t('ARMAMENT_DETAIL_PLACEHOLDER')}
      </div>
    )
  }

  const level = armamentLevels[armamentToShow]
  if (level === 0) return null // Should not happen if selected, but for safety.

  const stats = ARMAMENT_STATS_GETTERS[armamentToShow](level)
  const armamentTitle = t(stats.titleKey)
  const specificDescParams: Record<string, string | number> = { cost: stats.energyCost, level: stats.level }

  // Populate description parameters based on armament type
  if (armamentToShow === 'booster') {
    const s = stats as BoosterStats
    specificDescParams.actionsGranted = s.actionsGranted
    specificDescParams.usesPerTurn = s.usesPerTurn
  }
  if (armamentToShow === 'stealth') {
    const s = stats as StealthStats
    specificDescParams.duration = s.duration
    specificDescParams.avoidanceChance = s.avoidanceChance
  }
  if (armamentToShow === 'trap') {
    const s = stats as EmpTrapStats
    specificDescParams.stunDuration = s.stunDuration
    specificDescParams.maxCharges = s.maxCharges
  }
  if (armamentToShow === 'barricade') {
    const s = stats as BarricadeStats
    specificDescParams.duration = s.duration
    specificDescParams.maxCharges = s.maxCharges
  }
  if (armamentToShow === 'shockwave') {
    const s = stats as ShockwaveStats
    specificDescParams.pushDistance = s.pushDistance
    specificDescParams.stunDuration = s.stunDuration
  }
  if (armamentToShow === 'jammer') {
    const s = stats as JammerStats
    specificDescParams.reduction = s.levelReduction
    specificDescParams.duration = s.duration
  }
  if (armamentToShow === 'charge_field') {
    const s = stats as ChargeFieldStats
    specificDescParams.radius = s.effectRadius
    specificDescParams.recovery = s.recoveryAmount
    specificDescParams.duration = s.duration
    specificDescParams.maxPlaced = s.maxPlaced
  }
  if (armamentToShow === 'collector_drone') {
    const s = stats as CollectorDroneStats
    specificDescParams.searchRadius = s.searchRadius
    specificDescParams.lifespan = s.lifespan
    specificDescParams.maxPlaced = s.maxPlaced
  }
  if (armamentToShow === 'crash_bomb') {
    const s = stats as CrashBombStats
    specificDescParams.initialCost = s.energyCost
    specificDescParams.maxHeat = s.maxHeat
    specificDescParams.coolingRatePerTurn = s.coolingRatePerTurn
  }

  const armamentDescription = t(stats.descriptionKey, specificDescParams)

  const isPlacementArmament = ['trap', 'barricade', 'charge_field', 'collector_drone'].includes(armamentToShow)
  const actionPromptKey = isPlacementArmament ? 'ARMAMENT_ACTION_PROMPT_PLACEMENT' : 'ARMAMENT_ACTION_PROMPT_INSTANT'

  return (
    <div className="p-3 bg-gray-900/50 rounded-lg min-h-[88px] text-gray-200 text-sm">
      <div className="flex items-start gap-3">
        <span className="text-4xl mt-1">{ARMAMENT_ICONS[armamentToShow]}</span>
        <div className="flex-grow">
          <h5 className="font-bold text-sky-300">
            {armamentTitle} (Lv.{level})
          </h5>
          <p className="text-xs leading-snug">
            <FormattedDescription text={armamentDescription} />
          </p>
          <p className="text-xs text-yellow-400 mt-1 italic">{t(actionPromptKey)}</p>
        </div>
      </div>
    </div>
  )
}
