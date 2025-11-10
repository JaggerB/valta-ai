import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface Document {
  id: number
  filename: string
  original_filename: string
  file_size: number
  status: string
  processing_progress: number
  created_at: string
}

export interface DocumentListResponse {
  documents: Document[]
  total: number
}

export interface SourceCitation {
  document_id: number
  document_name: string
  page_number?: number
  section?: string
  excerpt: string
}

export interface AnalysisResponse {
  answer: string
  sources: SourceCitation[]
  confidence_score: number
  processing_time: number
}

export interface KeyMetric {
  label: string
  value: string
  change?: string
  trend?: 'up' | 'down' | 'neutral'
}

export interface DocumentInsights {
  document_id: number
  document_name: string
  summary: string
  key_metrics: KeyMetric[]
  insights: string[]
  risks: string[]
  opportunities: string[]
}

// Error handling
class APIError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'APIError'
  }
}

// Request interceptor for auth (placeholder for future implementation)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.detail || error.response.data?.message || 'An error occurred'
      throw new APIError(message, error.response.status)
    } else if (error.request) {
      // Request was made but no response received
      throw new APIError('Network error - please check your connection')
    } else {
      // Something else happened
      throw new APIError(error.message)
    }
  }
)

// Document API functions
export const uploadDocument = async (file: File): Promise<Document> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/api/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export const getDocuments = async (): Promise<DocumentListResponse> => {
  const response = await api.get('/api/documents/')
  return response.data
}

export const getDocument = async (documentId: number): Promise<Document> => {
  const response = await api.get(`/api/documents/${documentId}`)
  return response.data
}

export const deleteDocument = async (documentId: number): Promise<void> => {
  await api.delete(`/api/documents/${documentId}`)
}

export const getDocumentContent = async (documentId: number): Promise<any> => {
  const response = await api.get(`/api/documents/${documentId}/content`)
  return response.data
}

// Analysis API functions
export const askQuestion = async (
  question: string,
  documentId?: number | null
): Promise<AnalysisResponse> => {
  const payload = {
    question,
    document_id: documentId || undefined,
  }

  const response = await api.post('/api/analysis/ask', payload)
  return response.data
}

export const getDocumentInsights = async (documentId: number): Promise<DocumentInsights> => {
  const response = await api.get(`/api/analysis/document/${documentId}/insights`, {
    timeout: 60000  // 60 seconds timeout for AI analysis
  })
  return response.data
}

export const getRecentQueries = async (limit: number = 10): Promise<any[]> => {
  const response = await api.get(`/api/analysis/queries/recent?limit=${limit}`)
  return response.data
}

// Auth API functions (placeholder for future implementation)
export const login = async (username: string, password: string): Promise<any> => {
  const response = await api.post('/api/auth/login', {
    username,
    password,
  })
  return response.data
}

export const getCurrentUser = async (): Promise<any> => {
  const response = await api.get('/api/auth/me')
  return response.data
}

// Health check
export const healthCheck = async (): Promise<any> => {
  const response = await api.get('/health')
  return response.data
}

// Settings API functions
export const getAPIKeysStatus = async (): Promise<{
  openai_configured: boolean
  anthropic_configured: boolean
  current_model: string
}> => {
  const response = await api.get('/api/settings/api-keys')
  return response.data
}

export const updateAPIKeys = async (keys: {
  openai_api_key?: string
  anthropic_api_key?: string
}): Promise<{ message: string }> => {
  const response = await api.post('/api/settings/api-keys', keys)
  return response.data
}

// P&L Analysis API functions
export const parsePLDocument = async (documentId: number, hints?: {
  header_row?: number
  account_column?: string
  date_columns?: string[]
}): Promise<any> => {
  const response = await api.post(`/api/analysis/document/${documentId}/pl-parse`, hints || {}, {
    timeout: 90000  // 90 seconds for parsing
  })
  return response.data
}

export const getPLWaterfall = async (
  documentId: number,
  params: {
    metric: string
    period1_start: string
    period1_end: string
    period2_start: string
    period2_end: string
    top_n: number
  }
): Promise<any> => {
  const response = await api.post(`/api/analysis/document/${documentId}/pl-waterfall`, params, {
    timeout: 60000  // 60 seconds
  })
  return response.data
}

export const exportPLData = async (documentId: number): Promise<void> => {
  const response = await api.get(`/api/analysis/document/${documentId}/pl-export`, {
    responseType: 'blob'
  })

  // Trigger download
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `pl_export_${documentId}.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// Startup Analytics API functions
export interface StartupMetrics {
  aggregates?: any
  burn_rate?: {
    gross_burn_avg: number
    net_burn_avg: number
    net_burn_latest: number
    burn_rate_trend: number
    burn_rate_trend_direction: string
  }
  runway?: {
    months_remaining: number
    zero_cash_date?: string
    status: string
    urgency: string
    cash_balance: number
  }
  growth?: {
    mom_growth_latest: number
    mom_growth_avg: number
    overall_growth: number
    cmgr: number
    growth_trend: string
  }
  expense_drivers?: {
    top_expenses: any[]
    fastest_growing: any[]
    largest_increases: any[]
  }
  efficiency?: {
    burn_multiple?: number
    revenue_per_dollar_spent: number
    efficiency_rating: string
  }
  insights?: Array<{
    type: string
    category: string
    message: string
    priority: string
  }>
}

export interface Commentary {
  executive_summary: string
  burn_analysis: string
  growth_analysis: string
  runway_analysis: string
  expense_analysis: string
  key_takeaways: string[]
  formatted_outputs: {
    markdown: string
    plain_text: string
    json: any
  }
}

export const analyzeStartupMetrics = async (
  documentId: number,
  cashBalance?: number,
  companyName?: string
): Promise<{
  success: boolean
  metrics: StartupMetrics
  message: string
}> => {
  const response = await api.post(`/api/startup/analyze/${documentId}`, {
    cash_balance: cashBalance,
    company_name: companyName
  }, {
    timeout: 60000 // 60 seconds
  })
  return response.data
}

export const getStartupCommentary = async (
  documentId: number,
  regenerate: boolean = false
): Promise<{
  success: boolean
  commentary: Commentary
  cached: boolean
}> => {
  const response = await api.get(`/api/startup/commentary/${documentId}`, {
    params: { regenerate },
    timeout: 90000 // 90 seconds for AI generation
  })
  return response.data
}

export const getStartupDashboard = async (
  documentId: number,
  cashBalance?: number,
  companyName?: string
): Promise<{
  success: boolean
  metrics: StartupMetrics
  commentary: Commentary
  document_info: {
    id: number
    name: string
    uploaded_at?: string
  }
}> => {
  const response = await api.get(`/api/startup/dashboard/${documentId}`, {
    params: {
      cash_balance: cashBalance,
      company_name: companyName
    },
    timeout: 90000 // 90 seconds
  })
  return response.data
}

export const exportStartupReport = async (
  documentId: number,
  format: 'markdown' | 'text' | 'json' = 'markdown'
): Promise<{
  success: boolean
  format: string
  content: string | any
  content_type: string
}> => {
  const response = await api.post(`/api/startup/export/${documentId}`, {}, {
    params: { format }
  })
  return response.data
}

export const copyToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

// Workbook generation
export interface WorkbookSheet {
  name: string
  columns: string[]
  rows: any[][]
  formulas?: { [key: string]: string }
}

export interface WorkbookResponse {
  title: string
  sheets: WorkbookSheet[]
  summary: string
  conversation_id: string
}

export const generateWorkbook = async (
  question: string,
  documentId?: number
): Promise<WorkbookResponse> => {
  const response = await api.post('/api/analysis/generate-workbook', {
    question,
    document_id: documentId || null
  })
  return response.data
}

export default api