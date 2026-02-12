import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CollectionDetailModal from '@/components/CollectionDetailModal';
import { useAppStore } from '@/hooks/useAppStore';
import { Collection } from '@/types/scripture';

// Mock the useAppStore hook
jest.mock('@/hooks/useAppStore', () => ({
    useAppStore: jest.fn(),
}));

// Mock the errorHandler
jest.mock('@/services/errorHandler', () => ({
    errorHandler: {
        confirm: jest.fn().mockResolvedValue(true),
        showSuccess: jest.fn(),
        handleError: jest.fn(),
    },
}));

describe('CollectionDetailModal - Delete Functionality', () => {
    const mockDeleteCollection = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock the store implementation
        (useAppStore as jest.Mock).mockReturnValue({
            getScripturesByCollection: jest.fn().mockReturnValue([]),
            updateCollection: jest.fn(),
            removeScriptureFromCollection: jest.fn(),
            bulkRemoveScripturesFromCollection: jest.fn(),
            deleteCollection: mockDeleteCollection.mockResolvedValue(true),
            isDark: false,
            theme: {
                surface: '#FFFFFF',
                border: '#E5E7EB',
                accent: '#F97316',
                success: '#10B981',
                warning: '#F59E0B',
                error: '#EF4444',
                text: '#1F2937',
                textSecondary: '#6B7280',
                accentContrastText: '#FFFFFF',
            },
            gradients: {},
        });
    });

    it('should show delete button for non-system collections', () => {
        const nonSystemCollection: Collection = {
            id: 'user-collection',
            name: 'My Collection',
            scriptures: [],
            isSystem: false,
        };

        const { getByTestId } = render(
            <CollectionDetailModal
                collection={nonSystemCollection}
                isVisible={true}
                onClose={mockOnClose}
            />
        );

        // The delete button should be present for non-system collections
        const deleteButton = getByTestId('delete-button');
        expect(deleteButton).toBeTruthy();
    });

    it('should not show delete button for system collections', () => {
        const systemCollection: Collection = {
            id: 'system-collection',
            name: 'System Collection',
            scriptures: [],
            isSystem: true,
        };

        const { queryByTestId } = render(
            <CollectionDetailModal
                collection={systemCollection}
                isVisible={true}
                onClose={mockOnClose}
            />
        );

        // The delete button should not be present for system collections
        const deleteButton = queryByTestId('delete-button');
        expect(deleteButton).toBeNull();
    });

    it('should call deleteCollection when delete button is pressed', async () => {
        const nonSystemCollection: Collection = {
            id: 'user-collection',
            name: 'My Collection',
            scriptures: [],
            isSystem: false,
        };

        const { getByTestId } = render(
            <CollectionDetailModal
                collection={nonSystemCollection}
                isVisible={true}
                onClose={mockOnClose}
            />
        );

        const deleteButton = getByTestId('delete-button');
        fireEvent.press(deleteButton);

        // Should call deleteCollection with the collection ID
        expect(mockDeleteCollection).toHaveBeenCalledWith('user-collection');
    });
});