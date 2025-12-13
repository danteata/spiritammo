import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { VoicePlaybackToggle } from '@/components/ui/VoicePlaybackToggle'
import VoicePlaybackService from '@/services/voicePlayback'

// Mock the dependencies
jest.mock('@/services/voicePlayback')
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

describe('VoicePlaybackToggle Component', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should render loading state initially', () => {
        ; (VoicePlaybackService.isUsingRecordedVoice as jest.Mock).mockImplementation(() => new Promise(() => { }))

        const { getByTestId } = render(
            <VoicePlaybackToggle isDark={false} theme={mockTheme} />
        )

        expect(getByTestId('activity-indicator')).toBeTruthy()
    })

    it('should render "USING MY VOICE" when recorded voice is enabled', async () => {
        ; (VoicePlaybackService.isUsingRecordedVoice as jest.Mock).mockResolvedValue(true)

        const { getByText } = render(
            <VoicePlaybackToggle isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            expect(getByText('USING MY VOICE')).toBeTruthy()
            expect(getByText('Playback your recorded voice')).toBeTruthy()
        })
    })

    it('should render "USING TTS" when TTS is enabled', async () => {
        ; (VoicePlaybackService.isUsingRecordedVoice as jest.Mock).mockResolvedValue(false)

        const { getByText } = render(
            <VoicePlaybackToggle isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            expect(getByText('USING TTS')).toBeTruthy()
            expect(getByText('Playback text-to-speech')).toBeTruthy()
        })
    })

    it('should toggle setting when button is pressed', async () => {
        ; (VoicePlaybackService.isUsingRecordedVoice as jest.Mock).mockResolvedValue(false)
            ; (VoicePlaybackService.toggleUseRecordedVoice as jest.Mock).mockResolvedValue(true)

        const { getByText } = render(
            <VoicePlaybackToggle isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            const toggleButton = getByText('USING TTS')
            fireEvent.press(toggleButton)

            expect(VoicePlaybackService.toggleUseRecordedVoice).toHaveBeenCalled()
        })
    })

    it('should handle toggle errors gracefully', async () => {
        ; (VoicePlaybackService.isUsingRecordedVoice as jest.Mock).mockResolvedValue(false)
            ; (VoicePlaybackService.toggleUseRecordedVoice as jest.Mock).mockRejectedValue(new Error('Toggle failed'))

        const consoleError = jest.spyOn(console, 'error').mockImplementation()

        const { getByText } = render(
            <VoicePlaybackToggle isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            const toggleButton = getByText('USING TTS')
            fireEvent.press(toggleButton)

            expect(consoleError).toHaveBeenCalled()
        })

        consoleError.mockRestore()
    })

    it('should show correct icons based on toggle state', async () => {
        ; (VoicePlaybackService.isUsingRecordedVoice as jest.Mock).mockResolvedValue(true)

        const { getByTestId } = render(
            <VoicePlaybackToggle isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            const icon = getByTestId('mock-icon')
            expect(icon.children[0]).toBe('microphone-alt')
        })

            // Test TTS state
            ; (VoicePlaybackService.isUsingRecordedVoice as jest.Mock).mockResolvedValue(false)

        const { getByTestId: getByTestId2 } = render(
            <VoicePlaybackToggle isDark={false} theme={mockTheme} />
        )

        await waitFor(() => {
            const icon = getByTestId2('mock-icon')
            expect(icon.children[0]).toBe('volume-up')
        })
    })

    it('should apply dark mode styles when isDark is true', async () => {
        ; (VoicePlaybackService.isUsingRecordedVoice as jest.Mock).mockResolvedValue(true)

        const { getByTestId } = render(
            <VoicePlaybackToggle isDark={true} theme={mockTheme} />
        )

        await waitFor(() => {
            const toggleButton = getByTestId('toggle-button')
            // In dark mode, the button should have appropriate styling
            expect(toggleButton).toBeTruthy()
        })
    })
})