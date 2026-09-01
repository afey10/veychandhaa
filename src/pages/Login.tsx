import { FormEvent, useState } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [serviceNumber, setServiceNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session && profile) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!serviceNumber.trim() || !password) {
      setError('Please enter both your service number and password.')
      return
    }

    setSubmitting(true)
    const { error: signInError } = await signIn(serviceNumber, password)
    setSubmitting(false)

    if (signInError) {
      setError(signInError)
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-navy-800/40 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gold-900/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Tha. Veymandoo Police" className="w-20 h-20 rounded-2xl object-contain shadow-lg mb-4" />
          <h1 className="text-white font-display font-bold text-xl text-center">Tha. Veymandoo Police</h1>
          <p className="text-navy-300 text-sm mt-1">Chandhaa Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">
          <div>
            <label htmlFor="serviceNumber" className="label">Service Number</label>
            <input
              id="serviceNumber"
              type="text"
              autoComplete="username"
              className="input"
              placeholder="e.g. VP-1024"
              value={serviceNumber}
              onChange={(e) => setServiceNumber(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="input pr-10"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="text-center">
            <Link to="/forgot-password" className="text-sm text-navy-600 hover:text-navy-800 font-medium">
              Forgot your password?
            </Link>
          </div>
        </form>

        <p className="text-center text-navy-400 text-xs mt-6">
          Access is restricted to authorized Tha. Veymandoo Police personnel only.
        </p>
      </div>
    </div>
  )
}
