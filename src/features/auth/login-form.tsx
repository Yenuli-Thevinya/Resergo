'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { api, errorMessage } from '@/lib/api-client'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } })
      window.location.href = '/'
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="auth-kicker">WELCOME BACK</div>
      <h2>Sign in to Resergo</h2>
      <p className="auth-lede">Sign in to continue to Resergo.</p>

      <label>
        Work email
        <input
          type="email"
          name="email"
          autoComplete="username"
          placeholder="nimal@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      <div className="auth-row">
        <span />
        <button type="button" className="text-button" onClick={() => setInfo('Please contact your administrator to reset your password.')}>
          Forgot password?
        </button>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {info && <div className="auth-info">{info}</div>}

      <button type="submit" className="auth-submit" disabled={busy}>
        <LogIn /> {busy ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="auth-switch">Accounts are created by your administrator.</div>
    </form>
  )
}
