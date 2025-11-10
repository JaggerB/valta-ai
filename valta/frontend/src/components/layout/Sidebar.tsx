'use client'

import React, { useState } from 'react'
import { FileText, Upload, BarChart3, Sparkles, MessageSquare, Settings, ChevronDown, ChevronRight } from 'lucide-react'
import Logo from '../Logo'
import ApiUsageWidget from '../ApiUsageWidget'

interface ChatHistoryItem {
  id: string
  title: string
  timestamp: Date
}

interface SidebarProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
  documents?: any[]
  onDocumentSelect?: (doc: any) => void
  selectedDocument?: any
  chatHistory?: ChatHistoryItem[]
  onChatSelect?: (chatId: string) => void
  onSettingsClick?: () => void
  onStartupAnalysisClick?: () => void
}

export default function Sidebar({
  activeTab = 'documents',
  onTabChange,
  documents = [],
  onDocumentSelect,
  selectedDocument,
  chatHistory = [],
  onChatSelect,
  onSettingsClick,
  onStartupAnalysisClick
}: SidebarProps) {
  const [chatHistoryExpanded, setChatHistoryExpanded] = useState(true)
  const [documentsExpanded, setDocumentsExpanded] = useState(true)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Logo size={72} className="text-gray-900 flex-shrink-0" />
          <div>
            <h1 className="text-base font-semibold text-gray-900">Valta</h1>
            <p className="text-xs text-gray-500">AI Finance Analyst</p>
          </div>
        </div>

        {/* Ask AI Button */}
        <button
          onClick={() => onTabChange?.('chat')}
          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Ask AI
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* Chat History Section */}
          {chatHistory.length > 0 && (
            <div>
              <button
                onClick={() => setChatHistoryExpanded(!chatHistoryExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded transition-colors"
              >
                <span>Chat History</span>
                {chatHistoryExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {chatHistoryExpanded && (
                <div className="mt-2 space-y-1">
                  {chatHistory.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => onChatSelect?.(chat.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-gray-700 hover:bg-gray-100"
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{chat.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents Section */}
          <div>
            <button
              onClick={() => setDocumentsExpanded(!documentsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded transition-colors"
            >
              <span>Documents</span>
              {documentsExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {documentsExpanded && (
              <>
                <button
                  onClick={() => onTabChange?.('upload')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mt-2 ${
                    activeTab === 'upload'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload New
                </button>

                {documents.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => onDocumentSelect?.(doc)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedDocument?.id === doc.id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span className="truncate">{doc.original_filename}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Startup Analysis Button */}
          <div>
            <button
              onClick={onStartupAnalysisClick}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-gray-700 hover:bg-gray-100"
            >
              <BarChart3 className="w-4 h-4" />
              Startup Analysis
            </button>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200">
        {/* API Usage Widget */}
        <ApiUsageWidget />

        {/* Settings and Workspace Info */}
        <div className="p-4 space-y-3">
          <button
            onClick={onSettingsClick}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-gray-700 hover:bg-gray-100"
          >
            <Settings className="w-4 h-4" />
            AI Settings
          </button>

          <div className="text-xs text-gray-500">
            <p className="font-medium text-gray-900 mb-1">Demo Workspace</p>
            <p>Free Plan</p>
          </div>
        </div>
      </div>
    </div>
  )
}
