import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList
} from 'recharts'

interface Props {
  chartType: string
  chartConfig: { x_axis: string; y_axis: string; title: string }
  data: Record<string, any>[]
}

const COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16',
  '#f97316','#6366f1'
]

// Detect if a column name suggests currency or units
function detectUnit(colName: string): string {
  const col = colName.toLowerCase()
  if (col.includes('revenue') || col.includes('sales') ||
      col.includes('total') || col.includes('amount') ||
      col.includes('price') || col.includes('cost') ||
      col.includes('salary') || col.includes('income') ||
      col.includes('profit') || col.includes('invoice'))
    return '$'
  if (col.includes('percent') || col.includes('pct') || col.includes('rate'))
    return '%'
  if (col.includes('km') || col.includes('distance') || col.includes('mile'))
    return 'km'
  if (col.includes('kg') || col.includes('weight'))
    return 'kg'
  return ''
}

// Format axis tick values with units
function formatTick(value: any, unit: string): string {
  if (value === null || value === undefined) return ''
  const num = parseFloat(value)
  if (isNaN(num)) return String(value)
  if (unit === '$') {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000)     return `$${(num / 1_000).toFixed(1)}K`
    return `$${num.toFixed(2)}`
  }
  if (unit === '%') return `${num.toFixed(1)}%`
  if (unit)         return `${num.toLocaleString()} ${unit}`
  return num % 1 === 0
    ? num.toLocaleString()
    : num.toFixed(2)
}

// Format tooltip values
function formatTooltip(value: any, unit: string): string {
  const num = parseFloat(value)
  if (isNaN(num)) return String(value)
  if (unit === '$') return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (unit === '%') return `${num.toFixed(2)}%`
  if (unit)         return `${num.toLocaleString()} ${unit}`
  return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2)
}

// Clean up column names for display
function formatLabel(col: string): string {
  return col
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default function ChartRenderer({ chartType, chartConfig, data }: Props) {
  if (!data.length) return null

  const { x_axis, y_axis, title } = chartConfig
  const unit = detectUnit(y_axis)

  const xLabel = formatLabel(x_axis)
  const yLabel = formatLabel(y_axis) + (unit ? ` (${unit})` : '')

  const tickFormatter  = (v: any) => formatTick(v, unit)
  const tooltipFormatter = (v: any, name: string) => [
    formatTooltip(v, unit),
    formatLabel(name)
  ]

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={chartType === 'pie' ? 420 : 320}>
        {chartType === 'bar' ? (
          <BarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
            <XAxis
              dataKey={x_axis}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              angle={-35}
              textAnchor="end"
              interval={0}
              label={{ value: xLabel, position: 'insideBottom', offset: -45, fontSize: 12, fill: '#9ca3af' }}
            />
            <YAxis
              tickFormatter={tickFormatter}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              width={70}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: -5, fontSize: 12, fill: '#9ca3af' }}
            />
            <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #e5e7eb' }}/>
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={formatLabel}
            />
            <Bar dataKey={y_axis} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48}/>
          </BarChart>

        ) : chartType === 'line' ? (
          <LineChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
            <XAxis
              dataKey={x_axis}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              angle={-35}
              textAnchor="end"
              interval={0}
              label={{ value: xLabel, position: 'insideBottom', offset: -45, fontSize: 12, fill: '#9ca3af' }}
            />
            <YAxis
              tickFormatter={tickFormatter}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              width={70}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: -5, fontSize: 12, fill: '#9ca3af' }}
            />
            <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #e5e7eb' }}/>
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={formatLabel}/>
            <Line
              dataKey={y_axis}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>

        ) : chartType === 'pie' ? (
          <PieChart margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
            <Pie
              data={data}
              dataKey={y_axis}
              nameKey={x_axis}
              cx="50%"
              cy="45%"
              outerRadius={130}
              label={({ payload, percent }) =>
                `${payload[x_axis]} ${(percent * 100).toFixed(1)}%`
              }
              labelLine={true}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]}/>
              ))}
            </Pie>
            <Tooltip
              formatter={(v: any) => formatTooltip(v, unit)}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #e5e7eb' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={formatLabel}
            />
          </PieChart>

        ) : chartType === 'scatter' ? (
          <ScatterChart margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis
              dataKey={x_axis}
              type="number"
              name={xLabel}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              label={{ value: xLabel, position: 'insideBottom', offset: -45, fontSize: 12, fill: '#9ca3af' }}
            />
            <YAxis
              dataKey={y_axis}
              type="number"
              name={yLabel}
              tickFormatter={tickFormatter}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              width={70}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: -5, fontSize: 12, fill: '#9ca3af' }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={tooltipFormatter}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #e5e7eb' }}
            />
            <Scatter data={data} fill="#3b82f6" opacity={0.7}/>
          </ScatterChart>

        ) : (
          <BarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
            <Bar dataKey={y_axis} fill="#3b82f6"/>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}