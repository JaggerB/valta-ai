'use client'

import { useState } from 'react'
import { Sparkles, TrendingUp, DollarSign, Users } from 'lucide-react'

interface ChatLandingProps {
  onAskQuestion: (question: string) => void
  onViewAnalysis: (type: string) => void
}

export default function ChatLanding({ onAskQuestion, onViewAnalysis }: ChatLandingProps) {
  const [question, setQuestion] = useState('')

  const suggestedQuestions = [
    {
      icon: <DollarSign className="w-4 h-4" />,
      text: "What is my revenue?",
      category: "Revenue"
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      text: "How much did we spend on travel last month?",
      category: "Expenses"
    },
    {
      icon: <Users className="w-4 h-4" />,
      text: "Can we afford another hire?",
      category: "Planning"
    }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim()) {
      onAskQuestion(question)
      setQuestion('')
    }
  }

  const handleSuggestedClick = (suggestedQuestion: string) => {
    onAskQuestion(suggestedQuestion)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mb-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-semibold text-gray-900">
            What can I help with?
          </h1>
        </div>
        <p className="text-base text-gray-600">
          Your AI CFO to answer any question based on connected data about your startup
        </p>
      </div>

      {/* Suggested Questions */}
      <div className="flex flex-wrap gap-3 justify-center mb-8 max-w-3xl">
        {suggestedQuestions.map((sq, idx) => (
          <button
            key={idx}
            onClick={() => handleSuggestedClick(sq.text)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm"
          >
            {sq.icon}
            <span>{sq.text}</span>
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-12">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask me anything..."
            rows={3}
            className="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <button
            type="submit"
            disabled={!question.trim()}
            className="absolute right-3 bottom-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            Ask
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>

      {/* Recents Section */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Recents</h3>
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            View all
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onViewAnalysis('startup-metrics')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Startup Metrics Analysis</p>
              <p className="text-xs text-gray-500">Burn rate, runway, and growth metrics</p>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
