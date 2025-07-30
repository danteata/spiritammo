import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Upload,
  FileText,
  BookOpen,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  Trash2,
  AlertCircle,
} from 'lucide-react-native'
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import {
  fileExtractionService,
  ExtractedDocument,
  ExtractionProgress,
} from '@/services/fileExtraction'

interface FileUploaderProps {
  isVisible: boolean
  onClose: () => void
  onVersesExtracted: (verses: any[]) => void
}

export default function FileUploader({
  isVisible,
  onClose,
  onVersesExtracted,
}: FileUploaderProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionProgress, setExtractionProgress] =
    useState<ExtractionProgress | null>(null)
  const [extractedDocuments, setExtractedDocuments] = useState<
    ExtractedDocument[]
  >([])
  const [selectedDocument, setSelectedDocument] =
    useState<ExtractedDocument | null>(null)
  const [selectedVerses, setSelectedVerses] = useState<string[]>([])

  React.useEffect(() => {
    if (isVisible) {
      loadExtractedDocuments()
    }
  }, [isVisible])

  const loadExtractedDocuments = () => {
    const docs = fileExtractionService.getExtractedDocuments()
    setExtractedDocuments(docs)
  }

  const handleFileUpload = async () => {
    setIsExtracting(true)
    setExtractionProgress(null)

    try {
      const result = await fileExtractionService.pickAndExtractFile(
        (progress) => {
          setExtractionProgress(progress)
        }
      )

      if (result) {
        loadExtractedDocuments()
        Alert.alert(
          'Extraction Complete!',
          `Successfully extracted ${result.totalVerses} verses from ${result.name}`,
          [{ text: 'OK' }]
        )
      }
    } catch (error) {
      Alert.alert('Extraction Failed', error.message)
    } finally {
      setIsExtracting(false)
      setExtractionProgress(null)
    }
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
    onVersesExtracted(scriptures)

    Alert.alert(
      'Import Successful!',
      `Imported ${scriptures.length} verses to your collection.`,
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
    if (confidence >= 80) return TACTICAL_THEME.success
    if (confidence >= 60) return TACTICAL_THEME.warning
    return TACTICAL_THEME.error
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'HIGH'
    if (confidence >= 60) return 'MEDIUM'
    return 'LOW'
  }

  const renderExtractionProgress = () => {
    if (!extractionProgress) return null

    return (
      <View style={styles.progressContainer}>
        <Text style={[styles.progressTitle, MILITARY_TYPOGRAPHY.subheading]}>
          EXTRACTION IN PROGRESS
        </Text>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${extractionProgress.progress}%` },
            ]}
          />
        </View>

        <Text style={[styles.progressText, MILITARY_TYPOGRAPHY.caption]}>
          {extractionProgress.message}
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

  const renderDocumentList = () => (
    <View style={styles.documentList}>
      <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
        EXTRACTED DOCUMENTS
      </Text>

      {extractedDocuments.length === 0 ? (
        <View style={styles.emptyState}>
          <FileText size={48} color={TACTICAL_THEME.textSecondary} />
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
                  <BookOpen size={20} color={TACTICAL_THEME.accent} />
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
                  <Trash2 size={16} color={TACTICAL_THEME.error} />
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
              <Download size={16} color={TACTICAL_THEME.text} />
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
                    <CheckCircle size={20} color={TACTICAL_THEME.success} />
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
        colors={[TACTICAL_THEME.background, '#0D0D0D']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XCircle size={24} color={TACTICAL_THEME.error} />
          </TouchableOpacity>

          <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]}>
            AMMUNITION SUPPLY
          </Text>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleFileUpload}
            disabled={isExtracting}
          >
            <Upload size={20} color={TACTICAL_THEME.text} />
            <Text style={[styles.uploadText, MILITARY_TYPOGRAPHY.caption]}>
              {isExtracting ? 'EXTRACTING...' : 'UPLOAD FILE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {isExtracting && renderExtractionProgress()}

          {!selectedDocument ? renderDocumentList() : renderVerseSelection()}
        </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    color: TACTICAL_THEME.text,
    flex: 1,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TACTICAL_THEME.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  uploadText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressContainer: {
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  progressTitle: {
    color: TACTICAL_THEME.text,
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: TACTICAL_THEME.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: TACTICAL_THEME.accent,
    borderRadius: 4,
  },
  progressText: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressDetail: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    color: TACTICAL_THEME.text,
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
    color: TACTICAL_THEME.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
  },
  documentScroll: {
    flex: 1,
  },
  documentCard: {
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
  },
  selectedDocument: {
    borderColor: TACTICAL_THEME.accent,
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
    color: TACTICAL_THEME.text,
    marginBottom: 4,
  },
  documentMeta: {
    color: TACTICAL_THEME.textSecondary,
  },
  deleteButton: {
    padding: 8,
  },
  extractedDate: {
    color: TACTICAL_THEME.textSecondary,
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
    backgroundColor: TACTICAL_THEME.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
    gap: 8,
  },
  importButton: {
    backgroundColor: TACTICAL_THEME.success,
    borderColor: TACTICAL_THEME.success,
  },
  actionText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  verseScroll: {
    flex: 1,
  },
  verseCard: {
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
  },
  selectedVerse: {
    borderColor: TACTICAL_THEME.success,
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
    color: TACTICAL_THEME.accent,
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
    borderColor: TACTICAL_THEME.border,
  },
  verseText: {
    color: TACTICAL_THEME.text,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: TACTICAL_THEME.secondary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backText: {
    color: TACTICAL_THEME.text,
  },
})
