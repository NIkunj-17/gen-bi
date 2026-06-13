import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'

interface Props {
  chartType:   string
  chartConfig: { x_axis: string; y_axis: string; title: string }
  data:        Record<string, any>[]
}

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#14b8a6', '#a855f7', '#64748b',
]

function detectUnit(col: string): string {
  const c = col.toLowerCase()
  if (['revenue','sales','total','amount','price','cost','salary','income','profit'].some(k => c.includes(k))) return '$'
  if (['percent','pct','rate'].some(k => c.includes(k))) return '%'
  if (['weight','kg'].some(k => c.includes(k))) return 'kg'
  return ''
}

function fmtNum(v: any, unit: string): string {
  const n = parseFloat(v)
  if (isNaN(n)) return String(v)
  if (unit === '$') {
    if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `$${(n/1_000).toFixed(1)}K`
    return `$${n.toFixed(2)}`
  }
  if (unit === '%') return `${n.toFixed(1)}%`
  if (unit)         return `${n.toLocaleString()} ${unit}`
  return n % 1 === 0 ? n.toLocaleString() : n.toFixed(2)
}

function fmtLabel(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const TooltipBox = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      {label && <p style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill || '#6366f1' }}>
          {fmtLabel(p.name || p.dataKey)}: <strong>{fmtNum(p.value, unit)}</strong>
        </p>
      ))}
    </div>
  )
}

export default function ChartRenderer({ chartType, chartConfig, data }: Props) {
  if (!data || !data.length) return null

  const { x_axis, y_axis } = chartConfig
  const unit   = detectUnit(y_axis)
  const xLabel = fmtLabel(x_axis)
  const yLabel = fmtLabel(y_axis) + (unit ? ` (${unit})` : '')

  // Common axis styles
  const tickStyle = { fontSize: 11, fill: '#94a3b8' }
  const gridStyle = { strokeDasharray: '3 3', stroke: '#f1f5f9', vertical: false }
  const margin    = { top: 16, right: 24, left: 8, bottom: 64 }

  if (chartType === 'pie') {
  // Convert string values to numbers for pie chart
  const pieData = data.map(row => ({
    ...row,
    [y_axis]: parseFloat(row[y_axis]) || 0
  }))

  return (
    <div style={{ width: '100%', height: 360 }}>
      <ResponsiveContainer width="100%" height={360}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey={y_axis}
            nameKey={x_axis}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={130}
            paddingAngle={2}
            stroke="none"
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]}/>
            ))}
          </Pie>
          <Tooltip
           formatter={(v: any, name: any) => [fmtNum(v, unit), fmtLabel(String(name))]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span style={{ fontSize: 11, color: '#475569' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={margin}>
          <CartesianGrid {...gridStyle}/>
          <XAxis
            dataKey={x_axis}
            tick={tickStyle}
            angle={-30}
            textAnchor="end"
            interval={0}
            height={60}
            label={{ value: xLabel, position: 'insideBottom', offset: -50, fontSize: 11, fill: '#cbd5e1' }}
          />
          <YAxis
            tickFormatter={v => fmtNum(v, unit)}
            tick={tickStyle}
            width={70}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#cbd5e1' }}
          />
          <Tooltip content={<TooltipBox unit={unit}/>}/>
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={fmtLabel}
          />
          <Line
            type="monotone"
            dataKey={y_axis}
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#6366f1' }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={margin}>
          <CartesianGrid {...gridStyle}/>
          <XAxis
            dataKey={x_axis}
            type="number"
            tick={tickStyle}
            height={60}
            label={{ value: xLabel, position: 'insideBottom', offset: -50, fontSize: 11, fill: '#cbd5e1' }}
          />
          <YAxis
            dataKey={y_axis}
            type="number"
            tickFormatter={v => fmtNum(v, unit)}
            tick={tickStyle}
            width={70}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#cbd5e1' }}
          />
          <Tooltip content={<TooltipBox unit={unit}/>}/>
          <Scatter data={data} fill="#6366f1" opacity={0.75}/>
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  // Default — bar chart
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={margin}>
        <CartesianGrid {...gridStyle}/>
        <XAxis
          dataKey={x_axis}
          tick={tickStyle}
          angle={-30}
          textAnchor="end"
          interval={0}
          height={60}
          label={{ value: xLabel, position: 'insideBottom', offset: -50, fontSize: 11, fill: '#cbd5e1' }}
        />
        <YAxis
          tickFormatter={v => fmtNum(v, unit)}
          tick={tickStyle}
          width={70}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#cbd5e1' }}
        />
        <Tooltip content={<TooltipBox unit={unit}/>}/>
        <Bar
          dataKey={y_axis}
          fill="#6366f1"
          radius={[4, 4, 0, 0]}
          maxBarSize={52}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}