'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import WaterfallChart from './WaterfallChart'
import { parsePLDocument, getPLWaterfall, exportPLData } from '@/lib/api'

interface PLAnalysisPanelProps {
  documentId: number
}

interface MetricOption {
  label: string
  value: string
  category: string | null
}

interface PLMetadata {
  available_periods: string[]
  suggested_period1: string[]
  suggested_period2: string[]
  metric_options: MetricOption[]
  items_needing_review: any[]
}

export default function PLAnalysisPanel({ documentId }: PLAnalysisPanelProps) {
  const [loading, setLoading] = useState(true)
  const [parsing, setParsing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [metadata, setMetadata] = useState<PLMetadata | null>(null)
  const [waterfallData, setWaterfallData] = useState<any>(null)

  // User selections
  const [selectedMetric, setSelectedMetric] = useState<string>('')
  const [period1Start, setPeriod1Start] = useState<string>('')
  const [period1End, setPeriod1End] = useState<string>('')
  const [period2Start, setPeriod2Start] = useState<string>('')
  const [period2End, setPeriod2End] = useState<string>('')
  const [topN, setTopN] = useState<number>(5)

  useEffect(() => {
    initializePL()
  }, [documentId])

  const initializePL = async () => {
    setLoading(true)
    try {
      const result = await parsePLDocument(documentId)

      if (result.success) {
        setMetadata(result.metadata)

        // Set default selections
        if (result.metadata.suggested_period1.length > 0) {
          setPeriod1Start(result.metadata.suggested_period1[0])
          setPeriod1End(result.metadata.suggested_period1[result.metadata.suggested_period1.length - 1])
        }

        if (result.metadata.suggested_period2.length > 0) {
          setPeriod2Start(result.metadata.suggested_period2[0])
          setPeriod2End(result.metadata.suggested_period2[result.metadata.suggested_period2.length - 1])
        }

        if (result.metadata.metric_options.length > 0) {
          setSelectedMetric(result.metadata.metric_options[0].value)
        }

        toast.success('P&L document parsed successfully')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse P&L document')
    } finally {
      setLoading(false)
    }
  }

  const generateWaterfall = async () => {
    if (!period1Start || !period1End || !period2Start || !period2End || !selectedMetric) {
      toast.error('Please select all required fields')
      return
    }

    setGenerating(true)
    try {
      const result = await getPLWaterfall(documentId, {
        metric: selectedMetric,
        period1_start: period1Start,
        period1_end: period1End,
        period2_start: period2Start,
        period2_end: period2End,
        top_n: topN
      })

      if (result.success) {
        setWaterfallData(result.waterfall)
        toast.success('Waterfall chart generated')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate waterfall chart')
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportPLData(documentId)
      toast.success('P&L data exported successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to export P&L data')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-sky-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Parsing P&L document...</p>
        </div>
      </div>
    )
  }

  if (!metadata) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-lg font-medium text-yellow-900 mb-2">Unable to Parse P&L Document</h3>
            <p className="text-sm text-yellow-800 mb-4">
              This document doesn't appear to be a P&L statement, or the format is not recognized.
            </p>
            <button
              onClick={initializePL}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
            >
              Retry Parsing
            </button>
          </div>
        </div>
      </div>
    )
  }

  const metricLabel = metadata.metric_options.find(m => m.value === selectedMetric)?.label || selectedMetric

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Waterfall Analysis Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Metric Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metric to Analyze
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none"
            >
              {metadata.metric_options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Period 1 Start */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period 1 Start
            </label>
            <select
              value={period1Start}
              onChange={(e) => setPeriod1Start(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none"
            >
              <option value="">Select period</option>
              {metadata.available_periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>

          {/* Period 1 End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period 1 End
            </label>
            <select
              value={period1End}
              onChange={(e) => setPeriod1End(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none"
            >
              <option value="">Select period</option>
              {metadata.available_periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>

          {/* Period 2 Start */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period 2 Start
            </label>
            <select
              value={period2Start}
              onChange={(e) => setPeriod2Start(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none"
            >
              <option value="">Select period</option>
              {metadata.available_periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>

          {/* Period 2 End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period 2 End
            </label>
            <select
              value={period2End}
              onChange={(e) => setPeriod2End(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none"
            >
              <option value="">Select period</option>
              {metadata.available_periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>

          {/* Top N Drivers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Top Drivers to Show
            </label>
            <input
              type="range"
              min="3"
              max="15"
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>3</span>
              <span className="font-medium text-gray-700">{topN}</span>
              <span>15</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4 mt-6">
          <button
            onClick={generateWaterfall}
            disabled={generating || !period1Start || !period1End || !period2Start || !period2End}
            className="px-6 py-3 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Generate Waterfall</span>
              </>
            )}
          </button>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {exporting ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export CSV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Waterfall Chart */}
      {waterfallData && (
        <WaterfallChart
          data={waterfallData}
          title={`${metricLabel} Bridge Analysis`}
        />
      )}

      {/* Items Needing Review */}
      {metadata.items_needing_review && metadata.items_needing_review.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-900 mb-2">
                {metadata.items_needing_review.length} Account(s) Need Review
              </h4>
              <p className="text-sm text-amber-800 mb-3">
                The following accounts were mapped with low confidence. Results may be affected.
              </p>
              <div className="bg-white rounded border border-amber-200 overflow-hidden">
                <table className="min-w-full divide-y divide-amber-200">
                  <thead className="bg-amber-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-900">Account</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-900">Mapped Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-900">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {metadata.items_needing_review.slice(0, 10).map((item, idx) => {
                      const accountKey = Object.keys(item)[0]
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item[accountKey]}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{item.category || 'Unknown'}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className="text-amber-600 font-medium">
                              {((item.mapping_confidence || 0) * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-sky-900">
            <p className="font-medium mb-1">About Waterfall Analysis</p>
            <p>
              This tool compares two time periods and shows which accounts drove the change in your selected metric.
              Green bars indicate positive impact, red bars indicate negative impact.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
