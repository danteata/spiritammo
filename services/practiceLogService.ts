import { getDb } from '@/db/client'
import { initializeDatabase } from '@/db/init'
import { practiceLogs } from '@/db/schema'
const createLocalId = () =>
    `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`

export interface PracticeLogRequest {
    scriptureId: string
    accuracy: number
    duration?: number
    transcription?: string
}

export const practiceLogService = {
    async saveLog(request: PracticeLogRequest) {
        try {
            await initializeDatabase()
            const db = await getDb()
            if (!db) return false

            const newLog = {
                id: createLocalId(),
                scriptureId: request.scriptureId,
                date: new Date().toISOString(),
                accuracy: request.accuracy,
                duration: request.duration || 0,
                transcription: request.transcription || '',
            }

            await db.insert(practiceLogs).values(newLog)
            console.log('✅ Practice log saved:', newLog.id)
            return true
        } catch (error) {
            console.error('❌ Failed to save practice log:', error)
            return false
        }
    }
}
