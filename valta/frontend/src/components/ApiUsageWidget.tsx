'use client'

import { useState, useEffect } from 'react'

interface ApiUsageStats {
  total_requests_24h: number
  total_cost_24h: number
  total_cost_alltime: number
  total_tokens_24h: number
  most_used_model: string | null
  monthly_budget: number
  remaining_credits: number
  usage_percentage: number
  month_cost: number
}

export default function ApiUsageWidget() {
  const [stats, setStats] = useState<ApiUsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/usage/live')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch immediately
    fetchUsageStats()

    // Refresh every 30 seconds
    const interval = setInterval(fetchUsageStats, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="px-4 py-3 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse"></div>
          <span>Loading usage...</span>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  // Determine credit status color
  const creditColor = stats.remaining_credits > stats.monthly_budget * 0.5
    ? 'text-green-400'
    : stats.remaining_credits > stats.monthly_budget * 0.2
    ? 'text-yellow-400'
    : 'text-red-400'

  return (
    <div className="px-4 py-3 border-t border-gray-800 bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400">API Credits</span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>

      {/* Remaining Credits - Prominent Display */}
      <div className="mb-3 p-2 bg-gray-900/50 rounded-lg border border-gray-800">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-400">Remaining</span>
          <span className={`text-lg font-mono font-bold ${creditColor}`}>
            ${stats.remaining_credits.toFixed(2)}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              stats.usage_percentage > 80 ? 'bg-red-500' :
              stats.usage_percentage > 50 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, stats.usage_percentage)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-gray-500">${stats.month_cost.toFixed(2)} used</span>
          <span className="text-gray-500">${stats.monthly_budget.toFixed(0)} budget</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="space-y-2">
        {/* Cost Today */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Today</span>
          <span className="text-xs font-mono font-medium text-green-400">
            ${stats.total_cost_24h.toFixed(4)}
          </span>
        </div>

        {/* Requests */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Requests</span>
          <span className="text-xs font-mono text-gray-300">
            {stats.total_requests_24h}
          </span>
        </div>

        {/* Tokens */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Tokens</span>
          <span className="text-xs font-mono text-gray-300">
            {stats.total_tokens_24h.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Model Badge */}
      {stats.most_used_model && (
        <div className="mt-2 pt-2 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            Model: <span className="text-blue-400 font-medium">
              {stats.most_used_model.includes('claude') ? 'Claude 3.7' :
               stats.most_used_model.includes('gpt') ? 'GPT-4' :
               stats.most_used_model}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
