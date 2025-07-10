import { useState, useCallback } from 'react'

export interface AIDebugControls {
  isAutoMoveActive: boolean
  toggleAutoMove: () => void
  isAiModeActive: boolean
  toggleAiMode: () => void
  isMctsAiModeActive: boolean
  toggleMctsAiMode: () => void
  mctsLookaheadDepth: number
  setMctsLookaheadDepth: (depth: number) => void
  mctsIterations: number
  setMctsIterations: (iterations: number) => void
}

export const useAIDebugManager = (): AIDebugControls => {
  const [isAutoMoveActive, setIsAutoMoveActive] = useState<boolean>(false)
  const [isAiModeActive, setIsAiModeActive] = useState<boolean>(false)
  const [isMctsAiModeActive, setIsMctsAiModeActive] = useState<boolean>(false)
  const [mctsLookaheadDepth, setMctsLookaheadDepthState] = useState<number>(3)
  const [mctsIterations, setMctsIterationsState] = useState<number>(1000)

  const toggleAutoMove = useCallback(() => {
    setIsAutoMoveActive((prev) => {
      if (!prev) {
        // Turning ON AutoMove
        setIsAiModeActive(false)
        setIsMctsAiModeActive(false)
      }
      return !prev
    })
  }, [])

  const toggleAiMode = useCallback(() => {
    setIsAiModeActive((prev) => {
      if (!prev) {
        // Turning ON Standard AI
        setIsAutoMoveActive(false)
        setIsMctsAiModeActive(false)
      }
      return !prev
    })
  }, [])

  const toggleMctsAiMode = useCallback(() => {
    setIsMctsAiModeActive((prev) => {
      if (!prev) {
        // Turning ON MCTS AI
        setIsAutoMoveActive(false)
        setIsAiModeActive(false)
      }
      return !prev
    })
  }, [])

  const setMctsLookaheadDepth = useCallback((depth: number) => {
    setMctsLookaheadDepthState(depth)
  }, [])

  const setMctsIterations = useCallback((iterations: number) => {
    setMctsIterationsState(Math.max(10, iterations))
  }, [])

  return {
    isAutoMoveActive,
    toggleAutoMove,
    isAiModeActive,
    toggleAiMode,
    isMctsAiModeActive,
    toggleMctsAiMode,
    mctsLookaheadDepth,
    setMctsLookaheadDepth,
    mctsIterations,
    setMctsIterations,
  }
}
