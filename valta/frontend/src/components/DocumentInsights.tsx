'use client'

import { useState, useEffect, useRef } from 'react'
import { getDocumentInsights } from '@/lib/api'
import PLAnalysisPanel from './PLAnalysisPanel'

interface KeyMetric {
  label: string
  value: string
  change?: string
  trend?: 'up' | 'down' | 'neutral'
}

interface DocumentInsights {
  document_id: number
  document_name: string
  summary: string
  key_metrics: KeyMetric[]
  insights: string[]
  risks: string[]
  opportunities: string[]
  model_used?: string
}

interface DocumentInsightsProps {
  documentId: number
}

// Cache insights in memory to avoid re-fetching
const insightsCache = new Map<number, DocumentInsights>()

export default function DocumentInsights({ documentId }: DocumentInsightsProps) {
  const [insights, setInsights] = useState<DocumentInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'insights' | 'pl-analysis'>('insights')
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    const fetchInsights = async () => {
      // Check cache first
      if (insightsCache.has(documentId)) {
        setInsights(insightsCache.get(documentId)!)
        setLoading(false)
        return
      }

      // Only fetch once per document
      if (hasFetchedRef.current) return
      hasFetchedRef.current = true

      try {
        setLoading(true)
        const data = await getDocumentInsights(documentId)
        setInsights(data)
        // Cache the results
        insightsCache.set(documentId, data)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching insights:', err)
        setError(err.response?.data?.detail || 'Failed to load insights')
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [documentId])

  const handleRegenerate = async () => {
    // Clear cache for this document
    insightsCache.delete(documentId)
    hasFetchedRef.current = false
    setLoading(true)
    setError(null)

    try {
      const data = await getDocumentInsights(documentId)
      setInsights(data)
      insightsCache.set(documentId, data)
    } catch (err: any) {
      console.error('Error regenerating insights:', err)
      setError(err.response?.data?.detail || 'Failed to regenerate insights')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-12 border border-gray-200 shadow-sm">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-sky-500"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generating AI Insights...</h3>
          <p className="text-gray-600 text-sm">Analyzing your financial document with GPT-4. This may take 15-30 seconds.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-12 border border-gray-200 shadow-sm">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-red-600 font-medium mb-3">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!insights) return null

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return '📈'
      case 'down':
        return '📉'
      default:
        return '➡️'
    }
  }

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg p-1 inline-flex space-x-1 border border-gray-200 shadow-sm">
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-4 py-2.5 rounded-md font-medium text-sm transition-all flex items-center space-x-2 ${
            activeTab === 'insights'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>AI Insights</span>
        </button>

        <button
          onClick={() => setActiveTab('pl-analysis')}
          className={`px-4 py-2.5 rounded-md font-medium text-sm transition-all flex items-center space-x-2 ${
            activeTab === 'pl-analysis'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>P&L Analysis</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'insights' && (
        <>
          {/* Header with Regenerate Button */}
          <div className="bg-white rounded-lg p-4 flex items-center justify-between border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-gray-700">
                <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-sm font-medium">AI-powered analysis</span>
              </div>
              {insights?.model_used && (
                <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-md">
                  {insights.model_used.includes('claude') ? 'Claude 3.5 Sonnet' :
                   insights.model_used.includes('gpt-4') ? 'GPT-4 Turbo' : insights.model_used}
                </span>
              )}
            </div>
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Regenerate</span>
            </button>
          </div>

      {/* Summary Section */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-12 h-12 bg-sky-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Executive Summary</h3>
            <p className="text-gray-700 leading-relaxed">{insights.summary}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      {insights.key_metrics && insights.key_metrics.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Key Metrics</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.key_metrics.map((metric, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2 font-medium">{metric.label}</p>
                    <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
                  </div>
                  {metric.trend && (
                    <div className="flex-shrink-0 ml-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        metric.trend === 'up' ? 'bg-green-50' : metric.trend === 'down' ? 'bg-red-50' : 'bg-gray-50'
                      }`}>
                        <svg className={`w-5 h-5 ${getTrendColor(metric.trend)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                            metric.trend === 'up' ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' :
                            metric.trend === 'down' ? 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6' :
                            'M9 5l7 7-7 7'
                          } />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                {metric.change && (
                  <div className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                    metric.trend === 'up' ? 'bg-green-50 text-green-700' :
                    metric.trend === 'down' ? 'bg-red-50 text-red-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    <span>{metric.change}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Insights */}
      {insights.insights && insights.insights.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-5">
            <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Top Insights</h3>
          </div>
          <ul className="space-y-3">
            {insights.insights.map((insight, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-sky-600 font-medium text-sm">{index + 1}</span>
                </div>
                <span className="text-gray-700 flex-1 pt-0.5 leading-relaxed">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks & Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risks */}
        {insights.risks && insights.risks.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Risk Factors</h3>
            </div>
            <ul className="space-y-3">
              {insights.risks.map((risk, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 mt-2"></div>
                  <span className="text-gray-700 flex-1 leading-relaxed">{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Opportunities */}
        {insights.opportunities && insights.opportunities.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Opportunities</h3>
            </div>
            <ul className="space-y-3">
              {insights.opportunities.map((opportunity, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 mt-2"></div>
                  <span className="text-gray-700 flex-1 leading-relaxed">{opportunity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
        </>
      )}

      {/* P&L Analysis Tab */}
      {activeTab === 'pl-analysis' && (
        <PLAnalysisPanel documentId={documentId} />
      )}
    </div>
  )
}
