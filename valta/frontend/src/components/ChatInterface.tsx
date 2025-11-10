'use client'

import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { askQuestion } from '@/lib/api'
import DocumentViewer from './DocumentViewer'

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

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    document_id: number
    document_name: string
    citation_text?: string
    location?: Citation['location']
    // Legacy fields
    page_number?: number
    section?: string
    excerpt?: string
    sheet_name?: string
    row_number?: number
    column_name?: string
    cell_value?: string
  }>
  confidence_score?: number
  model_used?: string
}

interface ChatInterfaceProps {
  selectedDocumentId: number | null
}

export default function ChatInterface({ selectedDocumentId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewerDocument, setViewerDocument] = useState<{
    id: number
    name: string
    citation?: Citation
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await askQuestion(input.trim(), selectedDocumentId)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
        confidence_score: response.confidence_score,
        model_used: response.model_used
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error: any) {
      toast.error(error.message || 'Failed to get response')

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your question. Please try again.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const formatConfidence = (score?: number) => {
    if (!score) return ''
    return `Confidence: ${Math.round(score * 100)}%`
  }

  const handleCitationClick = (source: ChatMessage['sources'][0]) => {
    if (!source) return

    setViewerDocument({
      id: source.document_id,
      name: source.document_name,
      citation: {
        citation_text: source.citation_text || source.excerpt,
        location: source.location || {
          type: source.sheet_name ? 'excel' : source.page_number ? 'pdf' : 'text',
          page_number: source.page_number,
          sheet_name: source.sheet_name,
          row_number: source.row_number,
        }
      }
    })
  }

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-5 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {selectedDocumentId
                  ? 'Ask questions about your document'
                  : 'Ask questions about all documents'
                }
              </h3>
              {selectedDocumentId && (
                <span className="text-xs text-gray-500">
                  Document ID: {selectedDocumentId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-white">
        {messages.length === 0 && (
          <div className="text-center py-12">
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-gray-700 mb-6 text-sm">Start a conversation by asking about financial metrics, trends, or insights.</p>
            <div className="inline-block text-left">
              <p className="font-medium text-gray-900 mb-3 text-sm">Example questions:</p>
              <div className="space-y-2">
                {[
                  'What was the revenue growth this quarter?',
                  'What are the main risk factors mentioned?',
                  'How did operating expenses change year-over-year?',
                  'What guidance did management provide?',
                ].map((question, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5"></div>
                    <span>{question}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-3xl rounded-lg px-5 py-4 ${
                message.type === 'user'
                  ? 'bg-sky-500 text-white'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className={`whitespace-pre-wrap leading-relaxed ${
                message.type === 'user' ? 'text-white' : 'text-gray-900'
              }`}>
                {message.content}
              </div>

              {/* Sources and confidence for assistant messages */}
              {message.type === 'assistant' && (message.sources || message.confidence_score || message.model_used) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {message.confidence_score && (
                      <div className="inline-flex items-center space-x-2 px-3 py-1 bg-sky-50 rounded-lg text-xs font-medium text-sky-700">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{formatConfidence(message.confidence_score)}</span>
                      </div>
                    )}
                    {message.model_used && (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>
                          {message.model_used.includes('claude') ? 'Claude 3.5 Sonnet' :
                           message.model_used.includes('gpt-4') ? 'GPT-4 Turbo' : message.model_used}
                        </span>
                      </div>
                    )}
                  </div>

                  {message.sources && message.sources.length > 0 && (
                    <div className="text-xs">
                      <div className="font-semibold text-gray-700 mb-2 flex items-center space-x-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span>Sources (click to view):</span>
                      </div>
                      <div className="space-y-2">
                        {message.sources.map((source, index) => (
                          <button
                            key={index}
                            onClick={() => handleCitationClick(source)}
                            className="block w-full text-left p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all"
                          >
                            <div className="flex items-start space-x-2">
                              <svg className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">{source.document_name}</span>
                                {(source.location?.page_number || source.page_number) && (
                                  <span className="text-gray-600"> (Page {source.location?.page_number || source.page_number})</span>
                                )}
                                {(source.location?.sheet_name || source.sheet_name) && (
                                  <span className="text-gray-600"> (Sheet: {source.location?.sheet_name || source.sheet_name})</span>
                                )}
                                {source.citation_text && (
                                  <div className="text-gray-500 italic mt-1 text-xs">
                                    &quot;{source.citation_text.substring(0, 60)}...&quot;
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={`text-xs mt-3 ${
                message.type === 'user' ? 'text-white/70' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-700 font-medium">AI is analyzing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-5 bg-gray-50">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your financial documents..."
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none transition-all"
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Document Viewer Modal */}
      {viewerDocument && (
        <DocumentViewer
          documentId={viewerDocument.id}
          documentName={viewerDocument.name}
          citation={viewerDocument.citation}
          onClose={() => setViewerDocument(null)}
        />
      )}
    </div>
  )
}