'use client'

import { useState } from 'react'
import DocumentUpload from '@/components/DocumentUpload'
import DocumentList from '@/components/DocumentList'
import ChatInterface from '@/components/ChatInterface'
import DocumentInsights from '@/components/DocumentInsights'
import Settings from '@/components/Settings'
import Header from '@/components/Header'
import StartupDashboard from '@/components/StartupDashboard'
import MainLayout from '@/components/layout/MainLayout'
import Sidebar from '@/components/layout/Sidebar'
import RightPanel from '@/components/layout/RightPanel'
import StartupDashboardV2 from '@/components/StartupDashboardV2'
import { StartupMetrics, Commentary } from '@/lib/api'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'documents' | 'dashboard' | 'insights' | 'chat' | 'settings'>('upload')
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [metrics, setMetrics] = useState<StartupMetrics | null>(null)
  const [commentary, setCommentary] = useState<Commentary | null>(null)
  const [calculating, setCalculating] = useState(false)

  const tabs = [
    {
      id: 'upload',
      label: 'Upload',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      )
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'dashboard',
      label: 'Startup Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      disabled: !selectedDocumentId
    },
    {
      id: 'insights',
      label: 'Advanced',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      disabled: !selectedDocumentId
    },
    {
      id: 'chat',
      label: 'Ask AI',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ]

  const handleDocumentSelect = (doc: any) => {
    setSelectedDocument(doc)
    setSelectedDocumentId(doc.id)
    setActiveTab('dashboard')
  }

  const handleCalculate = () => {
    setCalculating(true)
    // Trigger refresh by updating selected document
    setTimeout(() => setCalculating(false), 2000)
  }

  // Use new layout for dashboard, old layout for upload/settings
  if (activeTab === 'dashboard' && selectedDocumentId) {
    return (
      <MainLayout
        sidebar={
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            documents={documents}
            onDocumentSelect={handleDocumentSelect}
            selectedDocument={selectedDocument}
          />
        }
        rightPanel={
          <RightPanel
            metrics={metrics}
            commentary={commentary}
            onCalculate={handleCalculate}
            calculating={calculating}
          />
        }
      >
        <StartupDashboardV2
          documentId={selectedDocumentId}
          onMetricsChange={(m, c) => {
            setMetrics(m)
            setCommentary(c)
          }}
        />
      </MainLayout>
    )
  }

  // Old layout for other tabs
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg p-1 mb-8 inline-flex space-x-1 border border-gray-200 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
              disabled={tab.disabled}
              className={`
                px-5 py-2.5 rounded-md font-medium text-sm transition-all
                flex items-center space-x-2
                ${activeTab === tab.id
                  ? 'bg-sky-500 text-white shadow-sm'
                  : tab.disabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold text-gray-900 mb-3">
                  AI Finance Analyst for Startups
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  Upload your P&L and get instant burn rate, runway analysis, and investor-ready commentary in 60 seconds
                </p>
                <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 mb-8">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Burn Rate & Runway</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Growth Metrics</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Investor Updates</span>
                  </div>
                </div>
              </div>
              <DocumentUpload onUploadSuccess={() => setActiveTab('documents')} />
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">Your Documents</h2>
                <p className="text-gray-600 text-sm">Upload your P&L and get instant startup metrics</p>
              </div>
              <DocumentList
                onDocumentSelect={(id) => {
                  setSelectedDocumentId(id)
                  setActiveTab('dashboard')
                }}
                onDocumentsLoaded={setDocuments}
              />
            </div>
          )}

          {activeTab === 'insights' && selectedDocumentId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">Advanced Analysis</h2>
                  <p className="text-gray-600 text-sm">Deep analysis powered by advanced AI models</p>
                </div>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="px-5 py-2.5 bg-sky-500 text-white rounded-lg font-medium shadow-sm hover:bg-sky-600 transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <span>Ask Follow-up Questions</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </button>
              </div>
              <DocumentInsights documentId={selectedDocumentId} />
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">Ask Questions</h2>
                <p className="text-gray-600 text-sm">Get instant answers from your financial documents</p>
              </div>
              <ChatInterface selectedDocumentId={selectedDocumentId} />
            </div>
          )}

          {activeTab === 'settings' && (
            <Settings />
          )}
        </div>
      </div>
    </main>
  )
}