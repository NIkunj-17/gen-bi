import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import Sidebar from './components/Sidebar'
import ChatThread from './components/ChatThread'
import QueryBar from './components/QueryBar'
import UploadModal from './components/UploadModal'
import API_BASE from './config'

export interface QueryResult {
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

export default function App() {
  const { user, token, loading, login, register, logout } = useAuth()

  const [showUpload,  setShowUpload]  = useState(false)
  const [querying,    setQuerying]    = useState(false)
  const [schema,      setSchema]      = useState('college_2')
  const [history,     setHistory]     = useState<ConversationTurn[]>([])
  const [error,       setError]       = useState<string | null>(null)
  const [userSchemas, setUserSchemas] = useState<string[]>([])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"/>
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
        setHistory(prev => [...prev, { question, response: data, schema }])
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
          onSchemaChange={s => { setSchema(s); setHistory([]) }}
          history={history}
          onHistoryClick={turn => setHistory([{ ...turn, schema: turn.schema || schema }])}
          user={user}
          onLogout={logout}
          onUpload={() => setShowUpload(true)}
          userSchemas={userSchemas}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <ChatThread
            history={history}
            querying={querying}
            error={error}
            user={user}
            onFollowup={handleQuery}
            currentSchema={schema}
            onSchemaChange={(s) => { setSchema(s); setHistory([]) }}
          />
          <QueryBar
            onSubmit={handleQuery}
            onSchemaChange={setSchema}
            loading={querying}
            currentSchema={schema}
          />
        </div>
      </div>

      {showUpload && (
        <UploadModal
          token={token}
          userId={user.id}
          onSuccess={(schemaName) => {
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