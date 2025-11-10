'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

// Dynamically import Plotly for Next.js SSR compatibility
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface WaterfallChartProps {
  data: {
    categories: string[]
    values: number[]
    colors: string[]
    measures: string[]  // 'absolute', 'relative', or 'total'
    y_min: number
    period1_value: number
    period2_value: number
    total_movement: number
    total_movement_pct: number
  }
  title?: string
}

export default function WaterfallChart({ data, title }: WaterfallChartProps) {
  const chartData = useMemo(() => {
    if (!data || !data.categories || data.categories.length === 0) {
      return []
    }

    return [{
      type: 'waterfall' as const,
      x: data.categories,
      y: data.values,
      connector: {
        line: {
          color: '#94a3b8',
          width: 2,
          dash: 'dot'
        }
      },
      decreasing: { marker: { color: '#ef4444' } },
      increasing: { marker: { color: '#10b981' } },
      totals: { marker: { color: '#3b82f6' } },
      text: data.values.map(v => {
        const absValue = Math.abs(v)
        if (absValue >= 1000000) {
          return `$${(v / 1000000).toFixed(1)}M`
        } else if (absValue >= 1000) {
          return `$${(v / 1000).toFixed(1)}K`
        } else {
          return `$${v.toFixed(0)}`
        }
      }),
      textposition: 'inside' as const,
      textfont: {
        size: 11,
        color: 'white',
        family: 'Inter, system-ui, sans-serif'
      },
      hovertemplate: '%{x}<br>%{text}<extra></extra>',
      measure: data.measures,
    }]
  }, [data])

  const layout = useMemo(() => ({
    title: {
      text: title || 'Period-over-Period Bridge Analysis',
      font: {
        size: 18,
        color: '#111827',
        family: 'Inter, system-ui, sans-serif',
        weight: 600
      },
      x: 0.05,
      xanchor: 'left' as const
    },
    showlegend: false,
    autosize: true,
    height: 500,
    margin: {
      l: 80,
      r: 40,
      t: 100,
      b: 120
    },
    plot_bgcolor: '#f9fafb',
    paper_bgcolor: 'white',
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: '#374151'
    },
    xaxis: {
      title: '',
      tickangle: -45,
      tickfont: {
        size: 11,
        color: '#6b7280'
      },
      gridcolor: '#e5e7eb',
      showgrid: false
    },
    yaxis: {
      title: {
        text: 'Value ($)',
        font: {
          size: 13,
          color: '#6b7280'
        }
      },
      tickfont: {
        size: 11,
        color: '#6b7280'
      },
      gridcolor: '#e5e7eb',
      showgrid: true,
      zeroline: true,
      zerolinecolor: '#9ca3af',
      zerolinewidth: 1,
      // Start at 80% of period 1 for better visualization
      range: [data.y_min, Math.max(...data.values) * 1.1]
    },
    shapes: [],
    annotations: []
  }), [data, title])

  const config = useMemo(() => ({
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'waterfall_analysis',
      height: 600,
      width: 1200,
      scale: 2
    }
  }), [])

  if (!data || !data.categories || data.categories.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-lg font-medium text-gray-900 mb-2">No Chart Data</p>
          <p className="text-sm text-gray-600">Select periods and a metric to generate the waterfall analysis</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Period 1</p>
          <p className="text-2xl font-semibold text-gray-900">
            ${(data.period1_value / 1000).toFixed(1)}K
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Change</p>
          <p className={`text-2xl font-semibold ${data.total_movement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.total_movement >= 0 ? '+' : ''}${(data.total_movement / 1000).toFixed(1)}K
            <span className="text-sm ml-2">
              ({data.total_movement_pct >= 0 ? '+' : ''}{data.total_movement_pct.toFixed(1)}%)
            </span>
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Period 2</p>
          <p className="text-2xl font-semibold text-gray-900">
            ${(data.period2_value / 1000).toFixed(1)}K
          </p>
        </div>
      </div>

      {/* Waterfall Chart */}
      <div className="waterfall-chart-container">
        <Plot
          data={chartData}
          layout={layout}
          config={config}
          className="w-full"
          useResizeHandler={true}
          style={{ width: '100%', height: '500px' }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-gray-700">Positive Impact</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-gray-700">Negative Impact</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span className="text-gray-700">Period Totals</span>
        </div>
      </div>
    </div>
  )
}
