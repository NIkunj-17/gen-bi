import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import Sidebar from './components/Sidebar'
import QueryBar from './components/QueryBar'
import ExplanationBanner from './components/ExplanationBanner'
import ResultsPanel from './components/ResultsPanel'
import { QueryResult, ConversationTurn } from './types'

export default function App() {
  const { user, token, loading, login, register, logout } = useAuth()

  const [result,  setResult]  = useState<QueryResult | null>(null)
  const [querying, setQuerying] = useState(false)
  const [schema,  setSchema]  = useState('college_2')
  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [error,   setError]   = useState<string | null>(null)

  // Show loading while checking localStorage
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  // Show auth page if not logged in
  if (!user || !token) {
    return <AuthPage onLogin={login} onRegister={register} />
  }

  const handleQuery = async (question: string) => {
    setQuerying(true)
    setError(null)
    try {
      const res  = await fetch('http://127.0.0.1:8000/api/query', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`   // send JWT token
        },
        body: JSON.stringify({
          question,
          schema_name: schema,
          conversation_history: history.slice(-3).map(h => ({
            question: h.question,
            response: h.response
          }))
        })
      })

      if (res.status === 401) {
        logout()
        return
      }

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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        schema={schema}
        onSchemaChange={setSchema}
        history={history}
        onHistoryClick={turn => setResult(turn.response)}
        user={user}
        onLogout={logout}
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
            <ResultsPanel result={result} />
          </>
        )}
        {!result && !querying && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-2xl font-semibold text-gray-800">
                Welcome, {user.name}
              </p>
              <p className="text-gray-400 text-sm">
                Select a database and ask anything in plain English
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Role: {user.role}
              </p>
            </div>
          </div>
        )}
        {querying && (
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