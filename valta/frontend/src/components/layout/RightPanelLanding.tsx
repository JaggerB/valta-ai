'use client'

import { Upload, TrendingUp, FileText, Clock } from 'lucide-react'

interface RightPanelLandingProps {
  onUploadClick: () => void
  onAnalysisClick: (type: string) => void
  recentAnalyses?: Array<{
    id: string
    title: string
    type: string
    timestamp: Date
  }>
}

export default function RightPanelLanding({
  onUploadClick,
  onAnalysisClick,
  recentAnalyses = []
}: RightPanelLandingProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Upload Section */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Quick Actions
        </h3>
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Recent Analyses */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Recent Analyses
        </h3>

        <div className="space-y-2">
          {/* Startup Metrics */}
          <button
            onClick={() => onAnalysisClick('startup-metrics')}
            className="w-full flex items-center gap-3 px-3 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Startup Metrics</p>
              <p className="text-xs text-gray-500">Burn, runway, growth</p>
            </div>
          </button>

          {/* Dynamic Recent Analyses */}
          {recentAnalyses.map((analysis) => (
            <button
              key={analysis.id}
              onClick={() => onAnalysisClick(analysis.type)}
              className="w-full flex items-center gap-3 px-3 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <FileText className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{analysis.title}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {analysis.timestamp.toLocaleDateString()}
                </p>
              </div>
            </button>
          ))}

          {recentAnalyses.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p>No recent analyses yet</p>
              <p className="text-xs mt-1">Upload a document to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="p-4 border-t border-gray-200 bg-blue-50">
        <p className="text-xs font-medium text-blue-900 mb-1">💡 Pro Tip</p>
        <p className="text-xs text-blue-700">
          Upload your P&L, Balance Sheet, or Trial Balance to get instant insights and AI-powered analysis.
        </p>
      </div>
    </div>
  )
}
