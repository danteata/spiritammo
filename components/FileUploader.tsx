import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome } from '@expo/vector-icons';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors'
import {
  fileExtractionService,
  ExtractedDocument,
  ExtractionProgress,
} from '@/services/fileExtraction'
import CollectionSelector from './CollectionSelector'
import { Collection } from '@/types/scripture'
import { PDFExtractor } from './PDFExtractor';
import { useAppStore } from '@/hooks/useAppStore';

interface FileUploaderProps {
  isVisible: boolean
  onClose: () => void
  onVersesExtracted: (verses: any[], targetCollectionId?: string) => void
}

export default function FileUploader({
  isVisible,
  onClose,
  onVersesExtracted,
}: FileUploaderProps) {
  const { theme } = useAppStore()
  const styles = getStyles(theme)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionProgress, setExtractionProgress] =
    useState<ExtractionProgress | null>(null)
  const [militaryStatus, setMilitaryStatus] = useState('INITIALIZING...')
  const [extractedDocuments, setExtractedDocuments] = useState<
    ExtractedDocument[]
  >([])
  const [useInternalBible, setUseInternalBible] = useState(true)
  const [selectedDocument, setSelectedDocument] =
    useState<ExtractedDocument | null>(null)
  const [selectedVerses, setSelectedVerses] = useState<string[]>([])
  const [pdfFile, setPdfFile] = useState<{ uri: string; name: string; size: number } | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)

  React.useEffect(() => {
    if (isVisible) {
      loadExtractedDocuments()
    }
  }, [isVisible])

  const loadExtractedDocuments = () => {
    const docs = fileExtractionService.getExtractedDocuments()
    setExtractedDocuments(docs)
  }

  // Cycle military status messages during extraction
  useEffect(() => {
    let interval: any
    if (isExtracting && !extractionProgress) {
      const messages = [
        'ESTABLISHING SECURE UPLINK...',
        'SCANNING SECTOR ALPHA...',
        'DECRYPTING ENEMY INTEL...',
        'TRIANGULATING TARGETS...',
        'MOBILIZING RECON UNITS...',
      ]
      let i = 0
      interval = setInterval(() => {
        setMilitaryStatus(messages[i % messages.length])
        i++
      }, 1500)
    }
    return () => clearInterval(interval)
  }, [isExtracting, extractionProgress])

  const handleFileUpload = async () => {
    setIsExtracting(true)
    setExtractionProgress(null)

    try {
      const file = await fileExtractionService.pickFile()
      if (!file) {
        setIsExtracting(false)
        return
      }

      const fileType = fileExtractionService.getFileType(file.name, file.mimeType)

      if (fileType === 'pdf') {
        // Set PDF file to trigger WebView extraction
        setPdfFile({ uri: file.uri, name: file.name, size: file.size || 0 })
        // Extraction will continue in handleExtractionComplete
      } else {
        // Handle EPUB/TXT directly
        const text = await fileExtractionService.extractTextFromFile(
          file.uri,
          fileType,
          (progress) => setExtractionProgress(progress)
        )
        await processExtractedText(text, file.name, fileType, file.size || 0)
      }
    } catch (error) {
      Alert.alert('Extraction Failed', (error as any)?.message || String(error))
      setIsExtracting(false)
    }
  }

  const processExtractedText = async (
    text: string,
    name: string,
    type: 'pdf' | 'epub' | 'txt',
    size: number
  ) => {
    try {
      const result = await fileExtractionService.processExtractedText(
        text,
        name,
        type,
        size,
        (progress) => setExtractionProgress(progress),
        { useInternalBible }
      )

      loadExtractedDocuments()
      Alert.alert(
        'Extraction Complete!',
        `Successfully extracted ${result.totalVerses} verses from ${result.name}`,
        [{ text: 'OK' }]
      )
    } catch (error) {
      Alert.alert('Processing Failed', (error as any)?.message || String(error))
    } finally {
      setIsExtracting(false)
      setExtractionProgress(null)
      setPdfFile(null)
    }
  }

  const handlePdfExtractionComplete = (text: string) => {
    if (pdfFile) {
      processExtractedText(text, pdfFile.name, 'pdf', pdfFile.size)
    }
  }

  const handlePdfExtractionError = (error: string) => {
    Alert.alert('PDF Extraction Failed', error)
    setIsExtracting(false)
    setPdfFile(null)
  }

  const handleDocumentSelect = (document: ExtractedDocument) => {
    setSelectedDocument(document)
    setSelectedVerses([])
  }

  const handleVerseToggle = (verseId: string) => {
    setSelectedVerses((prev) =>
      prev.includes(verseId)
        ? prev.filter((id) => id !== verseId)
        : [...prev, verseId]
    )
  }

  const handleSelectAll = () => {
    if (!selectedDocument) return

    if (selectedVerses.length === selectedDocument.verses.length) {
      setSelectedVerses([])
    } else {
      setSelectedVerses(selectedDocument.verses.map((v) => v.id))
    }
  }

  const handleImportSelected = () => {
    if (!selectedDocument || selectedVerses.length === 0) {
      Alert.alert('No Verses Selected', 'Please select verses to import.')
      return
    }

    const scriptures = fileExtractionService.convertToScriptures(
      selectedDocument,
      selectedVerses
    )
    onVersesExtracted(scriptures, selectedCollection?.id)

    Alert.alert(
      'Import Successful!',
      `Imported ${scriptures.length} verses to ${selectedCollection ? selectedCollection.name : 'new arsenal'}.`,
      [{ text: 'OK', onPress: onClose }]
    )
  }

  const handleDeleteDocument = (documentId: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this extracted document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await fileExtractionService.deleteDocument(documentId)
            loadExtractedDocuments()
            if (selectedDocument?.id === documentId) {
              setSelectedDocument(null)
            }
          },
        },
      ]
    )
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return theme.success
    if (confidence >= 60) return theme.warning
    return theme.error
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'HIGH'
    if (confidence >= 60) return 'MEDIUM'
    return 'LOW'
  }

  const renderExtractionProgress = () => {
    if (!isExtracting) return null

    if (extractionProgress) {
      return (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.progressText, MILITARY_TYPOGRAPHY.body]}>
            {extractionProgress.message.toUpperCase()}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${extractionProgress.progress}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressPercent, MILITARY_TYPOGRAPHY.caption]}>
            {Math.round(extractionProgress.progress)}% COMPLETE
          </Text>
          {extractionProgress.currentVerse && extractionProgress.totalVerses && (
            <Text style={[styles.progressDetail, MILITARY_TYPOGRAPHY.caption]}>
              Processing verse {extractionProgress.currentVerse} of{' '}
              {extractionProgress.totalVerses}
            </Text>
          )}
        </View>
      )
    }

    return (
      <View style={styles.progressContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.progressText, MILITARY_TYPOGRAPHY.body]}>
          {militaryStatus}
        </Text>
      </View>
    )
  }

  const renderDocumentList = () => (
    <View style={styles.documentList}>
      <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
        EXTRACTED DOCUMENTS
      </Text>

      {extractedDocuments.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="file-text-o" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, MILITARY_TYPOGRAPHY.body]}>
            No documents extracted yet
          </Text>
          <Text style={[styles.emptySubtext, MILITARY_TYPOGRAPHY.caption]}>
            Upload a PDF, EPUB, or text file to get started
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.documentScroll}>
          {extractedDocuments.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={[
                styles.documentCard,
                selectedDocument?.id === doc.id && styles.selectedDocument,
              ]}
              onPress={() => handleDocumentSelect(doc)}
            >
              <View style={styles.documentHeader}>
                <View style={styles.documentInfo}>
                  <FontAwesome name="book" size={20} color={theme.accent} />
                  <View style={styles.documentDetails}>
                    <Text
                      style={[styles.documentName, MILITARY_TYPOGRAPHY.body]}
                    >
                      {doc.name}
                    </Text>
                    <Text
                      style={[styles.documentMeta, MILITARY_TYPOGRAPHY.caption]}
                    >
                      {doc.totalVerses} verses • {doc.type.toUpperCase()} •{' '}
                      {(doc.size / 1024).toFixed(1)}KB
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDocument(doc.id)}
                >
                  <FontAwesome name="trash" size={16} color={theme.error} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.extractedDate, MILITARY_TYPOGRAPHY.caption]}>
                Extracted: {new Date(doc.extractedAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )

  const renderVerseSelection = () => {
    if (!selectedDocument) return null

    return (
      <View style={styles.verseSelection}>
        <View style={styles.selectionHeader}>
          <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
            SELECT VERSES TO IMPORT
          </Text>

          <View style={{ marginBottom: 16 }}>
            <CollectionSelector
              selectedCollection={selectedCollection}
              onSelectCollection={setSelectedCollection}
            />
          </View>

          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSelectAll}
            >
              <Text style={[styles.actionText, MILITARY_TYPOGRAPHY.caption]}>
                {selectedVerses.length === selectedDocument.verses.length
                  ? 'DESELECT ALL'
                  : 'SELECT ALL'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.importButton]}
              onPress={handleImportSelected}
              disabled={selectedVerses.length === 0}
            >
              <FontAwesome name="download" size={16} color={theme.text} />
              <Text style={[styles.actionText, MILITARY_TYPOGRAPHY.caption]}>
                IMPORT ({selectedVerses.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.verseScroll}>
          {selectedDocument.verses.map((verse) => (
            <TouchableOpacity
              key={verse.id}
              style={[
                styles.verseCard,
                selectedVerses.includes(verse.id) && styles.selectedVerse,
              ]}
              onPress={() => handleVerseToggle(verse.id)}
            >
              <View style={styles.verseHeader}>
                <View style={styles.verseInfo}>
                  {verse.reference && (
                    <Text
                      style={[
                        styles.verseReference,
                        MILITARY_TYPOGRAPHY.caption,
                      ]}
                    >
                      {verse.reference}
                    </Text>
                  )}

                  <View style={styles.confidenceIndicator}>
                    <View
                      style={[
                        styles.confidenceDot,
                        {
                          backgroundColor: getConfidenceColor(verse.confidence),
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.confidenceText,
                        MILITARY_TYPOGRAPHY.caption,
                        { color: getConfidenceColor(verse.confidence) },
                      ]}
                    >
                      {getConfidenceLabel(verse.confidence)}
                    </Text>
                  </View>
                </View>

                <View style={styles.selectionIndicator}>
                  {selectedVerses.includes(verse.id) ? (
                    <FontAwesome name="check-circle" size={20} color={theme.success} />
                  ) : (
                    <View style={styles.unselectedCircle} />
                  )}
                </View>
              </View>

              <Text style={[styles.verseText, MILITARY_TYPOGRAPHY.body]}>
                {verse.text}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <LinearGradient
        colors={[theme.background, '#0D0D0D']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times-circle" size={24} color={theme.error} />
            </TouchableOpacity>

            <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]}>
              AMMUNITION SUPPLY
            </Text>

            {/* Placeholder to balance the close button */}
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.headerControls}>
            <View style={styles.toggleContainer}>
              <Text style={[styles.toggleLabel, MILITARY_TYPOGRAPHY.caption]}>SMART MATCH</Text>
              <Switch
                value={useInternalBible}
                onValueChange={setUseInternalBible}
                trackColor={{ false: theme.surface, true: theme.accent }}
                thumbColor={useInternalBible ? '#fff' : '#f4f3f4'}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleFileUpload}
              disabled={isExtracting}
            >
              <FontAwesome name="upload" size={20} color={theme.accentContrastText} />
              <Text style={[styles.uploadText, MILITARY_TYPOGRAPHY.caption, { color: theme.accentContrastText }]}>
                {isExtracting ? '...' : 'UPLOAD'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {isExtracting && renderExtractionProgress()}

          {!selectedDocument ? renderDocumentList() : renderVerseSelection()}
        </View>

        {/* Hidden PDF Extractor */}
        {pdfFile && (
          <PDFExtractor
            fileUri={pdfFile.uri}
            onExtractionComplete={handlePdfExtractionComplete}
            onError={handlePdfExtractionError}
          />
        )}

        {/* Back button when viewing verses */}
        {selectedDocument && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedDocument(null)}
          >
            <Text style={[styles.backText, MILITARY_TYPOGRAPHY.button]}>
              ← BACK TO DOCUMENTS
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Modal>
  )
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    color: theme.text,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    // Deprecated
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  toggleLabel: {
    color: theme.textSecondary,
    fontSize: 10,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  uploadText: {
    color: theme.text,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressContainer: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  progressTitle: {
    color: theme.text,
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: theme.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.accent,
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  progressPercent: {
    color: theme.text,
    textAlign: 'center',
    marginTop: 4,
  },
  progressDetail: {
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionTitle: {
    color: theme.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  documentList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: theme.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: theme.textSecondary,
    textAlign: 'center',
  },
  documentScroll: {
    flex: 1,
  },
  documentCard: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  selectedDocument: {
    borderColor: theme.accent,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    color: theme.text,
    marginBottom: 4,
  },
  documentMeta: {
    color: theme.textSecondary,
  },
  deleteButton: {
    padding: 8,
  },
  extractedDate: {
    color: theme.textSecondary,
  },
  verseSelection: {
    flex: 1,
  },
  selectionHeader: {
    marginBottom: 20,
  },
  selectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 8,
  },
  importButton: {
    backgroundColor: theme.success,
    borderColor: theme.success,
  },
  actionText: {
    color: theme.text,
    fontWeight: 'bold',
  },
  verseScroll: {
    flex: 1,
  },
  verseCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  selectedVerse: {
    borderColor: theme.success,
    backgroundColor: 'rgba(50, 205, 50, 0.1)',
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verseReference: {
    color: theme.accent,
    fontWeight: 'bold',
  },
  confidenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  selectionIndicator: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unselectedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.border,
  },
  verseText: {
    color: theme.text,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: theme.secondary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backText: {
    color: theme.text,
  },
})
