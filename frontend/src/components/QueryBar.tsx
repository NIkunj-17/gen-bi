import { useState, KeyboardEvent } from 'react'

interface Props {
  onSubmit: (q: string) => void
  onSchemaChange: (s: string) => void
  loading: boolean
  currentSchema: string
}

const SUGGESTIONS = [
  { question: 'How many students are in each department?',        schema: 'college_2' },
  { question: 'Show top 5 students by total credits',             schema: 'college_2' },
  { question: 'Average instructor salary by department',          schema: 'college_2' },
  { question: 'Which car makers are from the USA?',               schema: 'car_1'     },
  { question: 'Relationship between car weight and horsepower',   schema: 'car_1'     },
  { question: 'Show total invoice amount by year',                schema: 'store_1'   },
  { question: 'Percentage of tracks by genre',                    schema: 'store_1'   },
  { question: 'Total sales by country',                           schema: 'store_1'   },
]

export default function QueryBar({ onSubmit, onSchemaChange, loading, currentSchema }: Props) {
  const [question, setQuestion] = useState('')

  const submit = () => {
    if (question.trim() && !loading) onSubmit(question.trim())
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
  }

  const handleSuggestion = (s: typeof SUGGESTIONS[0]) => {
    setQuestion(s.question)
    if (s.schema !== currentSchema) onSchemaChange(s.schema)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about your data..."
          disabled={loading}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={submit}
          disabled={loading || !question.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => handleSuggestion(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              s.schema === currentSchema
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'
            }`}
          >
            {s.schema !== currentSchema && (
              <span className="text-gray-400 mr-1">[{s.schema}]</span>
            )}
            {s.question}
          </button>
        ))}
      </div>
    </div>
  )
}