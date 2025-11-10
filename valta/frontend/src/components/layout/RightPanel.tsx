'use client'

import React, { useState } from 'react'
import { Calculator, MessageSquare, History, ChevronDown, ChevronRight } from 'lucide-react'

interface RightPanelProps {
  metrics?: any
  commentary?: any
  onCalculate?: () => void
  calculating?: boolean
}

export default function RightPanel({ metrics, commentary, onCalculate, calculating }: RightPanelProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [showInsights, setShowInsights] = useState(true)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onCalculate}
          disabled={calculating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Calculator className="w-4 h-4" />
          {calculating ? 'Calculating...' : 'Calculate Metrics'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* AI Insights Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <MessageSquare className="w-4 h-4" />
              AI Insights
            </div>
            {showInsights ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showInsights && (
            <div className="px-4 pb-4 space-y-3">
              {commentary ? (
                <>
                  {commentary.executive_summary && (
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {commentary.executive_summary}
                    </div>
                  )}

                  {commentary.key_takeaways && commentary.key_takeaways.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Key Takeaways</p>
                      <ul className="space-y-1.5 text-sm text-gray-700">
                        {commentary.key_takeaways.map((takeaway: string, idx: number) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Calculate metrics to see AI insights
                </p>
              )}
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <History className="w-4 h-4" />
              History
            </div>
            {showHistory ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showHistory && (
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-500 italic">No recent changes</p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {metrics && (
          <div className="p-4 space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Quick Stats</h3>

            <div className="space-y-3">
              {metrics.burn_rate && metrics.burn_rate.net_burn_rate !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Net Burn Rate</div>
                  <div className="text-lg font-semibold text-gray-900">
                    ${Math.abs(metrics.burn_rate.net_burn_rate).toLocaleString()}/mo
                  </div>
                </div>
              )}

              {metrics.runway && metrics.runway.months_remaining !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Runway</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {metrics.runway.months_remaining.toFixed(1)} months
                  </div>
                </div>
              )}

              {metrics.growth && metrics.growth.mom_growth_rate !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">MoM Growth</div>
                  <div className={`text-lg font-semibold ${
                    metrics.growth.mom_growth_rate > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metrics.growth.mom_growth_rate > 0 ? '+' : ''}
                    {metrics.growth.mom_growth_rate.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
