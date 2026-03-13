import { getDb } from '@/db/client'
import { practiceLogs } from '@/db/schema'
import { v4 as uuidv4 } from 'uuid'
// import 'react-native-get-random-values'

export interface PracticeLogRequest {
    scriptureId: string
    accuracy: number
    duration?: number
    transcription?: string
}

export const practiceLogService = {
    async saveLog(request: PracticeLogRequest) {
        try {
            const db = await getDb()
            if (!db) return false

            const newLog = {
                id: uuidv4(),
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
