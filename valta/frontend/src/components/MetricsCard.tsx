'use client'

interface MetricsCardProps {
  label: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  format?: 'currency' | 'percent' | 'number' | 'months'
  status?: 'positive' | 'negative' | 'warning' | 'neutral'
  icon?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function MetricsCard({
  label,
  value,
  subtitle,
  trend,
  trendValue,
  format = 'number',
  status,
  icon,
  size = 'md'
}: MetricsCardProps) {

  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val)

      case 'percent':
        return `${val.toFixed(1)}%`

      case 'months':
        return `${val.toFixed(1)} months`

      default:
        return val.toLocaleString()
    }
  }

  const getStatusColor = () => {
    if (status === 'positive') return 'text-green-600 bg-green-50 border-green-200'
    if (status === 'negative') return 'text-red-600 bg-red-50 border-red-200'
    if (status === 'warning') return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-gray-900 bg-white border-gray-200'
  }

  const getTrendIcon = () => {
    if (trend === 'up') {
      return (
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
        </svg>
      )
    }
    if (trend === 'down') {
      return (
        <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
        </svg>
      )
    }
    return null
  }

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const valueSizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl'
  }

  return (
    <div className={`rounded-lg border ${getStatusColor()} ${sizeClasses[size]} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            {icon && <div className="text-gray-500">{icon}</div>}
            <p className="text-sm font-medium text-gray-600">{label}</p>
          </div>

          <p className={`${valueSizeClasses[size]} font-bold tracking-tight`}>
            {formatValue(value)}
          </p>

          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}

          {(trend || trendValue) && (
            <div className="flex items-center space-x-1 mt-2">
              {getTrendIcon()}
              {trendValue && (
                <span className={`text-sm font-medium ${
                  trend === 'up' ? 'text-green-600' :
                  trend === 'down' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
