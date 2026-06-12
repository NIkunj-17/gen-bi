import { useState, useEffect } from 'react'

interface User {
  id: number
  email: string
  name: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    user:    null,
    token:   null,
    loading: true
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user  = localStorage.getItem('user')
    if (token && user) {
      setAuth({ token, user: JSON.parse(user), loading: false })
    } else {
      setAuth(prev => ({ ...prev, loading: false }))
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch('http://127.0.0.1:8000/api/auth/login/json', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password })
    })
    if (!res.ok) throw new Error('Invalid email or password')
    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user',  JSON.stringify(data.user))
    setAuth({ token: data.access_token, user: data.user, loading: false })
    return data
  }

  const register = async (email: string, name: string, password: string) => {
    const res = await fetch('http://127.0.0.1:8000/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, name, password, role: 'analyst' })
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Registration failed')
    }
    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user',  JSON.stringify(data.user))
    setAuth({ token: data.access_token, user: data.user, loading: false })
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setAuth({ token: null, user: null, loading: false })
  }

  return { ...auth, login, register, logout }
}