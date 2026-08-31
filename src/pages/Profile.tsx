import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { PageHeader, RoleBadge } from '../components/ui'

export default function Profile() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!profile) return null

  async function handleChangePassword() {
    if (password.length < 8) {
      showToast('Password must be at least 8 characters.', 'error')
      return
    }
    if (password !== confirm) {
      showToast('Passwords do not match.', 'error')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (error) {
      showToast('Could not update your password.', 'error')
      return
    }
    setPassword('')
    setConfirm('')
    showToast('Password updated successfully.', 'success')
  }

  return (
    <div>
      <PageHeader title="Profile" description="Your account details." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
        <div className="card space-y-3">
          <h2 className="font-display font-bold text-navy-950 mb-2">Account Information</h2>
          <Row label="Full Name" value={profile.full_name} />
          <Row label="Service Number" value={profile.service_number} />
          <Row label="Role" value={<RoleBadge role={profile.role} />} />
          <Row label="Member Since" value={new Date(profile.created_at).toLocaleDateString()} />
        </div>

        <div className="card">
          <h2 className="font-display font-bold text-navy-950 mb-4">Change Password</h2>
          <div className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button className="btn-primary w-full" onClick={handleChangePassword} disabled={submitting}>
              {submitting ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-navy-950">{value}</span>
    </div>
  )
}
