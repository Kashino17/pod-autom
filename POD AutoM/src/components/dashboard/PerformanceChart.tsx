import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Loader2 } from 'lucide-react'

// =====================================================
// TYPES
// =====================================================

export interface ChartDataPoint {
  date: string
  impressions: number
  clicks: number
  sales: number
  revenue: number
}

interface PerformanceChartProps {
  data: ChartDataPoint[]
  isLoading: boolean
}

type MetricKey = 'impressions' | 'clicks' | 'sales' | 'revenue'

interface MetricConfig {
  key: MetricKey
  label: string
  color: string
  format: (value: number) => string
}

const METRICS: MetricConfig[] = [
  {
    key: 'impressions',
    label: 'Impressionen',
    color: '#8b5cf6',
    format: (v) => new Intl.NumberFormat('de-DE').format(v),
  },
  {
    key: 'clicks',
    label: 'Klicks',
    color: '#06b6d4',
    format: (v) => new Intl.NumberFormat('de-DE').format(v),
  },
  {
    key: 'sales',
    label: 'Verkäufe',
    color: '#10b981',
    format: (v) => new Intl.NumberFormat('de-DE').format(v),
  },
  {
    key: 'revenue',
    label: 'Umsatz',
    color: '#f59e0b',
    format: (v) =>
      new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v),
  },
]

// =====================================================
// CUSTOM TOOLTIP
// =====================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  selectedMetrics: MetricKey[]
}

function CustomTooltip({ active, payload, label, selectedMetrics }: CustomTooltipProps) {
  if (!active || !payload) return null

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-sm text-zinc-400 mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => {
          const metric = METRICS.find((m) => m.key === entry.name)
          if (!metric || !selectedMetrics.includes(metric.key)) return null
          return (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-zinc-300">{metric.label}</span>
              </div>
              <span className="text-sm font-medium text-white">
                {metric.format(entry.value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =====================================================
// PERFORMANCE CHART COMPONENT
// =====================================================

export function PerformanceChart({ data, isLoading }: PerformanceChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    'impressions',
    'clicks',
  ])

  const toggleMetric = (metric: MetricKey) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metric)) {
        // Don't allow deselecting all metrics
        if (prev.length === 1) return prev
        return prev.filter((m) => m !== metric)
      }
      return [...prev, metric]
    })
  }

  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-white">Performance</h3>

        {/* Metric toggles */}
        <div className="flex flex-wrap gap-2">
          {METRICS.map((metric) => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedMetrics.includes(metric.key)
                  ? 'text-white'
                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
              style={{
                backgroundColor: selectedMetrics.includes(metric.key)
                  ? `${metric.color}30`
                  : undefined,
                borderColor: selectedMetrics.includes(metric.key)
                  ? `${metric.color}50`
                  : undefined,
                borderWidth: selectedMetrics.includes(metric.key) ? 1 : 0,
              }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: metric.color }}
              />
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-80">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            Keine Daten verfügbar
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {METRICS.map((metric) => (
                  <linearGradient
                    key={metric.key}
                    id={`gradient-${metric.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={metric.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
              />
              <Tooltip
                content={<CustomTooltip selectedMetrics={selectedMetrics} />}
              />
              {METRICS.filter((m) => selectedMetrics.includes(m.key)).map((metric) => (
                <Area
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  strokeWidth={2}
                  fill={`url(#gradient-${metric.key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default PerformanceChart
