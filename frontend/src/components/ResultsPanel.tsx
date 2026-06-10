import { QueryResult } from '../types'
import ChartRenderer from './ChartRenderer'
import ResultsTable from './ResultsTable'

interface Props { result: QueryResult }

export default function ResultsPanel({ result }: Props) {
  const exportCSV = () => {
    const header = result.columns.join(',')
    const rows   = result.data.map(row =>
      result.columns.map(col => `"${row[col] ?? ''}"`).join(',')
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'genbi-export.csv'
    a.click()
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-400">Rows returned</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{result.row_count}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-400">Chart type</p>
          <p className="text-2xl font-semibold text-blue-600 mt-1 capitalize">{result.chart_type}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-400">Status</p>
          <p className={`text-sm font-medium mt-1.5 ${result.recovered ? 'text-amber-600' : 'text-green-600'}`}>
            {result.recovered ? 'Auto-fixed' : 'Success'}
          </p>
        </div>
      </div>

      {result.chart_type !== 'table' && result.data.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">{result.chart_config.title}</p>
            <button
              onClick={exportCSV}
              className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
          <ChartRenderer
            chartType={result.chart_type}
            chartConfig={result.chart_config}
            data={result.data}
          />
        </div>
      )}

      <ResultsTable
        data={result.data}
        columns={result.columns}
        rowCount={result.row_count}
        onExportCSV={exportCSV}
      />
    </div>
  )
}