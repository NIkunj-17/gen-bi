import { useState } from 'react'

interface Props {
  onLogin:    (email: string, password: string) => Promise<void>
  onRegister: (email: string, name: string, password: string) => Promise<void>
}

export default function AuthPage({ onLogin, onRegister }: Props) {
  const [mode,     setMode]     = useState<'login' | 'register'>('login')
  const [email,    setEmail]    = useState('')
  const [name,     setName]     = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError('Please fill all fields'); return }
    setLoading(true)
    try {
      if (mode === 'login') await onLogin(email, password)
      else await onRegister(email, name, password)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-indigo-600 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-lg">Gen-BI</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Ask your data anything.<br/>Get answers instantly.
          </h1>
          <p className="text-indigo-200 text-lg">
            Natural language to SQL. Auto charts. AI insights.
            Built for data analysts.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: '⚡', text: 'Query any database in plain English' },
              { icon: '📊', text: 'Auto-generates bar, line, pie, scatter charts' },
              { icon: '🧠', text: 'AI insights and follow-up suggestions' },
              { icon: '🔒', text: 'Secure JWT auth with role-based access' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-indigo-100 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
  <div className="h-px flex-1 bg-indigo-500/30"/>
  <p className="text-indigo-300 text-xs font-mono">v1.0 · production ready</p>
  <div className="h-px flex-1 bg-indigo-500/30"/>
</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'login' ? 'Sign in to Gen-BI' : 'Create your account'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {mode === 'login'
                ? 'Enter your credentials to access your workspace'
                : 'Start analyzing your data in minutes'
              }
            </p>
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nikunj Sharma"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login' ? 'Sign in' : 'Create account'
              }
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
                className="text-indigo-600 font-medium hover:underline"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {mode === 'login' && (
            <div className="mt-4 p-3 bg-slate-100 rounded-lg">
              <p className="text-xs text-slate-500 text-center">
                Demo: <span className="font-mono text-slate-700">demo@gmail.com</span> / <span className="font-mono text-slate-700">12345</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}