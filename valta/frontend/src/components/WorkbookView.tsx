'use client'

import { Download, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface WorkbookSheet {
  name: string
  columns: string[]
  rows: any[][]
  formulas?: { [key: string]: string }
}

interface WorkbookData {
  title: string
  sheets: WorkbookSheet[]
}

interface WorkbookViewProps {
  workbook: WorkbookData
  onExport?: () => void
}

export default function WorkbookView({ workbook, onExport }: WorkbookViewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    // Convert workbook to CSV format
    const sheet = workbook.sheets[0]
    let csv = sheet.columns.join('\t') + '\n'
    sheet.rows.forEach(row => {
      csv += row.join('\t') + '\n'
    })

    navigator.clipboard.writeText(csv)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatCellValue = (value: any) => {
    if (typeof value === 'number') {
      // Format as currency if it looks like money
      if (value >= 1000 || value <= -1000) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }).format(value)
      }
      return value.toFixed(2)
    }
    return value
  }

  const getCellFormula = (rowIdx: number, colIdx: number, sheet: WorkbookSheet) => {
    // Convert to Excel-style cell reference (e.g., B3)
    const colLetter = String.fromCharCode(65 + colIdx) // A, B, C, etc.
    const cellRef = `${colLetter}${rowIdx + 2}` // +2 because row 1 is header
    return sheet.formulas?.[cellRef]
  }

  const sheet = workbook.sheets[0] // For MVP, just show first sheet

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{workbook.title}</h2>
          <p className="text-xs text-gray-500">Generated {new Date().toLocaleDateString()}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto p-6">
        <div className="inline-block min-w-full">
          <table className="border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                {sheet.columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="border border-gray-300 px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                  {row.map((cell, colIdx) => {
                    const formula = getCellFormula(rowIdx, colIdx, sheet)
                    const isTotal = row[0]?.toString().toLowerCase().includes('total')

                    return (
                      <td
                        key={colIdx}
                        className={`border border-gray-300 px-4 py-2 text-sm ${
                          colIdx === 0 ? 'font-medium text-gray-900' : 'text-gray-700 font-mono'
                        } ${isTotal ? 'bg-blue-50 font-semibold' : ''}`}
                        title={formula ? `Formula: ${formula}` : undefined}
                      >
                        {colIdx === 0 ? (
                          <div className="flex items-center gap-2">
                            {cell}
                            {formula && (
                              <span className="text-xs text-gray-400 font-mono">
                                {formula}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-right">
                            {formatCellValue(cell)}
                            {formula && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {formula}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sheet Tabs (for future multi-sheet support) */}
        {workbook.sheets.length > 1 && (
          <div className="mt-4 flex gap-2">
            {workbook.sheets.map((s, idx) => (
              <button
                key={idx}
                className={`px-3 py-1.5 text-sm rounded-t-lg ${
                  idx === 0
                    ? 'bg-white border-t border-x border-gray-300 text-gray-900 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
