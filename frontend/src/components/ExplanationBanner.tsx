import { useState } from 'react'

interface Props {
  explanation: string
  sql: string
  recovered: boolean
}

export default function ExplanationBanner({ explanation, sql, recovered }: Props) {
  const [showSql, setShowSql] = useState(false)

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-blue-800">{explanation}</p>
        <div className="flex items-center gap-2 shrink-0">
          {recovered && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Auto-fixed
            </span>
          )}
          <button
            onClick={() => setShowSql(!showSql)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {showSql ? 'Hide SQL' : 'Show SQL'}
          </button>
        </div>
      </div>
      {showSql && (
        <pre className="text-xs bg-white border border-blue-200 rounded p-3 overflow-x-auto text-gray-700">
          {sql}
        </pre>
      )}
    </div>
  )
}