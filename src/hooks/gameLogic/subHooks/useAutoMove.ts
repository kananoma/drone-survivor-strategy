import { useEffect } from 'react'
import { GameLogicState } from '../../../gameLogic/initialState'
import { GamePhase, Hex } from '../../../types'
import { axialDistance } from '../../../utils/hexUtils'
import { AIDebugControls } from '../../useAIDebugManager'

const AI_MODE_DECISION_DELAY_MS = 250

interface UseAutoMoveProps {
  gameState: GameLogicState & AIDebugControls
  setGameState: React.Dispatch<React.SetStateAction<GameLogicState>>
  addMessage: (msgKey: string, params?: Record<string, string | number>) => void
  selectors: {
    movableHexIds: string[]
  }
  playerActions: {
    handlePlayerMove: (hex: Hex) => void
  }
}

export const useAutoMove = ({ gameState, setGameState, addMessage, selectors, playerActions }: UseAutoMoveProps) => {
  useEffect(() => {
    const {
      isAutoMoveActive,
      isAiModeActive,
      isMctsAiModeActive,
      gamePhase,
      player,
      playerActionsRemaining,
      enemies,
      hexes,
    } = gameState

    if (
      !isAutoMoveActive ||
      isAiModeActive ||
      isMctsAiModeActive ||
      gamePhase !== 'PlayerTurn' ||
      !player ||
      playerActionsRemaining <= 0
    ) {
      return
    }
    if (!selectors.movableHexIds || selectors.movableHexIds.length === 0) {
      if (isAutoMoveActive) {
        addMessage('MESSAGE_AUTO_MOVE_NO_SAFE_HEXES')
      }
      return
    }

    const { movableHexIds } = selectors

    const safeMovableHexes: Hex[] = []
    for (const hexId of movableHexIds) {
      const hex = hexes.get(hexId)
      if (hex && hex.dangerLevel === 0) {
        safeMovableHexes.push(hex)
      }
    }

    if (safeMovableHexes.length === 0) {
      addMessage('MESSAGE_AUTO_MOVE_NO_SAFE_HEXES')
      return
    }

    let targetHex: Hex
    if (safeMovableHexes.length === 1) {
      targetHex = safeMovableHexes[0]
    } else {
      const hexesWithDistances = safeMovableHexes.map((safeHex) => {
        let sumOfDistances = 0
        if (enemies.length > 0) {
          for (const enemy of enemies) {
            sumOfDistances += axialDistance(safeHex, enemy)
          }
        } else {
          sumOfDistances = Infinity
        }
        return { hex: safeHex, sumOfDistances }
      })

      let maxSumOfDistances = -1
      if (enemies.length > 0) {
        maxSumOfDistances = Math.max(...hexesWithDistances.map((h) => h.sumOfDistances))
      } else {
        maxSumOfDistances = Infinity
      }

      const bestHexes = hexesWithDistances.filter((h) => h.sumOfDistances === maxSumOfDistances).map((h) => h.hex)
      targetHex = bestHexes[Math.floor(Math.random() * bestHexes.length)]
    }

    const autoMoveTimer = setTimeout(() => {
      setGameState((prevGameLogicState) => {
        if (
          gameState.isAutoMoveActive &&
          !gameState.isAiModeActive &&
          !gameState.isMctsAiModeActive &&
          prevGameLogicState.gamePhase === 'PlayerTurn' &&
          prevGameLogicState.player &&
          prevGameLogicState.playerActionsRemaining > 0
        ) {
          playerActions.handlePlayerMove(targetHex)
        }
        return prevGameLogicState
      })
    }, AI_MODE_DECISION_DELAY_MS)

    return () => clearTimeout(autoMoveTimer)
  }, [gameState, selectors.movableHexIds, playerActions, addMessage, setGameState])
}
