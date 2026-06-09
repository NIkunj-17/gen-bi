interface Props {
  data: Record<string, any>[]
  columns: string[]
  rowCount: number
  onExportCSV?: () => void
}

export default function ResultsTable({ data, columns, rowCount, onExportCSV }: Props) {
  if (!data.length) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Results</p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400">{rowCount} rows</p>
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map(col => (
                  <td key={col} className="px-4 py-2.5 text-gray-700">
                    {row[col] !== null && row[col] !== undefined
                      ? String(row[col])
                      : <span className="text-gray-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}