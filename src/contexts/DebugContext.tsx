import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react'
import { LogEntry, SpawnLog, DefeatLog, InfoLog } from '../types/debug'
import { DEBUG_MODE as DEBUG_MODE_FROM_CONFIG } from '../constants' // Import the new constant

// Define Omit types for each log type specifically, as their payloads differ.
type AddSpawnLogData = Omit<SpawnLog, 'id' | 'timestamp'>
type AddDefeatLogData = Omit<DefeatLog, 'id' | 'timestamp'>
type AddInfoLogData = Omit<InfoLog, 'id' | 'timestamp'>

type AddLogInput = AddSpawnLogData | AddDefeatLogData | AddInfoLogData

interface DebugContextType {
  logs: LogEntry[]
  addLog: (logData: AddLogInput) => void
}

const DebugContext = createContext<DebugContextType | undefined>(undefined)

export const DebugProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = useCallback((logData: AddLogInput) => {
    const newLog: LogEntry = {
      ...logData,
      id: Date.now() + Math.random(), // Unique ID
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    } as LogEntry // Type assertion needed because logData is a union of Omit types

    setLogs((prevLogs) => [newLog, ...prevLogs.slice(0, 99)]) // Keep latest 100 logs
  }, [])

  const IS_DEBUG_MODE =
    DEBUG_MODE_FROM_CONFIG ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true')

  if (!IS_DEBUG_MODE) {
    return <>{children}</>
  }

  return <DebugContext.Provider value={{ logs, addLog }}>{children}</DebugContext.Provider>
}

export const useDebug = (): DebugContextType => {
  const context = useContext(DebugContext)
  if (context === undefined) {
    // If not in debug mode (provider returned null or context not available for other reasons)
    // return dummy functions to prevent errors when addLog is called.
    return { logs: [], addLog: () => {} }
  }
  return context
}
