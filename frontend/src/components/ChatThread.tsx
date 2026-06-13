import { useEffect, useRef, useState } from 'react'

interface QueryResult {
  success:      boolean
  question:     string
  sql:          string
  explanation:  string
  chart_type:   string
  chart_config: { x_axis: string; y_axis: string; title: string }
  data:         Record<string, any>[]
  columns:      string[]
  row_count:    number
  error:        string | null
  recovered:    boolean
  insight:      string
  followups:    string[]
}

interface ConversationTurn {
  question: string
  response: QueryResult
  schema:   string
}

interface Props {
  history:       ConversationTurn[]
  querying:      boolean
  error:         string | null
  user:          { name: string; email: string; role: string }
  onFollowup:    (q: string) => void
  currentSchema: string
}
interface Props {
  history:        ConversationTurn[]
  querying:       boolean
  error:          string | null
  user:           { name: string; email: string; role: string }
  onFollowup:     (q: string) => void
  currentSchema:  string
  onSchemaChange: (s: string) => void
}


import ChartRenderer from './ChartRenderer'
import ResultsTable from './ResultsTable'

function ResultCard({
  result,
  onFollowup,
  schema,
  onSchemaChange
}: {
  result: QueryResult
  onFollowup: (q: string) => void
  schema: string
  onSchemaChange: (s: string) => void
}) {
  const [showChart, setShowChart] = useState(false)
  const [showSQL,   setShowSQL]   = useState(false)

  const exportCSV = () => {
    const header = result.columns.join(',')
    const rows   = result.data.map(row =>
      result.columns.map(col => `"${row[col] ?? ''}"`).join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = 'genbi-export.csv'
    a.click()
  }

  const hasChart = result.chart_type !== 'table' && result.data.length > 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{result.row_count}</span> rows
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
            {schema}
          </span>
          {result.recovered && (
            <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
              Auto-recovered
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasChart && (
            <button
              onClick={() => setShowChart(!showChart)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                showChart
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              {showChart ? 'Hide chart' : `Visualize (${result.chart_type})`}
            </button>
          )}
          <button
            onClick={exportCSV}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
            title="Export CSV"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Insight */}
      {result.insight && (
        <div className="mx-4 mt-3 flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5">
          <div className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-2.5 h-2.5 text-indigo-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          </div>
          <p className="text-xs text-indigo-800 leading-relaxed">{result.insight}</p>
        </div>
      )}

      {/* Chart — shown only after clicking Visualize */}
      {showChart && hasChart && (
        <div className="px-4 pt-3 pb-1 border-b border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
            {result.chart_config.title}
          </p>
          <ChartRenderer
            chartType={result.chart_type}
            chartConfig={result.chart_config}
            data={result.data}
          />
        </div>
      )}

      {/* Data table — always shown */}
      <ResultsTable
        data={result.data}
        columns={result.columns}
        rowCount={result.row_count}
      />

      {/* SQL + explanation footer */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 bg-slate-50">
        <button
          onClick={() => setShowSQL(!showSQL)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
          </svg>
          {showSQL ? 'Hide SQL' : 'View SQL'}
        </button>
        <span className="text-slate-200">|</span>
        <p className="text-xs text-slate-400 truncate flex-1">{result.explanation}</p>
      </div>

      {/* SQL panel */}
      {showSQL && (
        <div className="mx-4 mb-3">
          <pre className="bg-slate-900 text-emerald-400 text-xs rounded-lg p-3 overflow-x-auto leading-relaxed font-mono">
            {result.sql}
          </pre>
        </div>
      )}

      {/* Follow-ups */}
      {result.followups?.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
            Suggested follow-ups
          </p>
          <div className="flex flex-wrap gap-2">
            {result.followups.map((q, i) => (
              <button
                key={i}
                 onClick={() => {
      // Switch to the schema that produced this result
      onSchemaChange(schema)
      onFollowup(q)
    }}
                className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition-all text-left"
              >
                {q} →
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChatThread({
  history, querying, error, user, onFollowup, currentSchema, onSchemaChange
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, querying])

  if (history.length === 0 && !querying && !error) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Welcome back, {user.name}</h2>
            <p className="text-slate-400 text-sm mt-1">
              Ask a question in plain English to analyze your data
            </p>
          </div>

          {/* Example queries */}
          <div className="grid grid-cols-2 gap-2">
            {[
  { q: 'How many students are in each department?',  schema: 'college_2', icon: '🎓' },
  { q: 'Show top 5 students by total credits',       schema: 'college_2', icon: '📊' },
  { q: 'Which car makers are from the USA?',         schema: 'car_1',     icon: '🚗' },
  { q: 'Show total revenue by year',                 schema: 'store_1',   icon: '💰' },
  { q: 'Percentage of tracks by genre',              schema: 'store_1',   icon: '🎵' },
  { q: 'Show weight vs horsepower correlation',      schema: 'car_1',     icon: '⚙️' },
].map((item, i) => (
  <button
    key={i}
    onClick={() => {
      onFollowup(item.q)
    }}
    className="text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-300 hover:shadow-sm transition-all group"
  >
    <span className="text-lg block mb-1">{item.icon}</span>
    <p className="text-xs text-slate-700 font-medium leading-snug group-hover:text-indigo-700">
      {item.q}
    </p>
    <p className="text-[10px] text-slate-400 mt-1 font-mono">{item.schema}</p>
  </button>
))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 bg-slate-50">
      {history.map((turn, i) => (
        <div key={i} className="space-y-3 max-w-4xl mx-auto">
          {/* User bubble */}
          <div className="flex justify-end">
            <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-xl text-sm leading-relaxed shadow-sm">
              {turn.question}
            </div>
          </div>

          {/* AI response */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              {turn.response.success ? (
                <ResultCard
  result={turn.response}
  onFollowup={onFollowup}
  schema={turn.schema || currentSchema}
  onSchemaChange={onSchemaChange}
/>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  {turn.response.error || 'Query failed'}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Loading */}
      {querying && (
        <div className="flex gap-3 max-w-4xl mx-auto">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className="flex gap-1">
              {[0,1,2].map(j => (
                <span
                  key={j}
                  className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${j*150}ms` }}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400">
              Analyzing schema, generating SQL, fetching results...
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div ref={bottomRef}/>
    </div>
  )
}