import * as DocumentPicker from 'expo-document-picker'
// Use legacy import as suggested by error message for readAsStringAsync
import * as FileSystem from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Scripture } from '@/types/scripture'
import JSZip from 'jszip'
import { bibleApiService } from './bibleApi'

// ─── Public Types ──────────────────────────────────────────────────────────────

export interface ExtractedDocument {
  id: string
  name: string
  type: 'pdf' | 'epub' | 'txt'
  size: number
  extractedAt: Date
  totalVerses: number
  extractedText: string
  verses: ExtractedVerse[]
}

export interface ExtractedVerse {
  id: string
  text: string
  reference?: string
  book?: string
  chapter?: number
  verse?: number
  confidence: number
  source?: 'extracted' | 'internal_db'
  context?: string
  collectionChapter?: number
  collectionChapterName?: string
}

export interface ExtractionProgress {
  stage: 'reading' | 'parsing' | 'extracting' | 'analyzing' | 'complete'
  progress: number // 0-100
  message: string
  currentVerse?: number
  totalVerses?: number
}

// ─── Internal Types ────────────────────────────────────────────────────────────

/**
 * A TOC entry with its fragment preserved separately.
 * Used for fragment-aware HTML slicing when multiple TOC entries
 * share the same physical HTML file.
 */
interface TocEntry {
  name: string
  filePath: string       // resolved ZIP path, no fragment
  fragment: string | null
}

/**
 * A chapter extracted directly from HTML heading elements.
 * Used when the NCX/nav TOC is sparse (fewer entries than actual chapters).
 */
interface HtmlChapter {
  name: string
  text: string           // already stripped of HTML
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXTRACTED_DOCUMENTS_KEY = '@spiritammo_extracted_documents'

/**
 * CSS class name fragments that commonly mark chapter headings.
 * Matched case-insensitively against the class attribute.
 */
const HEADING_CLASS_PATTERNS = ['chapter', 'heading', 'title', 'swchapter', 'chaptertitle']

// ─── Service ──────────────────────────────────────────────────────────────────

class FileExtractionService {
  private documents: ExtractedDocument[] = []

  constructor() {
    this.loadExtractedDocuments()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATH / ZIP UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Resolve a relative href against a base directory, handling "../" traversal.
   * e.g. resolvePath("OEBPS/", "../Text/ch1.xhtml") → "Text/ch1.xhtml"
   */
  private resolvePath(basePath: string, relativePath: string): string {
    if (relativePath.startsWith('/')) relativePath = relativePath.slice(1)
    const parts = (basePath + relativePath).split('/')
    const resolved: string[] = []
    for (const part of parts) {
      if (part === '..') resolved.pop()
      else if (part !== '.' && part !== '') resolved.push(part)
    }
    return resolved.join('/')
  }

  /**
   * Locate a file in the ZIP with three fallback strategies:
   *   1. Exact path match
   *   2. Case-insensitive full path
   *   3. Filename-only match (last resort)
   */
  private findFileInZip(zip: JSZip, targetPath: string): JSZip.JSZipObject | null {
    const exact = zip.file(targetPath)
    if (exact) return exact

    const lowerTarget = targetPath.toLowerCase()
    let found: JSZip.JSZipObject | null = null

    zip.forEach((relativePath, file) => {
      if (!found && relativePath.toLowerCase() === lowerTarget) found = file
    })
    if (found) return found

    const fileName = targetPath.split('/').pop()?.toLowerCase()
    if (fileName) {
      zip.forEach((relativePath, file) => {
        if (!found && relativePath.toLowerCase().endsWith('/' + fileName)) found = file
      })
    }
    return found
  }

  /**
   * Parse OPF manifest items regardless of attribute order.
   */
  private parseManifest(opfContent: string): Record<string, { href: string; mediaType: string }> {
    const items: Record<string, { href: string; mediaType: string }> = {}
    const re = /<item([^>]+?)(?:\/>|>[\s\S]*?<\/item>)/g
    let m
    while ((m = re.exec(opfContent)) !== null) {
      const attrs = m[1] || ''
      const id = attrs.match(/\bid="([^"]+)"/)
      const href = attrs.match(/\bhref="([^"]+)"/)
      const mt = attrs.match(/\bmedia-type="([^"]+)"/)
      if (id && href) items[id[1]] = { href: href[1], mediaType: mt ? mt[1] : '' }
    }
    return items
  }

  /** Extract spine idref list from OPF. */
  private parseSpine(opfContent: string): string[] {
    const ids: string[] = []
    const re = /<itemref[^>]*idref="([^"]+)"/g
    let m
    while ((m = re.exec(opfContent)) !== null) ids.push(m[1])
    return ids
  }

  /**
   * Strip HTML tags, styles, scripts, and decode common entities.
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FRAGMENT-AWARE HTML SLICING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Slice raw HTML between two fragment anchors.
   *
   * When multiple TOC entries share one physical HTML file and are distinguished
   * only by #fragment, this extracts exactly the portion belonging to one chapter.
   *
   * @param html         Full raw HTML of the file
   * @param fragment     Start anchor (null = start of file)
   * @param nextFragment End anchor in the SAME file (null = end of file)
   */
  private sliceHtmlByFragment(
    html: string,
    fragment: string | null,
    nextFragment: string | null
  ): string {
    if (!fragment) {
      if (!nextFragment) return html
      const end = this.findFragmentPosition(html, nextFragment)
      return end !== -1 ? html.slice(0, end) : html
    }

    const start = this.findFragmentPosition(html, fragment)
    if (start === -1) {
      console.warn(`[EPUB] Fragment #${fragment} not found, using full file`)
      return html
    }

    if (!nextFragment) return html.slice(start)

    const end = this.findFragmentPosition(html, nextFragment)
    return end !== -1 && end > start ? html.slice(start, end) : html.slice(start)
  }

  /**
   * Find the character position of a fragment anchor (id="x" or name="x").
   */
  private findFragmentPosition(html: string, fragment: string): number {
    const esc = this.escapeRegex(fragment)
    const idMatch = new RegExp(`id=["']${esc}["']`).exec(html)
    if (idMatch) return idMatch.index
    const nameMatch = new RegExp(`name=["']${esc}["']`).exec(html)
    if (nameMatch) return nameMatch.index
    return -1
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HTML HEADING-BASED CHAPTER DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Split a raw HTML file into chapters using structural heading elements.
   *
   * This is the key fallback for EPUBs whose NCX/nav has far fewer entries
   * than the actual chapter count (e.g. only "Part I" and "Part V" in the NCX
   * for a 47-chapter book). We detect chapters by:
   *
   *   1. Real <h1>–<h4> tags
   *   2. <p> elements whose class contains a heading keyword
   *      (chapter, heading, title, swchapter, chaptertitle)
   *
   * Returns one HtmlChapter per detected heading, containing only the text
   * from that heading down to the next heading.
   */
  private splitHtmlByHeadings(html: string): HtmlChapter[] {
    // Build a combined pattern: h1-h4 tags OR class-based paragraph headings
    const classAlts = HEADING_CLASS_PATTERNS.join('|')
    const headingRe = new RegExp(
      `(<(?:h[1-4])[^>]*>[\\s\\S]*?</(?:h[1-4])>|<p[^>]*class="[^"]*(?:${classAlts})[^"]*"[^>]*>[\\s\\S]*?</p>)`,
      'gi'
    )

    const matches: Array<{ index: number; headingHtml: string }> = []
    let m: RegExpExecArray | null

    while ((m = headingRe.exec(html)) !== null) {
      matches.push({ index: m.index, headingHtml: m[1] })
    }

    if (matches.length === 0) return []

    const chapters: HtmlChapter[] = []

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index
      const end = i + 1 < matches.length ? matches[i + 1].index : html.length

      const chapterHtml = html.slice(start, end)
      const headingText = this.stripHtml(matches[i].headingHtml).trim()
      const chapterText = this.stripHtml(chapterHtml)

      if (chapterText.length > 30) {
        chapters.push({ name: headingText, text: chapterText })
      }
    }

    return chapters
  }

  /**
   * Determine whether a TOC is "sparse" relative to the content it indexes.
   *
   * A TOC is considered sparse when:
   *   - It has fewer than MIN_TOC_ENTRIES entries, OR
   *   - The number of headings detectable in the HTML content is significantly
   *     larger than the number of TOC entries (ratio > SPARSE_RATIO)
   *
   * When sparse, we fall back to heading-based splitting for that file.
   */
  private isTocSparse(tocEntries: TocEntry[], totalHtmlHeadings: number): boolean {
    const MIN_TOC_ENTRIES = 3
    const SPARSE_RATIO = 2.0   // HTML has 2× more chapters than TOC → sparse

    if (tocEntries.length < MIN_TOC_ENTRIES) return true
    if (totalHtmlHeadings > tocEntries.length * SPARSE_RATIO) return true
    return false
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STORAGE
  // ═══════════════════════════════════════════════════════════════════════════

  private async loadExtractedDocuments() {
    try {
      const stored = await AsyncStorage.getItem(EXTRACTED_DOCUMENTS_KEY)
      if (stored) this.documents = JSON.parse(stored)
    } catch (error) {
      console.error('Failed to load extracted documents:', error)
    }
  }

  private async saveExtractedDocuments() {
    try {
      await AsyncStorage.setItem(EXTRACTED_DOCUMENTS_KEY, JSON.stringify(this.documents))
    } catch (error) {
      console.error('Failed to save extracted documents:', error)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  async pickFile(): Promise<{ uri: string; name: string; size?: number; mimeType?: string } | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip', 'text/plain'],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return null
      const asset = result.assets?.[0]
      if (!asset) return null
      return { uri: asset.uri, name: asset.name, size: asset.size, mimeType: asset.mimeType }
    } catch (error) {
      console.error('Failed to pick file:', error)
      return null
    }
  }

  async extractTextFromFile(
    uri: string,
    fileType: 'epub' | 'txt',
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<string> {
    if (fileType === 'txt') return await FileSystem.readAsStringAsync(uri)
    if (fileType === 'epub') return await this.extractFromEPUB(uri, onProgress)
    return ''
  }

  async processExtractedText(
    text: string,
    fileName: string,
    fileType: 'pdf' | 'epub' | 'txt',
    fileSize: number,
    onProgress?: (progress: ExtractionProgress) => void,
    options: { useInternalBible: boolean; fileUri?: string } = { useInternalBible: true }
  ): Promise<ExtractedDocument> {
    try {
      onProgress?.({ stage: 'extracting', progress: 70, message: 'DEPLOYING RECONNAISSANCE UNITS...' })

      const verses = await this.extractVerses(
        text, onProgress, options.useInternalBible, fileName, options.fileUri
      )

      onProgress?.({ stage: 'analyzing', progress: 90, message: 'ANALYZING INTEL...' })

      const extractedDoc: ExtractedDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name: fileName,
        type: fileType,
        size: fileSize,
        extractedAt: new Date(),
        totalVerses: verses.length,
        extractedText: text,
        verses,
      }

      this.documents.push(extractedDoc)
      await this.saveExtractedDocuments()

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `MISSION ACCOMPLISHED: ${verses.length} TARGETS SECURED`,
        totalVerses: verses.length,
      })

      return extractedDoc
    } catch (error) {
      console.error('Processing error:', error)
      throw error
    }
  }

  // Deprecated
  async pickAndExtractFile(
    _onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractedDocument | null> {
    throw new Error('Use pickFile and processExtractedText instead')
  }

  getFileType(fileName: string, mimeType?: string): 'pdf' | 'epub' | 'txt' {
    const ext = fileName.toLowerCase().split('.').pop()
    if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf'
    if (ext === 'epub' || mimeType === 'application/epub+zip') return 'epub'
    return 'txt'
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EPUB: FLAT TEXT EXTRACTION  (used by extractTextFromFile)
  // ═══════════════════════════════════════════════════════════════════════════

  private async extractFromEPUB(
    uri: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<string> {
    onProgress?.({ stage: 'reading', progress: 40, message: 'BREACHING EPUB PERIMETER...' })

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
      onProgress?.({ stage: 'parsing', progress: 50, message: 'DECODING ENCRYPTED DATA...' })

      const zip = await JSZip.loadAsync(base64, { base64: true })
      const { opfContent, opfDir } = await this.loadOpf(zip)
      const manifest = this.parseManifest(opfContent)
      const spineIds = this.parseSpine(opfContent)

      let fullText = ''
      let done = 0

      onProgress?.({ stage: 'extracting', progress: 60, message: 'EXTRACTING INTEL FROM SECTORS...' })

      for (const id of spineIds) {
        const href = manifest[id]?.href
        if (href) {
          const path = this.resolvePath(opfDir, href)
          const raw = await this.findFileInZip(zip, path)?.async('string')
          if (raw) fullText += this.stripHtml(raw) + '\n\n'
        }
        done++
        if (done % 5 === 0) {
          onProgress?.({
            stage: 'extracting',
            progress: 60 + Math.floor((done / spineIds.length) * 20),
            message: `SECTOR SCAN: ${done}/${spineIds.length} CLEARED`,
          })
        }
      }

      return fullText
    } catch (error) {
      console.error('EPUB extraction error:', error)
      throw new Error(`Failed to parse EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EPUB: OPF LOADER
  // ═══════════════════════════════════════════════════════════════════════════

  private async loadOpf(zip: JSZip): Promise<{ opfContent: string; opfDir: string; opfPath: string }> {
    const containerXml = await this.findFileInZip(zip, 'META-INF/container.xml')?.async('string')
    if (!containerXml) throw new Error('Invalid EPUB: Missing container.xml')

    const opfPath = containerXml.match(/full-path="([^"]+)"/)
    if (!opfPath?.[1]) throw new Error('Invalid EPUB: Could not find OPF path')

    const opfContent = await this.findFileInZip(zip, opfPath[1])?.async('string')
    if (!opfContent) throw new Error('Invalid EPUB: Missing OPF file')

    const opfDir = opfPath[1].includes('/')
      ? opfPath[1].substring(0, opfPath[1].lastIndexOf('/') + 1)
      : ''

    return { opfContent, opfDir, opfPath: opfPath[1] }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EPUB: CHAPTER EXTRACTION  (main pipeline)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract chapter-labelled verses from an EPUB using a three-tier strategy:
   *
   * TIER 1 — Fragment-aware TOC (NCX / nav.xhtml) splitting
   *   Works when the TOC is complete and chapters are delimited by #fragment
   *   anchors inside shared HTML files.
   *
   * TIER 2 — HTML heading detection (sparse TOC fallback)
   *   Works when the TOC has far fewer entries than the actual chapter count
   *   (e.g. the TOC only lists Parts, not individual chapters). We scan each
   *   HTML file for <h1>–<h4> or class-based heading elements and split there.
   *
   * TIER 3 — Whole-spine fallback
   *   When neither a TOC nor headings are found, each spine file is treated as
   *   one chapter.
   */
  private async extractChaptersFromEPUB(uri: string): Promise<ExtractedVerse[]> {
    const allVerses: ExtractedVerse[] = []

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
      const zip = await JSZip.loadAsync(base64, { base64: true })
      const { opfContent, opfDir } = await this.loadOpf(zip)
      const manifest = this.parseManifest(opfContent)
      const spineIds = this.parseSpine(opfContent)

      // ── Resolve TOC ────────────────────────────────────────────────────────

      let tocEntries: TocEntry[] = []

      const ncxMatch = opfContent.match(
        /<item[^>]*media-type="application\/x-dtbncx\+xml"[^>]*href="([^"]+)"|<item[^>]*href="([^"]+)"[^>]*media-type="application\/x-dtbncx\+xml"/
      )
      if (ncxMatch) {
        const ncxPath = this.resolvePath(opfDir, ncxMatch[1] || ncxMatch[2])
        tocEntries = await this.parseTocNcx(zip, ncxPath, opfDir)
      }

      if (tocEntries.length === 0) {
        const navMatch = opfContent.match(
          /<item[^>]*properties="[^"]*\bnav\b[^"]*"[^>]*href="([^"]+)"|<item[^>]*href="([^"]+)"[^>]*properties="[^"]*\bnav\b[^"]*"/
        )
        if (navMatch) {
          const navPath = this.resolvePath(opfDir, navMatch[1] || navMatch[2])
          tocEntries = await this.parseTocNav(zip, navPath, opfDir)
        }
      }

      // Deduplicate TOC entries with identical filePath+fragment
      const seenTocKeys = new Set<string>()
      tocEntries = tocEntries.filter((e) => {
        const key = `${e.filePath}#${e.fragment ?? ''}`
        if (seenTocKeys.has(key)) return false
        seenTocKeys.add(key)
        return true
      })

      // ── Pre-load all spine HTML files (raw, unstripped) ───────────────────

      const rawHtmlCache = new Map<string, string>()   // resolvedPath → raw HTML

      for (const id of spineIds) {
        const item = manifest[id]
        if (!item) continue
        const path = this.resolvePath(opfDir, item.href)
        if (!rawHtmlCache.has(path)) {
          const raw = await this.findFileInZip(zip, path)?.async('string')
          if (raw) rawHtmlCache.set(path, raw)
        }
      }

      // ── Count total HTML headings across all spine files ──────────────────
      // Used to decide whether the TOC is sparse.

      let totalHtmlHeadings = 0
      for (const raw of rawHtmlCache.values()) {
        totalHtmlHeadings += this.splitHtmlByHeadings(raw).length
      }

      console.log(`📖 TOC entries: ${tocEntries.length} | HTML headings: ${totalHtmlHeadings}`)

      // ── TIER 1: Fragment-aware TOC splitting ──────────────────────────────

      if (tocEntries.length > 0 && !this.isTocSparse(tocEntries, totalHtmlHeadings)) {
        console.log('📖 TIER 1: Using complete TOC with fragment-aware splitting')

        for (let i = 0; i < tocEntries.length; i++) {
          const entry = tocEntries[i]
          const rawHtml = rawHtmlCache.get(entry.filePath)
          if (!rawHtml) continue

          // When the next TOC entry is in the same file, slice up to its fragment
          let nextFrag: string | null = null
          if (i + 1 < tocEntries.length && tocEntries[i + 1].filePath === entry.filePath) {
            nextFrag = tocEntries[i + 1].fragment
          }

          const sliced = this.sliceHtmlByFragment(rawHtml, entry.fragment, nextFrag)
          const text = this.stripHtml(sliced)

          if (text.length < 50 || !this.isActualChapter(entry.name, i + 1)) continue

          const chapterNum = this.extractChapterNumber(entry.name, i + 1)
          allVerses.push(
            ...await this.extractVersesFromChapterText(text, chapterNum, uri, entry.name)
          )
        }

        // ── TIER 2: HTML heading-based splitting (sparse TOC) ─────────────────

      } else if (totalHtmlHeadings > 0) {
        console.log('📖 TIER 2: Sparse/missing TOC — using HTML heading detection')

        let globalChapterIndex = 0

        for (const [, rawHtml] of rawHtmlCache) {
          const htmlChapters = this.splitHtmlByHeadings(rawHtml)

          if (htmlChapters.length === 0) {
            // File has no detectable headings — treat as one unlabelled chapter
            const text = this.stripHtml(rawHtml)
            if (text.length > 100) {
              globalChapterIndex++
              allVerses.push(
                ...await this.extractVersesFromChapterText(text, globalChapterIndex, uri)
              )
            }
            continue
          }

          for (const chapter of htmlChapters) {
            globalChapterIndex++
            if (!this.isActualChapter(chapter.name, globalChapterIndex)) continue

            const chapterNum = this.extractChapterNumber(chapter.name, globalChapterIndex)
            allVerses.push(
              ...await this.extractVersesFromChapterText(chapter.text, chapterNum, uri, chapter.name)
            )
          }
        }

        // ── TIER 3: Whole spine files (last resort) ───────────────────────────

      } else {
        console.log('📖 TIER 3: No TOC or headings — treating each spine file as one chapter')

        let chapterNum = 0
        for (const [, rawHtml] of rawHtmlCache) {
          const text = this.stripHtml(rawHtml)
          if (text.length > 100) {
            chapterNum++
            allVerses.push(
              ...await this.extractVersesFromChapterText(text, chapterNum, uri)
            )
          }
        }
      }

      console.log(`📖 Extracted ${allVerses.length} verses from EPUB`)
      return allVerses

    } catch (error) {
      console.error('EPUB chapter extraction error:', error)
      return []
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOC PARSERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Parse EPUB2 toc.ncx into TocEntry[], preserving fragments.
   */
  private async parseTocNcx(
    zip: JSZip,
    ncxPath: string,
    opfDir: string
  ): Promise<TocEntry[]> {
    const entries: TocEntry[] = []
    try {
      const ncx = await this.findFileInZip(zip, ncxPath)?.async('string')
      if (!ncx) return entries

      const ncxDir = ncxPath.includes('/') ? ncxPath.substring(0, ncxPath.lastIndexOf('/') + 1) : ''
      const navPointRe = /<navPoint[^>]*>([\s\S]*?)<\/navPoint>/g
      let m

      while ((m = navPointRe.exec(ncx)) !== null) {
        const body = m[1]
        const label = body.match(/<text[^>]*>([\s\S]*?)<\/text>/)
        const src = body.match(/<content[^>]*src="([^"]+)"/)
        if (!label || !src) continue

        const name = label[1].replace(/<[^>]+>/g, '').trim()
        const rawSrc = src[1]
        const hash = rawSrc.indexOf('#')
        const hrefPart = hash !== -1 ? rawSrc.slice(0, hash) : rawSrc
        const fragment = hash !== -1 ? rawSrc.slice(hash + 1) : null

        entries.push({ name, filePath: this.resolvePath(ncxDir, hrefPart), fragment })
      }

      console.log(`📚 NCX: ${entries.length} entries`)
    } catch (error) {
      console.error('NCX parsing error:', error)
    }
    return entries
  }

  /**
   * Parse EPUB3 nav.xhtml into TocEntry[], preserving fragments.
   */
  private async parseTocNav(
    zip: JSZip,
    navPath: string,
    opfDir: string
  ): Promise<TocEntry[]> {
    const entries: TocEntry[] = []
    try {
      const nav = await this.findFileInZip(zip, navPath)?.async('string')
      if (!nav) return entries

      const navDir = navPath.includes('/') ? navPath.substring(0, navPath.lastIndexOf('/') + 1) : ''
      const linkRe = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
      let m

      while ((m = linkRe.exec(nav)) !== null) {
        const rawHref = m[1]
        const name = m[2].replace(/<[^>]+>/g, '').trim()
        if (!name || !rawHref) continue

        const hash = rawHref.indexOf('#')
        const hrefPart = hash !== -1 ? rawHref.slice(0, hash) : rawHref
        const fragment = hash !== -1 ? rawHref.slice(hash + 1) : null

        entries.push({ name, filePath: this.resolvePath(navDir, hrefPart), fragment })
      }

      console.log(`📚 Nav: ${entries.length} entries`)
    } catch (error) {
      console.error('Nav parsing error:', error)
    }
    return entries
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSE EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════════

  private async extractVersesFromChapterText(
    text: string,
    chapterNum: number,
    fileUri: string,
    chapterName?: string
  ): Promise<ExtractedVerse[]> {
    const verses: ExtractedVerse[] = []
    const seen = new Set<string>()

    const patterns = [
      /([1-3]?\s*[A-Za-z]+)\s+(\d+):(\d+)/g,
      /([1-3]?\s*[A-Za-z]+)\s+(\d+)\.(\d+)/g,
    ]

    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const book = (match[1] || '').toString()
        const chapter = parseInt(match[2]) || 0
        const verseNum = parseInt(match[3]) || 0

        if (!this.isKnownBibleBook(book)) continue

        const key = `${book.toLowerCase().trim()}_${chapter}_${verseNum}`
        if (seen.has(key)) continue
        seen.add(key)

        let finalText = ''
        let confidence = 50
        let source: 'extracted' | 'internal_db' = 'extracted'

        try {
          await bibleApiService.waitForInitialization()
          const internal = await bibleApiService.getVerse(book, chapter, verseNum)
          if (internal) { finalText = internal.text; confidence = 100; source = 'internal_db' }
        } catch {
          console.log(`[SmartMatch] Not found: ${book} ${chapter}:${verseNum}`)
        }

        verses.push({
          id: Math.random().toString(36).substr(2, 9),
          reference: `${book} ${chapter}:${verseNum}`,
          text: finalText,
          book, chapter, verse: verseNum,
          confidence, source,
          context: text.substring(0, 200),
          collectionChapter: chapterNum,
          collectionChapterName: chapterName,
        })
      }
    }

    return verses
  }

  private async extractVerses(
    text: string,
    onProgress?: (progress: ExtractionProgress) => void,
    useInternalBible: boolean = true,
    fileName?: string,
    fileUri?: string
  ): Promise<ExtractedVerse[]> {
    // EPUB: always use chapter-based extraction
    if (fileUri && fileUri.toLowerCase().endsWith('.epub')) {
      console.log('📖 EPUB detected — using chapter extraction pipeline')
      const chapters = await this.extractChaptersFromEPUB(fileUri)
      if (chapters.length > 0) return chapters
    }

    // Non-EPUB: pattern-based extraction
    const verses: ExtractedVerse[] = []
    const patterns = useInternalBible
      ? [/([1-3]?\s*[A-Za-z]+)\s+(\d+):(\d+)/g, /([1-3]?\s*[A-Za-z]+)\s+(\d+)\.(\d+)/g]
      : [
        /([1-3]?\s*[A-Za-z]+)\s+(\d+):(\d+)[\s\-–—]*([^.!?]*[.!?])/g,
        /([1-3]?\s*[A-Za-z]+)\s+(\d+)\.(\d+)[\s\-–—]*([^.!?]*[.!?])/g,
        /"([^"]+)"\s*[-–—]\s*([1-3]?\s*[A-Za-z]+)\s+(\d+):(\d+)/g,
      ]

    let totalMatches = 0
    let done = 0
    const seen = new Set<string>()
    const key = (b: string, c: number, v: number) => `${b.toLowerCase().trim()}_${c}_${v}`

    for (const p of patterns) totalMatches += Array.from(text.matchAll(p)).length
    onProgress?.({ stage: 'extracting', progress: 75, message: `TARGETS IDENTIFIED: ${totalMatches} POTENTIAL VERSES`, totalVerses: totalMatches })

    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        done++
        let book = '', chapter = 0, verseNum = 0, verseText = ''

        if (!useInternalBible && pattern.toString().includes('"([^"]+)"')) {
          verseText = match[1] || ''; book = (match[2] || '').toString()
          chapter = parseInt(match[3]) || 0; verseNum = parseInt(match[4]) || 0
        } else {
          book = (match[1] || '').toString(); chapter = parseInt(match[2]) || 0
          verseNum = parseInt(match[3]) || 0; verseText = match[4] || ''
        }

        const clean = (verseText || '').replace(/^\s*[-–—"']\s*/, '').replace(/\s*[-–—"']\s*$/, '').trim()

        if (useInternalBible || (clean.length > 10 && clean.length < 500)) {
          let finalText = clean
          let confidence = this.calculateConfidence(clean, book)
          let source: 'extracted' | 'internal_db' = 'extracted'

          if (useInternalBible && book && chapter && verseNum) {
            await bibleApiService.waitForInitialization()
            let v = await bibleApiService.getVerse(book, chapter, verseNum)
            if (!v) {
              const nb = await bibleApiService.normalizeBookName(book)
              v = await bibleApiService.getVerse(nb, chapter, verseNum)
            }
            if (v) { finalText = v.text; confidence = 100; source = 'internal_db' }
          }

          if (this.isKnownBibleBook(book)) {
            const k = key(book, chapter, verseNum)
            if (seen.has(k)) continue
            seen.add(k)
            verses.push({
              id: Math.random().toString(36).substr(2, 9),
              reference: `${book} ${chapter}:${verseNum}`,
              text: finalText, book, chapter, verse: verseNum,
              confidence, source,
              context: this.extractContext(text, match.index || 0, 100),
            })
          }
        }

        if (totalMatches > 0 && done % 10 === 0) {
          onProgress?.({
            stage: 'extracting',
            progress: Math.min(90, Math.round(75 + (done / totalMatches) * 15)),
            message: `PROCESSING INTEL: ${done}/${totalMatches} TARGETS`,
            currentVerse: done, totalVerses: totalMatches,
          })
        }
      }
    }

    if (verses.length === 0) {
      text.split(/[.!?]+/).filter(s => s.trim().length > 20).forEach((sentence, i) => {
        if (this.looksLikeVerse(sentence)) {
          verses.push({
            id: `verse_${Date.now()}_${i}`,
            text: sentence.trim(), confidence: 50,
            context: text.split(/[.!?]+/).slice(Math.max(0, i - 1), i + 2).join('. '),
          })
        }
      })
    }

    return verses.filter(v => v.confidence > 30)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private isBibleFile(fileName: string, text: string): boolean {
    const lowerName = fileName.toLowerCase()
    const lowerText = text.toLowerCase()
    if (['bible', 'kjv', 'niv', 'esv', 'nkjv', 'nlt', 'psalm', 'proverb', 'gospel', 'testament']
      .some(i => lowerName.includes(i))) return true
    const books = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges',
      'ruth', 'samuel', 'kings', 'chronicles', 'ezra', 'nehemiah', 'esther', 'job', 'psalms',
      'proverbs', 'ecclesiastes', 'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel',
      'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah',
      'haggai', 'zechariah', 'malachi', 'matthew', 'mark', 'luke', 'john', 'acts', 'romans',
      'corinthians', 'galatians', 'ephesians', 'philippians', 'colossians', 'thessalonians',
      'timothy', 'titus', 'philemon', 'hebrews', 'james', 'peter', 'jude', 'revelation']
    return books.filter(b => lowerText.includes(b)).length >= 5
  }

  private isActualChapter(name: string, index: number): boolean {
    const lower = name.toLowerCase().trim()
    const skip = ['foreword', 'preface', 'introduction', 'acknowledgment', 'acknowledgement',
      'dedication', 'about the author', 'table of contents', 'contents', 'bibliography',
      'index', 'glossary', 'appendix', 'notes', 'copyright', 'title page', 'half title']
    if (skip.some(p => lower.includes(p))) return false
    if (lower.includes('chapter')) return true
    if (/^\d+[\.\:\s]/.test(lower)) return true
    if (/^part\s+/i.test(lower)) return true
    return index > 2
  }

  private extractChapterNumber(name: string, fallback: number): number {
    const m = name.match(/chapter\s+(\d+)/i) || name.match(/^(\d+)[\.\:\s]/)
    return m ? parseInt(m[1]) || fallback : fallback
  }

  private calculateConfidence(text: string, book?: string): number {
    let c = 50
    const words = ['lord', 'god', 'jesus', 'christ', 'holy', 'spirit', 'father', 'heaven', 'blessed',
      'righteousness', 'salvation', 'faith', 'love', 'peace', 'joy', 'prayer', 'worship', 'praise',
      'glory', 'amen', 'hallelujah']
    const lower = text.toLowerCase()
    c += words.filter(w => lower.includes(w)).length * 5
    if (book && this.isKnownBibleBook(book)) c += 20
    if (text.length < 20) c -= 20
    if (text.length > 300) c -= 10
    if (/^[A-Z]/.test(text) && /[.!?]$/.test(text)) c += 10
    return Math.min(100, Math.max(0, c))
  }

  private looksLikeVerse(text: string): boolean {
    const t = text.trim()
    return t.length > 20 && t.length < 400 && /^[A-Z]/.test(t) &&
      !/^(Chapter|Section|Part|Page|\d+\.)/.test(t) &&
      (t.includes('Lord') || t.includes('God') || t.includes('Jesus'))
  }

  private extractContext(text: string, index: number, len: number): string {
    return text.substring(Math.max(0, index - len), Math.min(text.length, index + len)).trim()
  }

  private isKnownBibleBook(book: string): boolean {
    const books = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges',
      'Ruth', 'Samuel', 'Kings', 'Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms',
      'Proverbs', 'Ecclesiastes', 'Song', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel',
      'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
      'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts',
      'Romans', 'Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
      'Thessalonians', 'Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', 'Peter', 'Jude',
      'Revelation']
    const norm = book.replace(/^\d+\s*/, '').toLowerCase()
    return books.some(b => b.toLowerCase().includes(norm) || norm.includes(b.toLowerCase()))
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  convertToScriptures(document: ExtractedDocument, selectedVerses?: string[]): Scripture[] {
    const toConvert = selectedVerses
      ? document.verses.filter(v => selectedVerses.includes(v.id))
      : document.verses

    return toConvert.map(verse => ({
      id: `imported_${verse.id}`,
      book: verse.book || 'Unknown',
      chapter: verse.chapter || 1,
      verse: verse.verse || 1,
      text: verse.text,
      reference: verse.reference || `Unknown ${verse.id}`,
      source: `Imported from ${document.name}`,
      importedAt: new Date().toISOString(),
      ...(verse.collectionChapter !== undefined && { collectionChapter: verse.collectionChapter }),
      ...(verse.collectionChapterName && { collectionChapterName: verse.collectionChapterName }),
    }))
  }

  analyzeForChapterOrganization(
    document: ExtractedDocument,
    selectedVerses?: string[]
  ): {
    canBeChapterBased: boolean
    suggestedName: string
    sourceBook?: string
    stats: { totalBooks: number; totalChapters: number; singleBook: boolean }
  } {
    const verses = selectedVerses
      ? document.verses.filter(v => selectedVerses.includes(v.id))
      : document.verses

    const books = new Set<string>()
    const chapters = new Set<string>()
    verses.forEach(v => {
      if (v.book) books.add(v.book)
      if (v.book && v.chapter) chapters.add(`${v.book}_${v.chapter}`)
    })

    const totalBooks = books.size
    const totalChapters = chapters.size
    const singleBook = totalBooks === 1
    const sourceBook = singleBook ? Array.from(books)[0] : undefined

    let suggestedName = `Imported from ${document.name}`
    if (singleBook && sourceBook) {
      suggestedName = totalChapters === 1
        ? `${sourceBook} ${verses.find(v => v.book === sourceBook)?.chapter || ''}`
        : `${sourceBook} Collection`
    } else if (totalBooks <= 3) {
      suggestedName = `${Array.from(books).join(', ')} Collection`
    }

    return {
      canBeChapterBased: totalChapters > 1 && (singleBook || totalBooks <= 3),
      suggestedName, sourceBook,
      stats: { totalBooks, totalChapters, singleBook },
    }
  }

  getExtractedDocuments(): ExtractedDocument[] { return [...this.documents] }

  getDocumentById(id: string): ExtractedDocument | null {
    return this.documents.find(d => d.id === id) || null
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      this.documents = this.documents.filter(d => d.id !== id)
      await this.saveExtractedDocuments()
      return true
    } catch (error) {
      console.error('Failed to delete document:', error)
      return false
    }
  }
}

export const fileExtractionService = new FileExtractionService()