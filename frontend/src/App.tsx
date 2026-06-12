import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import Sidebar from './components/Sidebar'
import QueryBar from './components/QueryBar'
import ExplanationBanner from './components/ExplanationBanner'
import ResultsPanel from './components/ResultsPanel'
import UploadModal from './components/UploadModal'
import API_BASE from './config'

interface QueryResult {
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

interface ConversationTurn {
  question: string
  response: QueryResult
}

export default function App() {
  const { user, token, loading, login, register, logout } = useAuth()

  const [showUpload,  setShowUpload]  = useState(false)
  const [result,      setResult]      = useState<QueryResult | null>(null)
  const [querying,    setQuerying]    = useState(false)
  const [schema,      setSchema]      = useState('college_2')
  const [history,     setHistory]     = useState<ConversationTurn[]>([])
  const [error,       setError]       = useState<string | null>(null)
  const [userSchemas, setUserSchemas] = useState<string[]>([])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  if (!user || !token) {
    return <AuthPage onLogin={login} onRegister={register}/>
  }

  const handleQuery = async (question: string) => {
    setQuerying(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/query`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          schema_name:          schema,
          conversation_history: history.slice(-3).map(h => ({
            question: h.question,
            response: h.response,
          })),
        }),
      })

      if (res.status === 401) { logout(); return }

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
      setQuerying(false)
    }
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar
          schema={schema}
          onSchemaChange={setSchema}
          history={history}
          onHistoryClick={turn => setResult(turn.response)}
          user={user}
          onLogout={logout}
          onUpload={() => setShowUpload(true)}
          userSchemas={userSchemas}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <QueryBar
            onSubmit={handleQuery}
            onSchemaChange={setSchema}
            loading={querying}
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
              <ResultsPanel result={result}/>
            </>
          )}

          {!result && !querying && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-3xl">📊</p>
                <p className="text-xl font-semibold text-gray-800">
                  Welcome, {user.name}
                </p>
                <p className="text-gray-400 text-sm max-w-sm">
                  Select a database from the sidebar and ask anything
                  in plain English — or upload your own data
                </p>
                <div className="flex gap-2 justify-center pt-2">
                  <button
                    onClick={() => setShowUpload(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium"
                  >
                    Upload CSV / Excel
                  </button>
                  <button
                    onClick={() => setSchema('college_2')}
                    className="border border-gray-200 hover:bg-gray-50 text-gray-600 px-5 py-2 rounded-lg text-sm"
                  >
                    Try demo data
                  </button>
                </div>
              </div>
            </div>
          )}

          {querying && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/>
                <p className="text-sm text-gray-500">
                  Generating SQL and fetching data...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadModal
          token={token}
          userId={user.id}
          onSuccess={(schemaName, tableName) => {
            setSchema(schemaName)
            setShowUpload(false)
            setUserSchemas(prev =>
              prev.includes(schemaName) ? prev : [...prev, schemaName]
            )
          }}
          onClose={() => setShowUpload(false)}
        />
      )}
    </>
  )
}