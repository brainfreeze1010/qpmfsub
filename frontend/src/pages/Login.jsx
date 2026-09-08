import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Lock, Eye, EyeOff, LogIn,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiLogin } from '../api/client'
import useStore from '../store/useStore'
import qpLogo from '../../logo/qplogolarge.png'

const DEMO_CREDENTIALS = [
  { role: 'HO User',           username: 'admin',    password: 'admin123'   },
  { role: 'Branch – Mumbai',   username: 'mumbai1',  password: 'branch123'  },
]

export default function Login() {
  const navigate = useNavigate()
  const { setUser, setToken } = useStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!username.trim()) e.username = 'Username is required'
    if (!password.trim()) e.password = 'Password is required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const res = await apiLogin({ username: username.trim(), password })
      const { token, user_id, username: uname, name, role, branch_code, branch_name } = res.data
      setToken(token)
      setUser({ user_id, username: uname, name, role, branch_code, branch_name })
      toast.success(`Welcome back, ${name}!`)
      if (role === 'branch_user') {
        navigate('/branch/transactions', { replace: true })
      } else {
        navigate('/ho/dashboard', { replace: true })
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Invalid credentials. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(cred) {
    setUsername(cred.username)
    setPassword(cred.password)
    setErrors({})
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto">
        <div className="card p-8 shadow-panel animate-fade-in">

          {/* Logo block */}
          <div className="flex flex-col items-center mb-6">
            <div className="mb-4">
              <img src={qpLogo} alt="Quantum Phinance logo" className="h-16 w-auto object-contain mx-auto" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-6" noValidate>
            {/* Username */}
            <div>
              <label className="input-label" htmlFor="login-username">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  className="input pl-9"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
              {errors.username && <p className="form-error">{errors.username}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="input-label" htmlFor="login-password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pl-9 pr-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-5 border border-surface-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDemo(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-surface-hover transition-colors"
            >
              <span>Demo Credentials</span>
              {showDemo
                ? <ChevronUp className="h-4 w-4 text-ink-muted" />
                : <ChevronDown className="h-4 w-4 text-ink-muted" />}
            </button>

            {showDemo && (
              <div className="border-t border-surface-border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-hover/60">
                      <th className="px-3 py-2 text-left font-semibold text-ink-muted uppercase tracking-wide whitespace-nowrap">Role</th>
                      <th className="px-3 py-2 text-left font-semibold text-ink-muted uppercase tracking-wide whitespace-nowrap">Username</th>
                      <th className="px-3 py-2 text-left font-semibold text-ink-muted uppercase tracking-wide whitespace-nowrap">Password</th>
                      <th className="px-3 py-2 text-center font-semibold text-ink-muted uppercase tracking-wide whitespace-nowrap">Use</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_CREDENTIALS.map(cred => (
                      <tr key={cred.username} className="border-t border-surface-border hover:bg-surface-hover transition-colors">
                        <td className="px-3 py-2 font-medium text-ink">{cred.role}</td>
                        <td className="px-3 py-2 font-mono text-ink-secondary">{cred.username}</td>
                        <td className="px-3 py-2 font-mono text-ink-muted">{cred.password}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => fillDemo(cred)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-qp-navy-50 text-qp-navy text-[11px] font-semibold hover:bg-qp-navy-100 transition-colors"
                          >
                            Fill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Security footer */}
          <div className="flex items-center justify-center gap-1.5 mt-6 text-ink-subtle">
            <span className="text-[11px]">© Quantum Phinance</span>
          </div>
        </div>
      </div>
    </div>
  )
}
