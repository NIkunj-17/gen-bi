import { useState } from 'react'

interface ConversationTurn {
  question: string
  response: any
}

const SCHEMAS = [
  {
    name:   'college_2',
    label:  'University DB',
    tables: ['student', 'instructor', 'course', 'advisor'],
    color:  'bg-violet-100 text-violet-700',
    dot:    'bg-violet-500'
  },
  {
    name:   'car_1',
    label:  'Auto Industry',
    tables: ['car_makers', 'cars_data', 'countries', 'model_list'],
    color:  'bg-blue-100 text-blue-700',
    dot:    'bg-blue-500'
  },
  {
    name:   'store_1',
    label:  'Music Store',
    tables: ['invoices', 'customers', 'tracks', 'albums', 'artists'],
    color:  'bg-emerald-100 text-emerald-700',
    dot:    'bg-emerald-500'
  },
]

interface Props {
  schema:         string
  onSchemaChange: (s: string) => void
  history:        ConversationTurn[]
  onHistoryClick: (turn: ConversationTurn) => void
  user:           { name: string; email: string; role: string }
  onLogout:       () => void
  onUpload:       () => void
  userSchemas:    string[]
}

export default function Sidebar({
  schema, onSchemaChange, history, onHistoryClick,
  user, onLogout, onUpload, userSchemas
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(schema)
  const current = SCHEMAS.find(s => s.name === schema)

  return (
    <div className="w-60 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 select-none">

      {/* Logo */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 leading-none">Gen-BI</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Generative Analytics</p>
        </div>
      </div>

      {/* Data Sources */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pt-4 pb-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 mb-2">
            Data Sources
          </p>

          {SCHEMAS.map(s => (
            <div key={s.name}>
              <button
                onClick={() => {
                  onSchemaChange(s.name)
                  setExpanded(expanded === s.name ? null : s.name)
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all mb-0.5 ${
                  s.name === schema
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`}/>
                <span className="flex-1 text-left font-medium text-xs">{s.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.color} font-mono`}>
                  {s.name}
                </span>
              </button>

              {/* Tables list */}
              {expanded === s.name && (
                <div className="ml-4 mb-1 pl-2 border-l border-slate-100">
                  {s.tables.map(t => (
                    <div key={t} className="flex items-center gap-2 py-1 px-2 text-[11px] text-slate-500">
                      <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18"/>
                      </svg>
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* User uploaded schemas */}
          {userSchemas.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 mb-2 mt-4">
                My Uploads
              </p>
              {userSchemas.map(s => (
                <button
                  key={s}
                  onClick={() => onSchemaChange(s)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all mb-0.5 ${
                    s === schema
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  <span className="text-xs font-medium">{s}</span>
                </button>
              ))}
            </>
          )}

          {/* Upload button */}
          <button
            onClick={onUpload}
            className="w-full mt-3 flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-slate-500 border border-dashed border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Upload CSV / Excel
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="px-3 pt-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 mb-2">
              Recent ({history.length})
            </p>
            {[...history].reverse().slice(0, 8).map((turn, i) => (
              <button
                key={i}
                onClick={() => onHistoryClick(turn)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-50 truncate block mb-0.5"
              >
                {turn.question}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-800 truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400">{user.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full text-left px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Sign out
        </button>
      </div>
    </div>
  )
}