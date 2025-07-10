export type LogType = 'SPAWN' | 'DEFEAT' | 'INFO'

// 各ログエントリの共通プロパティ
interface BaseLogEntry {
  id: number // ユニークID (Date.now() or a counter)
  timestamp: string // タイムスタンプ
  type: LogType
}

// スポーンイベントのログ
export interface SpawnLog extends BaseLogEntry {
  type: 'SPAWN'
  payload: {
    didSpawn: boolean
    enemyCount: number // Count BEFORE this spawn attempt
    targetEnemyCount: number
    enemyFillRatio: number // enemyCount / targetEnemyCount
    safeHexesCount: number
    totalHexesCount: number // For calculating safeTileRatio if needed, or just pass the ratio
    safeTileRatio: number // safeHexesCount / totalHexesCount
    spawnChance: number // Final probability
    randomNumber: number // The dice roll
    spawnedEnemyLevel?: number
    debugMessage?: string // Optional: for additional context like "max enemies capped"
  }
}

// 敵撃破イベントのログ
export interface DefeatLog extends BaseLogEntry {
  type: 'DEFEAT'
  payload: {
    enemyLevel: number
    baseScoreGained: number // Score from this enemy only
    comboCount: number // Current combo count AFTER this defeat
    currentComboBaseScore: number // Total base score for the current combo AFTER this defeat
    bonusScoreForThisKill: number // Bonus score awarded for THIS specific kill in the combo
  }
}

// 汎用情報ログ
export interface InfoLog extends BaseLogEntry {
  type: 'INFO'
  message: string
}

export type LogEntry = SpawnLog | DefeatLog | InfoLog
