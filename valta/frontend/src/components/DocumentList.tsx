'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getDocuments, deleteDocument } from '@/lib/api'

interface Document {
  id: number
  filename: string
  original_filename: string
  file_size: number
  status: string
  processing_progress: number
  created_at: string
}

interface DocumentListProps {
  onDocumentSelect: (id: number) => void
  onDocumentsLoaded?: (docs: Document[]) => void
}

export default function DocumentList({ onDocumentSelect, onDocumentsLoaded }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocuments = async () => {
    try {
      const response = await getDocuments()
      setDocuments(response.documents)
      onDocumentsLoaded?.(response.documents)
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleDelete = async (id: number, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return

    try {
      await deleteDocument(id)
      toast.success('Document deleted successfully')
      setDocuments(documents.filter(doc => doc.id !== id))
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete document')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'processing':
        return 'text-blue-600 bg-blue-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-sky-500"></div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg p-16 text-center border border-gray-200 shadow-sm">
        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No documents yet</h3>
        <p className="text-gray-600 text-sm">Upload your first financial document to get started</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {documents.map((document) => (
        <div
          key={document.id}
          className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-3">
                {/* File Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Filename */}
                <h3 className="font-medium text-gray-900 truncate flex-1">
                  {document.original_filename}
                </h3>

                {/* Status Badge */}
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    document.status
                  )}`}
                >
                  {document.status}
                </span>
              </div>

              {/* Metadata */}
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{formatFileSize(document.file_size)}</span>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center space-x-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{new Date(document.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Processing Progress */}
              {document.status === 'processing' && (
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">Processing...</span>
                    <span className="text-sky-500 font-medium">{Math.round(document.processing_progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${document.processing_progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 ml-6 flex-shrink-0">
              {document.status === 'completed' && (
                <button
                  onClick={() => onDocumentSelect(document.id)}
                  className="px-5 py-2.5 bg-sky-500 text-white rounded-lg font-medium shadow-sm hover:bg-sky-600 transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Analyze</span>
                  </span>
                </button>
              )}

              <button
                onClick={() => handleDelete(document.id, document.original_filename)}
                className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Delete document"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}