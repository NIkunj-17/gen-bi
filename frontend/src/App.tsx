import { useState } from 'react'
import Sidebar from './components/Sidebar'
import QueryBar from './components/QueryBar'
import ExplanationBanner from './components/ExplanationBanner'
import ResultsPanel from './components/ResultsPanel'

export interface QueryResult {
  success: boolean
  question: string
  sql: string
  explanation: string
  chart_type: string
  chart_config: { x_axis: string; y_axis: string; title: string }
  data: Record<string, any>[]
  columns: string[]
  row_count: number
  error: string | null
  recovered: boolean
}

export interface ConversationTurn {
  question: string
  response: QueryResult
}

export default function App() {
  const [result, setResult]   = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [schema, setSchema]   = useState('college_2')
  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [error, setError]     = useState<string | null>(null)

  const handleQuery = async (question: string) => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('http://127.0.0.1:8000/api/query', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          schema_name: schema,
          conversation_history: history.slice(-3).map(h => ({
            question: h.question,
            response: h.response
          }))
        })
      })
      const data: QueryResult = await res.json()
      if (data.success) {
        setResult(data)
        setHistory(prev => [...prev, { question, response: data }])
      } else {
        setError(data.error || 'Query failed')
      }
    } catch {
      setError('Could not connect to backend')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        schema={schema}
        onSchemaChange={setSchema}
        history={history}
        onHistoryClick={turn => setResult(turn.response)}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <QueryBar
          onSubmit={handleQuery}
          onSchemaChange={setSchema}
          loading={loading}
          currentSchema={schema}
        />
        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700 text-sm">
            {error}
          </div>
        )}
        {result && (
          <>
            <ExplanationBanner
              explanation={result.explanation}
              sql={result.sql}
              recovered={result.recovered}
            />
            <ResultsPanel result={result} />
          </>
        )}
        {!result && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-2xl font-semibold text-gray-800">Ask your data anything</p>
              <p className="text-gray-400 text-sm">Select a database and type a question in plain English</p>
            </div>
          </div>
        )}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/>
              <p className="text-sm text-gray-500">Generating SQL and fetching data...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}