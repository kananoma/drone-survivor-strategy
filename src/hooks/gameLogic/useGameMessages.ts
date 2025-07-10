import { useCallback } from 'react'
import { GameLogicState } from '../../gameLogic/initialState'
import { MESSAGE_LOG_MAX_MESSAGES } from '../../constants'

export const useGameMessages = (
  setGameState: React.Dispatch<React.SetStateAction<GameLogicState>>,
  t: (key: string, params?: Record<string, string | number>) => string
) => {
  const addMessage = useCallback(
    (msgKey: string, params?: Record<string, string | number>) => {
      const translatedMsg = t(msgKey, params)
      setGameState((prev) => ({
        ...prev,
        messages: [...prev.messages, translatedMsg].slice(-MESSAGE_LOG_MAX_MESSAGES),
      }))
    },
    [setGameState, t]
  )

  return { addMessage }
}
