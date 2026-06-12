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

const SCHEMAS = [
  { name: 'college_2', tables: ['student','course','instructor','advisor'] },
  { name: 'car_1',     tables: ['car_makers','car_names','cars_data','countries'] },
  { name: 'store_1',   tables: ['invoices','customers','tracks','albums','artists'] },
]

interface Props {
  schema: string
  onSchemaChange: (s: string) => void
  history: ConversationTurn[]
  onHistoryClick: (turn: ConversationTurn) => void
  user: { name: string; email: string; role: string }
  onLogout: () => void
}

export default function Sidebar({
  schema,
  onSchemaChange,
  history,
  onHistoryClick,
  user,
  onLogout
}: Props) {
  const current = SCHEMAS.find(s => s.name === schema)

  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">

      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-200">
        <p className="font-semibold text-gray-900 text-sm">Gen-BI</p>
        <p className="text-xs text-gray-400 mt-0.5">Generative Business Intelligence</p>
      </div>

      {/* Schema selector */}
      <div className="px-3 pt-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2 mb-1">Database</p>
        {SCHEMAS.map(s => (
          <button
            key={s.name}
            onClick={() => onSchemaChange(s.name)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              s.name === schema
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Tables */}
      <div className="px-3 pt-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2 mb-1">Tables</p>
        {current?.tables.map(t => (
          <div
            key={t}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 rounded-lg hover:bg-gray-50 cursor-default"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"/>
            {t}
          </div>
        ))}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="px-3 pt-4 flex-1 overflow-y-auto min-h-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2 mb-1">
            History ({history.length})
          </p>
          {[...history].reverse().map((turn, i) => (
            <button
              key={i}
              onClick={() => onHistoryClick(turn)}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-500 rounded-lg hover:bg-gray-50 truncate block"
            >
              {turn.question}
            </button>
          ))}
        </div>
      )}

      {/* User + logout */}
      <div className="p-3 border-t border-gray-200 mt-auto">
        <div className="px-2 mb-2">
          <p className="text-xs font-medium text-gray-700 truncate">{user.name}</p>
          <p className="text-xs text-gray-400 truncate">{user.role}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>

    </div>
  )
}