'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getDocuments, generateWorkbook } from '@/lib/api'

// Layout components
import MainLayout from '@/components/layout/MainLayout'
import Sidebar from '@/components/layout/Sidebar'
import RightPanelLanding from '@/components/layout/RightPanelLanding'
import ChatPanel from '@/components/ChatPanel'

// Feature components
import ChatLanding from '@/components/ChatLanding'
import WorkbookView from '@/components/WorkbookView'
import DocumentUpload from '@/components/DocumentUpload'
import AISettings from '@/components/AISettings'
import StartupDashboardV2 from '@/components/StartupDashboardV2'
import { StartupMetrics, Commentary } from '@/lib/api'

type ViewMode = 'chat-landing' | 'chat-active' | 'analyzing' | 'upload' | 'startup-dashboard'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface WorkbookData {
  title: string
  sheets: Array<{
    name: string
    columns: string[]
    rows: any[][]
    formulas?: { [key: string]: string }
  }>
}

interface Conversation {
  id: string
  title: string
  timestamp: Date
  workbook: WorkbookData
  messages: Message[]
}

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat-landing')
  const [documents, setDocuments] = useState<any[]>([])
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [metrics, setMetrics] = useState<StartupMetrics | null>(null)
  const [commentary, setCommentary] = useState<Commentary | null>(null)
  const [analyzingQuestion, setAnalyzingQuestion] = useState<string>('')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await getDocuments()
      setDocuments(response.documents)
    } catch (error: any) {
      console.error('Failed to fetch documents:', error)
    }
  }

  // Generate workbook based on question content
  const generateWorkbookFromQuestion = (question: string): { workbook: WorkbookData, response: string } => {
    const lowerQuestion = question.toLowerCase()

    // Travel/Expense related
    if (lowerQuestion.includes('travel') || lowerQuestion.includes('spend on travel')) {
      return {
        workbook: {
          title: 'Travel Expenses Analysis',
          sheets: [{
            name: 'Travel Breakdown',
            columns: ['Category', 'Amount', 'Month'],
            rows: [
              ['Flights', 4250.00, 'October 2025'],
              ['Hotels', 2890.50, 'October 2025'],
              ['Meals & Entertainment', 1340.25, 'October 2025'],
              ['Ground Transportation', 567.80, 'October 2025'],
              ['TOTAL', 9048.55, '']
            ],
            formulas: {
              'B6': '=SUM(B2:B5)'
            }
          }]
        },
        response: "Based on your expense data, total travel spending for October 2025 was $9,048.55. The largest expense was flights at $4,250."
      }
    }

    // Revenue related
    if (lowerQuestion.includes('revenue') || lowerQuestion.includes('income')) {
      return {
        workbook: {
          title: 'Revenue Summary 2025',
          sheets: [{
            name: 'Revenue Breakdown',
            columns: ['Revenue Category', 'Amount 2025'],
            rows: [
              ['Operating Revenue', 56523.25],
              ['Interest Revenue', 50000.00],
              ['Product Sales', 16523.25],
              ['Service/Fee Revenue', 61000.00],
              ['Non-Operating Revenue', 54762.51],
              ['TOTAL', 238809.01]
            ],
            formulas: {
              'B7': '=SUM(B2:B6)'
            }
          }]
        },
        response: "Based on your P&L data, I've generated a revenue breakdown workbook. The total revenue for 2025 is $238,809.01."
      }
    }

    // Hiring/Payroll related
    if (lowerQuestion.includes('hire') || lowerQuestion.includes('afford') || lowerQuestion.includes('payroll')) {
      return {
        workbook: {
          title: 'Hiring Budget Analysis',
          sheets: [{
            name: 'Headcount Analysis',
            columns: ['Position', 'Annual Salary', 'Benefits (25%)', 'Total Cost'],
            rows: [
              ['Current Payroll', 450000, 112500, 562500],
              ['New Hire (Engineer)', 120000, 30000, 150000],
              ['PROJECTED TOTAL', 570000, 142500, 712500],
              ['', '', '', ''],
              ['Current Runway', '', '', 18],
              ['With New Hire', '', '', 14]
            ],
            formulas: {
              'B3': '=B2+B3',
              'C3': '=C2+C3',
              'D3': '=D2+D3'
            }
          }]
        },
        response: "Based on your current burn rate and cash position, you can afford another hire. Current runway is 18 months, with a new $120K engineer it would be 14 months."
      }
    }

    // Burn rate related
    if (lowerQuestion.includes('burn') || lowerQuestion.includes('spending') || lowerQuestion.includes('expenses')) {
      return {
        workbook: {
          title: 'Monthly Burn Rate Analysis',
          sheets: [{
            name: 'Burn Analysis',
            columns: ['Category', 'Oct 2025', 'Sep 2025', 'Aug 2025'],
            rows: [
              ['Payroll', 42500, 42500, 41000],
              ['Cloud Services', 8900, 8200, 7800],
              ['Marketing', 12000, 15000, 18000],
              ['Office & Operations', 6500, 6300, 6100],
              ['Travel', 9048, 4200, 3800],
              ['TOTAL', 78948, 76200, 76700]
            ],
            formulas: {
              'B7': '=SUM(B2:B6)',
              'C7': '=SUM(C2:C6)',
              'D7': '=SUM(D2:D6)'
            }
          }]
        },
        response: "Your current monthly burn rate is $78,948, up from $76,200 last month. The increase is primarily due to higher travel expenses."
      }
    }

    // Cash flow / runway related
    if (lowerQuestion.includes('runway') || lowerQuestion.includes('cash') || lowerQuestion.includes('last')) {
      return {
        workbook: {
          title: 'Cash Flow & Runway Projection',
          sheets: [{
            name: 'Runway Analysis',
            columns: ['Metric', 'Value'],
            rows: [
              ['Current Cash Balance', '$1,200,000'],
              ['Monthly Burn Rate', '$78,948'],
              ['Monthly Revenue', '$19,900'],
              ['Net Burn', '$59,048'],
              ['Runway (months)', '20.3']
            ],
            formulas: {
              'B5': '=B4-B3',
              'B6': '=B2/B5'
            }
          }]
        },
        response: "With a current cash balance of $1.2M and net monthly burn of $59K, your runway is approximately 20 months."
      }
    }

    // Default fallback - revenue summary
    return {
      workbook: {
        title: 'Financial Summary 2025',
        sheets: [{
          name: 'Overview',
          columns: ['Metric', 'Amount'],
          rows: [
            ['Total Revenue', 238809.01],
            ['Total Expenses', 315620.50],
            ['Net Income', -76811.49],
            ['', ''],
            ['Current Cash', 1200000],
            ['Burn Rate', 78948],
            ['Runway (months)', 15.2]
          ],
          formulas: {
            'B3': '=B1-B2',
            'B7': '=B5/B6'
          }
        }]
      },
      response: "I've generated a financial summary based on your data. Your current revenue is $238K with expenses of $315K, resulting in a monthly burn."
    }
  }

  const handleAskQuestion = async (question: string) => {
    try {
      // Show analyzing view with loading animation
      setAnalyzingQuestion(question)
      setViewMode('analyzing')

      // Call backend API to generate workbook from actual document data
      const workbookResponse = await generateWorkbook(
        question,
        selectedDocument?.id // Use selected document if any, otherwise analyze all
      )

      // Create initial message
      const initialMessage: Message = {
        role: 'user',
        content: question,
        timestamp: new Date()
      }

      const responseMessage: Message = {
        role: 'assistant',
        content: workbookResponse.summary,
        timestamp: new Date()
      }

      // Create new conversation with real data
      const newConversation: Conversation = {
        id: workbookResponse.conversation_id,
        title: question,
        timestamp: new Date(),
        workbook: {
          title: workbookResponse.title,
          sheets: workbookResponse.sheets
        },
        messages: [initialMessage, responseMessage]
      }

      setConversations(prev => [newConversation, ...prev])
      setCurrentConversation(newConversation)
      setViewMode('chat-active')
    } catch (error: any) {
      console.error('Failed to generate workbook:', error)
      toast.error(error.message || 'Failed to generate analysis')

      // Fallback to mock data if API fails
      const { workbook: mockWorkbook, response: aiResponse } = generateWorkbookFromQuestion(question)

      const initialMessage: Message = {
        role: 'user',
        content: question,
        timestamp: new Date()
      }

      const responseMessage: Message = {
        role: 'assistant',
        content: aiResponse + ' (Using sample data - please ensure documents are uploaded and API is configured)',
        timestamp: new Date()
      }

      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: question,
        timestamp: new Date(),
        workbook: mockWorkbook,
        messages: [initialMessage, responseMessage]
      }

      setConversations(prev => [newConversation, ...prev])
      setCurrentConversation(newConversation)
      setViewMode('chat-active')
    }
  }

  const handleSendMessage = async (message: string): Promise<string> => {
    // This is called when user sends a follow-up message in an existing chat
    // We need to generate a NEW workbook based on the new question

    if (!currentConversation) {
      return "No active conversation"
    }

    try {
      // Show analyzing state
      setAnalyzingQuestion(message)
      setViewMode('analyzing')

      // Call backend to generate new workbook for this question
      const workbookResponse = await generateWorkbook(
        message,
        selectedDocument?.id
      )

      // Add messages to conversation
      const userMessage: Message = {
        role: 'user',
        content: message,
        timestamp: new Date()
      }

      const responseMessage: Message = {
        role: 'assistant',
        content: workbookResponse.summary,
        timestamp: new Date()
      }

      // Update conversation with new messages AND new workbook
      const updatedConversation: Conversation = {
        ...currentConversation,
        messages: [...currentConversation.messages, userMessage, responseMessage],
        workbook: {
          title: workbookResponse.title,
          sheets: workbookResponse.sheets
        }
      }

      setCurrentConversation(updatedConversation)

      // Update in conversations list
      setConversations(prev =>
        prev.map(conv => conv.id === updatedConversation.id ? updatedConversation : conv)
      )

      // Show the updated workbook
      setViewMode('chat-active')

      return workbookResponse.summary
    } catch (error: any) {
      console.error('Failed to process message:', error)
      toast.error(error.message || 'Failed to process your question')

      // Fall back to just adding the message without updating workbook
      setViewMode('chat-active')
      return "I'm having trouble processing your question. Please ensure your documents are uploaded and API is configured."
    }
  }

  const handleNewChat = () => {
    setCurrentConversation(null)
    setViewMode('chat-landing')
  }

  const handleViewAnalysis = (type: string) => {
    if (type === 'startup-metrics') {
      if (documents.length > 0) {
        setSelectedDocument(documents[0])
        setViewMode('startup-dashboard')
      } else {
        toast.error('Please upload a document first')
      }
    }
  }

  const handleUploadSuccess = () => {
    fetchDocuments()
    setViewMode('chat-landing')
    toast.success('Document uploaded successfully!')
  }

  const handleSaveSettings = async (settings: any) => {
    // In production, save to backend
    console.log('Saving settings:', settings)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const handleStartupAnalysisClick = () => {
    // Navigate to dashboard view instead of creating a chat
    if (documents.length > 0) {
      setSelectedDocument(documents[0])
      setViewMode('startup-dashboard')
    } else {
      toast.error('Please upload documents first to view startup analysis')
    }
  }

  const handleDocumentSelect = (doc: any) => {
    setSelectedDocument(doc)
    // Ask AI about this specific document
    handleAskQuestion(`Analyze ${doc.original_filename}`)
  }

  const handleChatSelect = (chatId: string) => {
    // Load conversation from history
    const conversation = conversations.find(c => c.id === chatId)
    if (conversation) {
      setCurrentConversation(conversation)
      setViewMode('chat-active')
    }
  }

  // Render content based on view mode
  const renderMainContent = () => {
    switch (viewMode) {
      case 'chat-landing':
        return (
          <ChatLanding
            onAskQuestion={handleAskQuestion}
            onViewAnalysis={handleViewAnalysis}
          />
        )

      case 'analyzing':
        return (
          <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
            <div className="text-center max-w-2xl px-6">
              {/* Animated AI brain icon */}
              <div className="mb-8 relative">
                <div className="w-24 h-24 mx-auto relative">
                  {/* Pulsing circles */}
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
                  <div className="absolute inset-2 rounded-full bg-blue-500/30 animate-pulse"></div>
                  <div className="absolute inset-4 rounded-full bg-blue-500/40 flex items-center justify-center">
                    <svg className="w-12 h-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Status text */}
              <h2 className="text-2xl font-semibold text-white mb-3">
                Analyzing your financial data
              </h2>
              <p className="text-gray-400 mb-6">
                {analyzingQuestion}
              </p>

              {/* Progress steps */}
              <div className="space-y-3 text-left max-w-md mx-auto">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">Reading uploaded documents...</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500/50 rounded-full animate-pulse delay-150"></div>
                  <span className="text-gray-400">Extracting financial data...</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500/30 rounded-full animate-pulse delay-300"></div>
                  <span className="text-gray-500">Generating analysis...</span>
                </div>
              </div>
            </div>
          </div>
        )

      case 'chat-active':
        return currentConversation ? (
          <WorkbookView
            workbook={currentConversation.workbook}
            onExport={() => toast.info('Export feature coming soon!')}
          />
        ) : null

      case 'upload':
        return (
          <div className="p-6">
            <DocumentUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        )

      case 'startup-dashboard':
        return selectedDocument ? (
          <StartupDashboardV2
            documentId={selectedDocument.id}
            onMetricsChange={(m, c) => {
              setMetrics(m)
              setCommentary(c)
            }}
          />
        ) : null

      default:
        return null
    }
  }

  const renderRightPanel = () => {
    if (viewMode === 'chat-active' && currentConversation) {
      return (
        <ChatPanel
          conversationId={currentConversation.id}
          initialMessages={currentConversation.messages}
          onNewChat={handleNewChat}
          onSendMessage={handleSendMessage}
        />
      )
    }

    return (
      <RightPanelLanding
        onUploadClick={() => setViewMode('upload')}
        onAnalysisClick={handleViewAnalysis}
      />
    )
  }

  return (
    <>
      <MainLayout
        sidebar={
          <Sidebar
            activeTab={viewMode === 'upload' ? 'upload' : viewMode === 'startup-dashboard' ? 'dashboard' : 'chat'}
            onTabChange={(tab) => {
              if (tab === 'upload') setViewMode('upload')
              else if (tab === 'chat') setViewMode('chat-landing')
            }}
            documents={documents}
            onDocumentSelect={handleDocumentSelect}
            selectedDocument={selectedDocument}
            chatHistory={conversations.map(conv => ({
              id: conv.id,
              title: conv.title,
              timestamp: conv.timestamp
            }))}
            onChatSelect={handleChatSelect}
            onSettingsClick={() => setSettingsOpen(true)}
            onStartupAnalysisClick={handleStartupAnalysisClick}
          />
        }
        rightPanel={renderRightPanel()}
      >
        {renderMainContent()}
      </MainLayout>

      <AISettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </>
  )
}
