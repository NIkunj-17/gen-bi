import { useState } from 'react'
interface Props {
  data:        Record<string, any>[]
  columns:     string[]
  rowCount:    number
  onExportCSV?: () => void
}

export default function ResultsTable({ data, columns, rowCount, onExportCSV }: Props) {
  const [showAll, setShowAll] = useState(false)
  if (!data.length) return null

  const displayed = showAll ? data : data.slice(0, 10)

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map(col => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayed.map((row, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
              >
                {columns.map(col => (
                  <td key={col} className="px-4 py-2.5 text-xs text-slate-700">
                    {row[col] !== null && row[col] !== undefined
                      ? String(row[col])
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show more / less */}
      {data.length > 10 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Showing {displayed.length} of {rowCount} rows
          </p>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            {showAll ? 'Show less' : `Show all ${rowCount} rows`}
          </button>
        </div>
      )}
    </div>
  )
}