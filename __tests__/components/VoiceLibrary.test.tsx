import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { VoiceLibrary } from '@/components/VoiceLibrary'
import VoiceRecordingService from '@/services/voiceRecording'
import { VoiceRecording, VoiceRecordingStats } from '@/types/scripture'

// Mock the dependencies
jest.mock('@/services/voiceRecording')
jest.mock('@expo/vector-icons', () => {
    const { View, Text } = require('react-native')
    return {
        FontAwesome5: (props: any) => <View testID="mock-icon">{props.name}</View>
    }
})

const mockTheme = {
    accent: '#FFD700',
    text: '#000000',
    textSecondary: '#666666',
    border: '#CCCCCC'
}

describe('VoiceLibrary Component', () => {
    const mockRecordings: VoiceRecording[] = [
        {
            id: 'rec_1',
            scriptureId: 'john_3_16',
            scriptureRef: 'John 3:16',
            fileUri: '/test/recording1.m4a',
            accuracy: 95,
            timestamp: Date.now(),
            fileSize: 1000000,
            duration: 5.2,
            quality: 'standard',
            tags: ['high-accuracy']
        },
        {
            id: 'rec_2',
            scriptureId: 'psalm_23_1',
            scriptureRef: 'Psalm 23:1',
            fileUri: '/test/recording2.m4a',
            accuracy: 92,
            timestamp: Date.now() - 86400000, // Yesterday
            fileSize: 800000,
            duration: 4.5,
            quality: 'standard',
            tags: []
        }
    ]

    const mockStats: VoiceRecordingStats = {
        totalRecordings: 2,
        totalStorageUsed: 1800000,
        averageAccuracy: 93.5,
        recordingsByQuality: { standard: 2, high: 0, premium: 0 },
        oldestRecording: Date.now() - 86400000,
        newestRecording: Date.now()
    }

    beforeEach(() => {
        jest.clearAllMocks()

            // Mock the service methods
            ; (VoiceRecordingService.getAllRecordings as jest.Mock).mockResolvedValue(mockRecordings)
            ; (VoiceRecordingService.getStorageStats as jest.Mock).mockResolvedValue(mockStats)
            ; (VoiceRecordingService.playRecording as jest.Mock).mockResolvedValue({
                setOnPlaybackStatusUpdate: jest.fn()
            })
            ; (VoiceRecordingService.deleteRecording as jest.Mock).mockResolvedValue(true)
    })

    it('should render loading state initially', () => {
        ; (VoiceRecordingService.getAllRecordings as jest.Mock).mockImplementation(() => new Promise(() => { }))
            ; (VoiceRecordingService.getStorageStats as jest.Mock).mockImplementation(() => new Promise(() => { }))

        const { getByTestId } = render(
            <VoiceLibrary isDark={false} theme={mockTheme} />
        )

        expect(getByTestId('activity-indicator')).toBeTruthy()
    })

    it('should render empty state when no recordings exist', async () => {
        ; (VoiceRecordingService.getAllRecordings as jest.Mock).mockResolvedValue([])

        const { getByText, queryByTestId } = render(
            <VoiceLibrary isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            expect(queryByTestId('activity-indicator')).toBeNull()
            expect(getByText('No Voice Recordings')).toBeTruthy()
            expect(getByText('High-accuracy recordings (90%+) will be automatically saved here.')).toBeTruthy()
        })
    })

    it('should render recordings list with correct data', async () => {
        const { getByText, getAllByText } = render(
            <VoiceLibrary isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            // Check stats are displayed
            expect(getByText('2')).toBeTruthy() // Total recordings
            expect(getByText('1.8 MB')).toBeTruthy() // Total storage
            expect(getByText('94%')).toBeTruthy() // Average accuracy

            // Check recordings are displayed
            expect(getByText('John 3:16')).toBeTruthy()
            expect(getByText('Psalm 23:1')).toBeTruthy()
            expect(getAllByText('95% accuracy')).toHaveLength(1)
            expect(getByText('92% accuracy')).toBeTruthy()

            // Check high accuracy tag
            expect(getByText('HIGH ACCURACY')).toBeTruthy()
        })
    })

    it('should handle play recording button press', async () => {
        const { getAllByText } = render(
            <VoiceLibrary isDark={false} theme={mockTheme} />
        )

        await waitFor(async () => {
            const playButtons = getAllByText('PLAY')
            fireEvent.press(playButtons[0])

            expect(VoiceRecordingService.playRecording).toHaveBeenCalledWith(mockRecordings[0].fileUri)
        })
    })

    it('should handle delete recording with confirmation', async () => {
        const { getAllByText } = render(
            <VoiceLibrary isDark={false} theme={mockTheme} />
        )

        await waitFor(async () => {
            const deleteButtons = getAllByText('DELETE')
            fireEvent.press(deleteButtons[0])

            // Mock Alert.alert to capture the callback
            const Alert = require('react-native').Alert
            const alertMock = jest.spyOn(Alert, 'alert')

            // Simulate user confirming deletion
            const alertConfig = alertMock.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>
            const deleteButton = alertConfig.find((btn) => btn.text === 'Delete')
            if (deleteButton?.onPress) {
                await deleteButton.onPress()
            }

            expect(VoiceRecordingService.deleteRecording).toHaveBeenCalledWith(mockRecordings[0].id)
        })
    })

    it('should format file sizes correctly', async () => {
        const { getByText } = render(
            <VoiceLibrary isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            // Check file sizes are formatted
            expect(getByText('1000 KB')).toBeTruthy()
            expect(getByText('800 KB')).toBeTruthy()
        })
    })

    it('should format dates correctly', async () => {
        const { getByText } = render(
            <VoiceLibrary isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            // Dates should be formatted (exact format may vary by locale)
            const dateElements = getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)
            expect(dateElements).toBeTruthy()
        })
    })

    it('should handle errors gracefully', async () => {
        ; (VoiceRecordingService.getAllRecordings as jest.Mock).mockRejectedValue(new Error('Failed to load'))
            ; (VoiceRecordingService.getStorageStats as jest.Mock).mockRejectedValue(new Error('Failed to load'))

        const consoleError = jest.spyOn(console, 'error').mockImplementation()

        const { queryByTestId } = render(
            <VoiceLibrary isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            expect(queryByTestId('activity-indicator')).toBeNull()
            expect(consoleError).toHaveBeenCalled()
        })

        consoleError.mockRestore()
    })

    it('should toggle between play and pause states', async () => {
        const { getAllByText, getByText } = render(
            <VoiceLibrary isDark={false} theme={mockTheme} />
        )

        await waitFor(async () => {
            const playButtons = getAllByText('PLAY')
            fireEvent.press(playButtons[0])

            // Should now show PAUSE
            expect(getByText('PAUSE')).toBeTruthy()

            // Press again to pause
            const pauseButton = getByText('PAUSE')
            fireEvent.press(pauseButton)

            // Should show PLAY again
            const playButtonsAfterPause = getAllByText('PLAY')
            expect(playButtonsAfterPause).toHaveLength(2)
        })
    })

    it('should not contain VoicePlaybackToggle since it was moved to settings', async () => {
        const { queryByText } = render(
            <VoiceLibrary isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            // VoicePlaybackToggle should not be present in VoiceLibrary anymore
            expect(queryByText('USING MY VOICE')).toBeNull()
            expect(queryByText('USING TTS')).toBeNull()
            expect(queryByText('Playback your recorded voice')).toBeNull()
            expect(queryByText('Playback text-to-speech')).toBeNull()
        })
    })

    it('should show dark mode styles when isDark is true', async () => {
        const { getByTestId } = render(
            <VoiceLibrary isDark={true} theme={mockTheme} />
        )

        await waitFor(() => {
            const container = getByTestId('voice-library-container')
            // In dark mode, the component should render with appropriate styling
            expect(container).toBeTruthy()
        })
    })
})