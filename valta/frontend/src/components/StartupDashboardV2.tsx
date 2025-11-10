'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { TrendingUp, TrendingDown, DollarSign, Clock, Target } from 'lucide-react'
import { getStartupDashboard, StartupMetrics, Commentary } from '@/lib/api'

interface StartupDashboardV2Props {
  documentId: number
  onMetricsChange?: (metrics: StartupMetrics | null, commentary: Commentary | null) => void
}

export default function StartupDashboardV2({ documentId, onMetricsChange }: StartupDashboardV2Props) {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<StartupMetrics | null>(null)
  const [commentary, setCommentary] = useState<Commentary | null>(null)
  const [cashBalance, setCashBalance] = useState<string>('1000000')
  const [companyName, setCompanyName] = useState<string>('')

  useEffect(() => {
    loadDashboard()
  }, [documentId])

  useEffect(() => {
    onMetricsChange?.(metrics, commentary)
  }, [metrics, commentary])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const cashNum = cashBalance ? parseFloat(cashBalance) : undefined
      const result = await getStartupDashboard(documentId, cashNum, companyName || undefined)

      if (result.success) {
        setMetrics(result.metrics)
        setCommentary(result.commentary)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    const abs = Math.abs(value)
    if (abs >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
    if (abs >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Analyzing financials...</p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center max-w-md">
          <p className="text-sm text-gray-500 mb-4">Unable to analyze this document</p>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const burn = metrics.burn_rate
  const runway = metrics.runway
  const growth = metrics.growth

  return (
    <div className="h-full overflow-y-auto">
      {/* Top Toolbar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-gray-900">Financial Analysis</h2>
            <div className="text-xs text-gray-500">
              Updated {new Date().toLocaleDateString()}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Cash Balance:</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                <input
                  type="number"
                  value={cashBalance}
                  onChange={(e) => setCashBalance(e.target.value)}
                  onBlur={loadDashboard}
                  className="w-32 pl-5 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={loadDashboard}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Key Metrics Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Metric</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Value</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Formula</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Burn Rate */}
              {burn && (
                <>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">Net Burn Rate</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-semibold text-gray-900">
                        {formatCurrency(burn.net_burn_avg)}/mo
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-xs text-gray-500">
                        Revenue - Expenses
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {burn.burn_rate_trend_direction === 'increasing' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                          <TrendingUp className="w-3 h-3" />
                          Increasing
                        </span>
                      ) : burn.burn_rate_trend_direction === 'decreasing' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <TrendingDown className="w-3 h-3" />
                          Decreasing
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Stable</span>
                      )}
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">Gross Burn</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-semibold text-gray-900">
                        {formatCurrency(burn.gross_burn_avg)}/mo
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-xs text-gray-500">
                        Total Expenses
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-500">-</span>
                    </td>
                  </tr>
                </>
              )}

              {/* Runway */}
              {runway && runway.months_remaining && (
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">Runway</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-semibold text-gray-900">
                      {runway.months_remaining.toFixed(1)} months
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-xs text-gray-500">
                      Cash / Net Burn
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {runway.status === 'critical' ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                        Critical
                      </span>
                    ) : runway.status === 'concerning' ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                        Warning
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                        Healthy
                      </span>
                    )}
                  </td>
                </tr>
              )}

              {/* Growth */}
              {growth && (
                <>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">MoM Growth</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono font-semibold ${
                        growth.mom_growth_latest > 0 ? 'text-green-600' :
                        growth.mom_growth_latest < 0 ? 'text-red-600' :
                        'text-gray-900'
                      }`}>
                        {formatPercent(growth.mom_growth_latest)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-xs text-gray-500">
                        (Current - Previous) / Previous
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {growth.mom_growth_latest > 10 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <TrendingUp className="w-3 h-3" />
                          Strong
                        </span>
                      ) : growth.mom_growth_latest < 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                          <TrendingDown className="w-3 h-3" />
                          Declining
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Moderate</span>
                      )}
                    </td>
                  </tr>

                  {growth.cmgr !== 0 && (
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">CMGR</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-semibold text-gray-900">
                          {formatPercent(growth.cmgr)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-xs text-gray-500">
                          Compound Monthly Growth Rate
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-gray-500">-</span>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Expense Breakdown Table */}
        {metrics.expense_drivers && metrics.expense_drivers.top_expenses.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Top Expense Categories
              </h3>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Change</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">% Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.expense_drivers.top_expenses.map((expense, idx) => {
                  const changePercent = expense.change_percent
                  const isIncrease = changePercent > 0

                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{expense.account}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-gray-900">
                          {formatCurrency(expense.latest_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                          {isIncrease ? '+' : ''}{formatCurrency(expense.change_dollar)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                          {formatPercent(changePercent)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
