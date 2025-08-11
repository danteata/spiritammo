// Enhanced file extraction service with better PDF/EPUB support
import { EnhancedFileExtractionService } from './enhancedFileExtraction'

// Re-export enhanced service as default
export { EnhancedFileExtractionService as FileExtractionService }
export * from './enhancedFileExtraction'

// Default export for backward compatibility
export default EnhancedFileExtractionService



