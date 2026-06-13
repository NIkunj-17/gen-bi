import { useState, type KeyboardEvent, useEffect } from 'react'

interface Props {
  onSubmit:       (q: string) => void
  onSchemaChange: (s: string) => void
  loading:        boolean
  currentSchema:  string
}

const SCHEMA_HINTS: Record<string, string[]> = {
  college_2: ['student','students','instructor','course','department','advisor','credits','dept','faculty','university','gpa'],
  car_1:     ['car','cars','maker','makers','vehicle','horsepower','weight','model','cylinder','mpg','automobile'],
  store_1:   ['invoice','track','tracks','album','albums','artist','artists','genre','genres','playlist','customer','music','store','revenue','billing','song'],
}

const SCHEMA_LABELS: Record<string, string> = {
  college_2: 'University DB',
  car_1:     'Auto Industry',
  store_1:   'Music Store',
}

function detectSchema(question: string): string | null {
  const q = question.toLowerCase()
  for (const [schema, keywords] of Object.entries(SCHEMA_HINTS)) {
    if (keywords.some(k => q.includes(k))) return schema
  }
  return null
}

const SUGGESTIONS = [
  { question: 'How many students are in each department?',      schema: 'college_2' },
  { question: 'Show top 5 students by total credits',           schema: 'college_2' },
  { question: 'Which car makers are from the USA?',             schema: 'car_1'     },
  { question: 'Relationship between car weight and horsepower', schema: 'car_1'     },
  { question: 'Show total invoice amount by year',              schema: 'store_1'   },
  { question: 'Percentage of tracks by genre',                  schema: 'store_1'   },
]

export default function QueryBar({ onSubmit, onSchemaChange, loading, currentSchema }: Props) {
  const [question,        setQuestion]        = useState('')
  const [focused,         setFocused]         = useState(false)
  const [warning,         setWarning]         = useState<{ detected: string } | null>(null)

  useEffect(() => {
    if (!question.trim()) { setWarning(null); return }
    const detected = detectSchema(question)
    if (detected && detected !== currentSchema) {
      setWarning({ detected })
    } else {
      setWarning(null)
    }
  }, [question, currentSchema])

const submit = () => {
  if (question.trim() && !loading) {
    // Block if there's a schema mismatch warning
    if (warning) {
      // Flash the warning to draw attention
      const el = document.getElementById('schema-warning')
      if (el) {
        el.style.transform = 'scale(1.02)'
        setTimeout(() => { el.style.transform = 'scale(1)' }, 200)
      }
      return  // Don't submit
    }
    onSubmit(question.trim())
    setQuestion('')
    setWarning(null)
  }
}

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

 const handleSuggestion = (s: typeof SUGGESTIONS[0]) => {
  setQuestion(s.question)
}

  return (
    <div className="bg-white border-t border-slate-200 px-4 py-3">

      {/* Schema mismatch warning — NO auto switch, just inform */}
      {warning && (
         <div
    id="schema-warning"
    style={{ transition: 'transform 0.15s ease' }}
    className="mb-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
  >
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <p className="text-xs text-amber-700 flex-1">
            This looks like a <strong>{SCHEMA_LABELS[warning.detected]}</strong> question.
            You're on <strong>{SCHEMA_LABELS[currentSchema] || currentSchema}</strong>.
          </p>
          <button
            onClick={() => {
              onSchemaChange(warning.detected)
              setWarning(null)
            }}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0"
          >
            Switch to {SCHEMA_LABELS[warning.detected]}
          </button>
          <button
            onClick={() => setWarning(null)}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Suggestions */}
      {focused && !question && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onMouseDown={() => handleSuggestion(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                s.schema === currentSchema
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {s.schema !== currentSchema && (
                <span className="text-slate-300 mr-1 font-mono text-[10px]">[{s.schema}]</span>
              )}
              {s.question}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={`flex gap-2 items-end border rounded-xl px-3 py-2 transition-colors ${
        focused ? 'border-indigo-400 ring-1 ring-indigo-100' : 'border-slate-200'
      } bg-white`}>
        <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded self-center shrink-0">
          {currentSchema}
        </span>

        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Ask anything about your data..."
          disabled={loading}
          rows={1}
          className="flex-1 resize-none text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent py-1"
          style={{ maxHeight: '120px' }}
        />

        <button
          onClick={submit}
          disabled={loading || !question.trim() || !!warning}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors shrink-0"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          )}
        </button>
      </div>

      <p className="text-[10px] text-slate-300 mt-1.5 text-center">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}