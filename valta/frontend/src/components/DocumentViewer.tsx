'use client'

import { useState, useEffect, useRef } from 'react'
import { getDocumentContent } from '@/lib/api'
import dynamic from 'next/dynamic'

// Dynamically import PDF viewer to avoid SSR issues
const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false })
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false })

// Configure PDF.js worker on client side only
if (typeof window !== 'undefined') {
  import('react-pdf').then((module) => {
    const { pdfjs } = module;
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  });
}

interface Citation {
  citation_text?: string
  location?: {
    type: 'pdf' | 'excel' | 'text'
    page_number?: number
    sheet_name?: string
    row_number?: number
    line_number?: number
    char_position?: number
  }
}

interface DocumentViewerProps {
  documentId: number
  documentName: string
  citation?: Citation
  // Legacy support
  highlightLocation?: {
    sheet_name?: string
    row_number?: number
    column_name?: string
    cell_value?: string
  }
  onClose: () => void
}

interface DocumentContent {
  id: number
  filename: string
  content_type: string
  structured_data?: any
  raw_text?: string
}

export default function DocumentViewer({ documentId, documentName, citation, highlightLocation, onClose }: DocumentViewerProps) {
  const [content, setContent] = useState<DocumentContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [fileType, setFileType] = useState<'pdf' | 'excel' | 'text'>('text')
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Determine file type from document name
    const ext = documentName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') {
      setFileType('pdf')
    } else if (ext === 'xlsx' || ext === 'xls') {
      setFileType('excel')
    } else {
      setFileType('text')
    }

    const fetchContent = async () => {
      try {
        const documentContent = await getDocumentContent(documentId)
        setContent(documentContent)

        // Set initial sheet to the highlighted one or first sheet
        if (documentContent.structured_data?.sheets) {
          const targetSheet = citation?.location?.sheet_name || highlightLocation?.sheet_name || documentContent.structured_data.sheets[0]?.name
          setSelectedSheet(targetSheet)
        }

        // Set initial page for PDF
        if (citation?.location?.page_number) {
          setCurrentPage(citation.location.page_number)
        }
      } catch (error) {
        console.error('Error fetching document content:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [documentId, documentName, citation, highlightLocation])

  useEffect(() => {
    // Highlight citation text when content is loaded
    if (content && citation?.citation_text && contentRef.current) {
      setTimeout(() => {
        highlightTextInElement(contentRef.current!, citation.citation_text!)
      }, 100)
    }
  }, [content, citation])

  const highlightTextInElement = (element: HTMLElement, searchText: string) => {
    if (!searchText) return

    // Remove previous highlights
    element.querySelectorAll('.citation-highlight').forEach(el => {
      const parent = el.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el)
        parent.normalize()
      }
    })

    // Find and highlight new text
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
    )

    const nodesToHighlight: { node: Text; index: number }[] = []
    let node: Node | null

    while ((node = walker.nextNode())) {
      const text = node.textContent || ''
      const index = text.toLowerCase().indexOf(searchText.toLowerCase())
      if (index >= 0) {
        nodesToHighlight.push({ node: node as Text, index })
      }
    }

    // Highlight nodes (in reverse to maintain positions)
    nodesToHighlight.reverse().forEach(({ node, index }) => {
      const text = node.textContent || ''
      const before = text.substring(0, index)
      const match = text.substring(index, index + searchText.length)
      const after = text.substring(index + searchText.length)

      const highlight = document.createElement('mark')
      highlight.className = 'citation-highlight bg-yellow-300 px-1 rounded'
      highlight.textContent = match

      const fragment = document.createDocumentFragment()
      if (before) fragment.appendChild(document.createTextNode(before))
      fragment.appendChild(highlight)
      if (after) fragment.appendChild(document.createTextNode(after))

      node.parentNode?.replaceChild(fragment, node)

      // Scroll to first highlight
      if (nodesToHighlight.indexOf({ node, index }) === nodesToHighlight.length - 1) {
        highlight.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  const renderPdfViewer = () => {
    if (typeof window === 'undefined') return null

    return (
      <div className="flex flex-col items-center space-y-4">
        <Document
          file={`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${documentId}/file`}
          onLoadSuccess={onDocumentLoadSuccess}
          className="border border-gray-300 shadow-lg"
        >
          <Page
            pageNumber={currentPage}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="mx-auto"
            width={800}
          />
        </Document>

        {numPages > 1 && (
          <div className="flex items-center gap-4 bg-gray-100 px-4 py-2 rounded">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {citation?.citation_text && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-2xl">
            <h4 className="font-medium text-yellow-800">Cited Text</h4>
            <p className="text-sm text-yellow-700 mt-1">&quot;{citation.citation_text}&quot;</p>
            <p className="text-xs text-yellow-600 mt-1">Page {currentPage}</p>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-12 shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-sky-500 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <p className="text-gray-900 mb-4">Failed to load document content</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const renderExcelViewer = () => {
    if (!content.structured_data?.sheets) return null

    const currentSheet = content.structured_data.sheets.find((s: any) => s.name === selectedSheet) || content.structured_data.sheets[0]

    // Get citation row/sheet from citation prop
    const citationSheet = citation?.location?.sheet_name || highlightLocation?.sheet_name
    const citationRow = citation?.location?.row_number || highlightLocation?.row_number
    const citationText = citation?.citation_text

    return (
      <div className="space-y-4">
        {/* Sheet selector */}
        {content.structured_data.sheets.length > 1 && (
          <div className="flex space-x-2">
            {content.structured_data.sheets.map((sheet: any) => (
              <button
                key={sheet.name}
                onClick={() => setSelectedSheet(sheet.name)}
                className={`px-3 py-1 rounded text-sm ${
                  selectedSheet === sheet.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {sheet.name}
              </button>
            ))}
          </div>
        )}

        {/* Excel table viewer */}
        <div className="overflow-auto max-h-[500px] border rounded-lg bg-white">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-700 bg-gray-50 sticky left-0 z-20">Row</th>
                {currentSheet.column_names?.map((col: string, idx: number) => {
                  // Display column name or letter if unnamed
                  const displayName = col && col !== 'Unnamed: ' + idx && !col.startsWith('Column_')
                    ? col
                    : String.fromCharCode(65 + idx) // A, B, C, etc.

                  return (
                    <th
                      key={idx}
                      className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-700 bg-gray-50 min-w-[100px]"
                      title={col} // Show full name on hover
                    >
                      {displayName}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentSheet.data_sample?.map((row: any, rowIdx: number) => {
                const isRowHighlighted = citationRow === rowIdx + 1

                return (
                  <tr
                    key={rowIdx}
                    className={`${
                      isRowHighlighted ? 'bg-yellow-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-2 border border-gray-300 font-medium text-gray-700 bg-gray-50">{rowIdx + 1}</td>
                    {currentSheet.column_names?.map((col: string, colIdx: number) => {
                      const cellValue = row[col]
                      const cellText = String(cellValue ?? '')

                      // Check if this cell contains the citation text
                      const isCellHighlighted = isRowHighlighted && citationText && cellText.toLowerCase().includes(citationText.toLowerCase())

                      return (
                        <td
                          key={colIdx}
                          className={`px-3 py-2 border border-gray-300 text-gray-900 ${
                            isCellHighlighted
                              ? 'bg-yellow-300 font-bold ring-2 ring-yellow-500'
                              : isRowHighlighted
                              ? 'bg-yellow-50'
                              : 'bg-white'
                          }`}
                        >
                          {cellValue ?? ''}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {(citation?.citation_text || highlightLocation) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h4 className="font-medium text-yellow-800">Highlighted Citation</h4>
            <p className="text-sm text-yellow-700 mt-1">
              {citationSheet && `Sheet: ${citationSheet}`}
              {citationRow && ` • Row: ${citationRow}`}
              {citation?.citation_text && (
                <span className="block mt-1 italic">&quot;{citation.citation_text}&quot;</span>
              )}
            </p>
          </div>
        )}
      </div>
    )
  }

  const renderTextViewer = () => {
    if (!content.raw_text) return null

    const lines = content.raw_text.split('\n')

    return (
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
          <pre className="whitespace-pre-wrap text-sm">
            {lines.map((line, idx) => {
              const isHighlighted = highlightLocation?.row_number === idx + 1
              return (
                <div
                  key={idx}
                  className={`${isHighlighted ? 'bg-yellow-200 font-bold' : ''}`}
                >
                  {line}
                </div>
              )
            })}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{content.filename}</h3>
              {citation?.citation_text && (
                <p className="text-sm text-gray-600 mt-1">
                  Showing citation: &quot;{citation.citation_text.substring(0, 60)}...&quot;
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto flex-1 bg-gray-50" ref={contentRef}>
          {fileType === 'pdf' ? renderPdfViewer() : content.content_type === 'excel' ? renderExcelViewer() : renderTextViewer()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-5 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {content.content_type === 'excel'
                ? `${content.structured_data?.summary?.total_sheets || 0} sheets, ${content.structured_data?.summary?.total_rows || 0} rows`
                : `${content.raw_text?.split('\n').length || 0} lines`
              }
            </span>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}