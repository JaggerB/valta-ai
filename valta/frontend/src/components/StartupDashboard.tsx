'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import MetricsCard from './MetricsCard'
import CommentaryPanel from './CommentaryPanel'
import { getStartupDashboard, getStartupCommentary, StartupMetrics, Commentary } from '@/lib/api'

interface StartupDashboardProps {
  documentId: number
}

export default function StartupDashboard({ documentId }: StartupDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  const [metrics, setMetrics] = useState<StartupMetrics | null>(null)
  const [commentary, setCommentary] = useState<Commentary | null>(null)
  const [documentInfo, setDocumentInfo] = useState<any>(null)

  // User inputs
  const [cashBalance, setCashBalance] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [documentId])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const cashNum = cashBalance ? parseFloat(cashBalance) : undefined
      const result = await getStartupDashboard(documentId, cashNum, companyName || undefined)

      if (result.success) {
        setMetrics(result.metrics)
        setCommentary(result.commentary)
        setDocumentInfo(result.document_info)
        toast.success('Dashboard loaded successfully')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateCommentary = async () => {
    setRegenerating(true)
    try {
      const result = await getStartupCommentary(documentId, true)
      if (result.success) {
        setCommentary(result.commentary)
        toast.success('Commentary regenerated successfully')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate commentary')
    } finally {
      setRegenerating(false)
    }
  }

  const handleUpdateSettings = () => {
    loadDashboard()
    setShowSettings(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-sky-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Analyzing your financials...</p>
          <p className="text-gray-400 text-sm mt-2">This may take up to 60 seconds</p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Unable to Analyze Document</h3>
            <p className="text-sm text-red-800 mb-4">
              This document doesn't appear to be a valid P&L statement, or the format is not recognized.
            </p>
            <button
              onClick={loadDashboard}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Retry Analysis
            </button>
          </div>
        </div>
      </div>
    )
  }

  const burn = metrics.burn_rate
  const runway = metrics.runway
  const growth = metrics.growth
  const efficiency = metrics.efficiency
  const insights = metrics.insights || []

  return (
    <div className="space-y-6">
      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Cash Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={cashBalance}
                  onChange={(e) => setCashBalance(e.target.value)}
                  placeholder="1000000"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Optional: Enter current cash to calculate runway
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: For personalized reports
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-6">
            <button
              onClick={handleUpdateSettings}
              className="px-6 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors"
            >
              Update Dashboard
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showSettings && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowSettings(true)}
            className="text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Add Cash Balance & Company Name</span>
          </button>
        </div>
      )}

      {/* Key Insights Banner */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.slice(0, 3).map((insight, idx) => {
            const bgColor = insight.type === 'positive' ? 'bg-green-50 border-green-200' :
              insight.type === 'warning' ? 'bg-red-50 border-red-200' :
                'bg-amber-50 border-amber-200'

            const textColor = insight.type === 'positive' ? 'text-green-800' :
              insight.type === 'warning' ? 'text-red-800' :
                'text-amber-800'

            const iconColor = insight.type === 'positive' ? 'text-green-600' :
              insight.type === 'warning' ? 'text-red-600' :
                'text-amber-600'

            return (
              <div key={idx} className={`${bgColor} border rounded-lg p-4 flex items-start space-x-3`}>
                <svg className={`w-5 h-5 ${iconColor} mt-0.5 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className={`text-sm ${textColor} font-medium`}>{insight.message}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {burn && (
          <MetricsCard
            label="Net Burn Rate"
            value={burn.net_burn_avg}
            format="currency"
            subtitle="Average monthly"
            trend={burn.burn_rate_trend_direction === 'increasing' ? 'up' : burn.burn_rate_trend_direction === 'decreasing' ? 'down' : 'neutral'}
            trendValue={burn.burn_rate_trend ? `${Math.abs(burn.burn_rate_trend).toFixed(1)}% ${burn.burn_rate_trend_direction}` : undefined}
            status={burn.burn_rate_trend_direction === 'increasing' ? 'warning' : 'neutral'}
            size="lg"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        )}

        {runway && runway.months_remaining && (
          <MetricsCard
            label="Runway Remaining"
            value={runway.months_remaining}
            format="months"
            subtitle={runway.status === 'critical' ? 'Critical - fundraise now!' : runway.status === 'concerning' ? 'Start fundraising soon' : runway.status}
            status={
              runway.status === 'critical' ? 'negative' :
                runway.status === 'concerning' ? 'warning' :
                  'positive'
            }
            size="lg"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        )}

        {growth && (
          <MetricsCard
            label="Revenue Growth (MoM)"
            value={growth.mom_growth_latest}
            format="percent"
            subtitle="Last month"
            trend={growth.mom_growth_latest > 0 ? 'up' : growth.mom_growth_latest < 0 ? 'down' : 'neutral'}
            trendValue={growth.growth_trend ? `Trend: ${growth.growth_trend}` : undefined}
            status={growth.mom_growth_latest > 10 ? 'positive' : growth.mom_growth_latest < 0 ? 'negative' : 'neutral'}
            size="lg"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        )}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {burn && (
          <MetricsCard
            label="Gross Burn"
            value={burn.gross_burn_avg}
            format="currency"
            subtitle="Total expenses/month"
          />
        )}

        {efficiency && efficiency.burn_multiple && (
          <MetricsCard
            label="Burn Multiple"
            value={`${efficiency.burn_multiple}x`}
            subtitle={`Efficiency: ${efficiency.efficiency_rating}`}
            status={
              efficiency.efficiency_rating === 'excellent' ? 'positive' :
                efficiency.efficiency_rating === 'poor' ? 'warning' :
                  'neutral'
            }
          />
        )}

        {growth && (
          <MetricsCard
            label="Avg Monthly Growth"
            value={growth.mom_growth_avg}
            format="percent"
            subtitle="Average across periods"
          />
        )}

        {growth && growth.cmgr !== 0 && (
          <MetricsCard
            label="CMGR"
            value={growth.cmgr}
            format="percent"
            subtitle="Compound monthly growth"
          />
        )}
      </div>

      {/* Expense Drivers */}
      {metrics.expense_drivers && metrics.expense_drivers.top_expenses.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Expense Categories</h3>

          <div className="space-y-3">
            {metrics.expense_drivers.top_expenses.map((expense, idx) => {
              const changePercent = expense.change_percent
              const isIncrease = changePercent > 0

              return (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{expense.account}</p>
                    <p className="text-sm text-gray-500">
                      ${expense.latest_amount.toLocaleString()} / month
                    </p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                        {isIncrease ? '+' : ''}{changePercent.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        ${Math.abs(expense.change_dollar).toLocaleString()} change
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Commentary */}
      {commentary && (
        <CommentaryPanel
          commentary={commentary}
          onRegenerate={handleRegenerateCommentary}
          regenerating={regenerating}
        />
      )}
    </div>
  )
}
