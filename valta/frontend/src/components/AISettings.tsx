'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface AISettingsData {
  systemPrompt: string
  companyContext: string
  model: string
  temperature: number
  customInstructions: string
}

interface AISettingsProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: AISettingsData) => Promise<void>
}

export default function AISettings({ isOpen, onClose, onSave }: AISettingsProps) {
  const [settings, setSettings] = useState<AISettingsData>({
    systemPrompt: `You are Valta, an AI CFO assistant for startups. Your role is to:

1. Analyze financial documents (P&L, Balance Sheet, Trial Balance)
2. Answer questions with clear, actionable insights
3. Generate workbooks showing your calculations
4. Speak in plain English, not accounting jargon
5. Focus on metrics that matter to startups: burn rate, runway, growth`,
    companyContext: '',
    model: 'claude-4',
    temperature: 0.7,
    customInstructions: `When answering questions:
- Always show your work in a spreadsheet format
- Use simple tables with formulas visible
- Cite which document(s) you used
- Provide context (e.g., "This is concerning because..." or "This is healthy for your stage")`
  })

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(settings)
      toast.success('Settings saved successfully')
      onClose()
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">AI Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* AI Model */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              AI Model
            </label>
            <select
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="claude-4">Claude 4 (Recommended)</option>
              <option value="claude-sonnet">Claude Sonnet (Faster)</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose the AI model for financial analysis
            </p>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Temperature: {settings.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>More focused (0.0)</span>
              <span>More creative (1.0)</span>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              System Prompt
            </label>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Define how the AI should behave and respond
            </p>
          </div>

          {/* Company Context */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Company Context
            </label>
            <textarea
              value={settings.companyContext}
              onChange={(e) => setSettings({ ...settings, companyContext: e.target.value })}
              rows={4}
              placeholder="e.g., Valta is a Series A SaaS startup building AI tools for finance teams. We have 15 employees and $2M ARR..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide context about your company to get more relevant insights
            </p>
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Custom Instructions
            </label>
            <textarea
              value={settings.customInstructions}
              onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Additional instructions for how the AI should format responses
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
