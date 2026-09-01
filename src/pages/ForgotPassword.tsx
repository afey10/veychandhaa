import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { serviceNumberToEmail } from '../contexts/AuthContext'

export default function ForgotPassword() {
  const [serviceNumber, setServiceNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!serviceNumber.trim()) {
      setError('Enter your service number.')
      return
    }
    setSubmitting(true)
    const email = serviceNumberToEmail(serviceNumber)
    // This will only deliver a working link if a real recovery email
    // is on file for the account (see README: Password Resets).
    // We never reveal whether the account exists.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    })
    setSubmitting(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold-500 flex items-center justify-center text-navy-950 shadow-lg mb-4">
            <KeyRound size={30} />
          </div>
          <h1 className="text-white font-display font-bold text-xl text-center">Reset your password</h1>
          <p className="text-navy-300 text-sm mt-1 text-center">Tha. Veymandoo Police Chandhaa</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-slate-600">
                If a recovery email is on file for that service number, a reset link has been sent.
                If you don't receive anything, please contact your system administrator to reset your password directly.
              </p>
              <Link to="/login" className="btn-primary w-full">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="serviceNumber" className="label">Service Number</label>
                <input
                  id="serviceNumber"
                  className="input"
                  placeholder="e.g. VP-1024"
                  value={serviceNumber}
                  onChange={(e) => setServiceNumber(e.target.value)}
                  disabled={submitting}
                />
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Send reset link'}
              </button>
              <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-navy-600 hover:text-navy-800 font-medium">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
