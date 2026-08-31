import { useEffect, useState } from 'react'
import { UserPlus, KeyRound, Ban, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import type { Profile, UserRole } from '../../types'
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge, RoleBadge, ConfirmDialog, Modal } from '../../components/ui'

export default function Users() {
  const { profile: me } = useAuth()
  const { showToast } = useToast()

  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [resetTarget, setResetTarget] = useState<Profile | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Profile | null>(null)
  const [roleTarget, setRoleTarget] = useState<{ user: Profile; newRole: UserRole } | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (error) {
      showToast('Could not load users.', 'error')
    } else {
      setUsers(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const activeAdminCount = users.filter((u) => u.role === 'administrator' && u.active).length

  async function handleToggleActive() {
    if (!toggleTarget) return
    if (toggleTarget.role === 'administrator' && toggleTarget.active && activeAdminCount <= 1) {
      showToast('You cannot disable the last active administrator.', 'error')
      setToggleTarget(null)
      return
    }
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ active: !toggleTarget.active }).eq('id', toggleTarget.id)
    setBusy(false)
    setToggleTarget(null)
    if (error) {
      showToast('Could not update user status.', 'error')
      return
    }
    showToast(`User ${toggleTarget.active ? 'disabled' : 'enabled'}.`, 'success')
    load()
  }

  async function handleRoleChange() {
    if (!roleTarget) return
    if (roleTarget.user.role === 'administrator' && roleTarget.newRole !== 'administrator' && activeAdminCount <= 1) {
      showToast('You cannot remove the last active administrator.', 'error')
      setRoleTarget(null)
      return
    }
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ role: roleTarget.newRole }).eq('id', roleTarget.user.id)
    setBusy(false)
    setRoleTarget(null)
    if (error) {
      showToast('Could not change role.', 'error')
      return
    }
    showToast('User role updated.', 'success')
    load()
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage administrator, staff, and view-only accounts."
        actions={<button className="btn-primary" onClick={() => setShowAdd(true)}><UserPlus size={16} /> Add User</button>}
      />

      {loading ? <LoadingSpinner /> : users.length === 0 ? (
        <div className="card"><EmptyState title="No users found" /></div>
      ) : (
        <div className="table-wrap card !p-0">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Full Name</th>
                <th className="th">Service #</th>
                <th className="th">Role</th>
                <th className="th">Status</th>
                <th className="th">Created</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="td font-medium text-navy-950">{u.full_name}{u.id === me?.id && <span className="text-xs text-slate-400 ml-1">(you)</span>}</td>
                  <td className="td">{u.service_number}</td>
                  <td className="td">
                    <select
                      className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white"
                      value={u.role}
                      onChange={(e) => setRoleTarget({ user: u, newRole: e.target.value as UserRole })}
                      disabled={u.id === me?.id}
                    >
                      <option value="administrator">Administrator</option>
                      <option value="staff">Staff</option>
                      <option value="view_only">View Only</option>
                    </select>
                  </td>
                  <td className="td"><StatusBadge active={u.active} /></td>
                  <td className="td">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-3">
                      <button className="text-navy-600 hover:text-navy-800 text-xs font-medium inline-flex items-center gap-1" onClick={() => setResetTarget(u)}>
                        <KeyRound size={14} /> Reset Password
                      </button>
                      {u.id !== me?.id && (
                        <button
                          className={`text-xs font-medium inline-flex items-center gap-1 ${u.active ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'}`}
                          onClick={() => setToggleTarget(u)}
                        >
                          {u.active ? <><Ban size={14} /> Disable</> : <><CheckCircle size={14} /> Enable</>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load() }} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.active ? 'Disable this user?' : 'Enable this user?'}
        description={
          toggleTarget?.active
            ? `${toggleTarget?.full_name} will no longer be able to sign in.`
            : `${toggleTarget?.full_name} will be able to sign in again.`
        }
        confirmLabel={toggleTarget?.active ? 'Disable' : 'Enable'}
        danger={!!toggleTarget?.active}
        loading={busy}
        onConfirm={handleToggleActive}
        onCancel={() => setToggleTarget(null)}
      />

      <ConfirmDialog
        open={!!roleTarget}
        title="Change user role?"
        description={`Change ${roleTarget?.user.full_name}'s role to ${roleTarget?.newRole.replace('_', ' ')}?`}
        confirmLabel="Change Role"
        loading={busy}
        onConfirm={handleRoleChange}
        onCancel={() => setRoleTarget(null)}
      />
    </div>
  )
}

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({ full_name: '', service_number: '', password: '', confirm: '', role: 'staff' as UserRole })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (!form.full_name.trim() || !form.service_number.trim()) {
      setError('Full name and service number are required.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const { data, error: fnError } = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'create_user',
        full_name: form.full_name.trim(),
        service_number: form.service_number.trim(),
        password: form.password,
        role: form.role
      }
    })
    setSubmitting(false)

    if (fnError || (data as any)?.error) {
      setError((data as any)?.error ?? 'Could not create the user.')
      return
    }
    showToast('User created successfully.', 'success')
    onCreated()
  }

  return (
    <Modal open title="Add User" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div>
          <label className="label">Service Number</label>
          <input className="input" value={form.service_number} onChange={(e) => setForm({ ...form, service_number: e.target.value })} placeholder="e.g. VP-1024" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input type="password" className="input" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
            <option value="administrator">Administrator</option>
            <option value="staff">Staff</option>
            <option value="view_only">View Only</option>
          </select>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button className="btn-primary flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Create User'}
          </button>
          <button className="btn-secondary flex-1" onClick={onClose} disabled={submitting}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose }: { user: Profile; onClose: () => void }) {
  const { showToast } = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const { data, error: fnError } = await supabase.functions.invoke('admin-users', {
      body: { action: 'reset_password', user_id: user.id, new_password: password }
    })
    setSubmitting(false)
    if (fnError || (data as any)?.error) {
      setError((data as any)?.error ?? 'Could not reset the password.')
      return
    }
    showToast(`Password reset for ${user.full_name}.`, 'success')
    onClose()
  }

  return (
    <Modal open title={`Reset Password — ${user.full_name}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button className="btn-primary flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Reset Password'}
          </button>
          <button className="btn-secondary flex-1" onClick={onClose} disabled={submitting}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}
