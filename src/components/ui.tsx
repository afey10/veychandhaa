import { ReactNode } from 'react'
import { AlertTriangle, Loader2, Inbox } from 'lucide-react'

export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <Loader2 className="animate-spin" size={28} />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({
  title = 'No records found',
  description = 'Try adjusting your filters or add a new record.',
  icon
}: {
  title?: string
  description?: string
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
        {icon ?? <Inbox size={22} />}
      </div>
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="text-sm text-slate-400 max-w-xs">{description}</p>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-navy-950">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
      {active ? 'Active' : 'Disabled'}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    administrator: 'bg-gold-100 text-gold-800',
    staff: 'bg-navy-100 text-navy-700',
    view_only: 'bg-slate-100 text-slate-600'
  }
  const label: Record<string, string> = {
    administrator: 'Administrator',
    staff: 'Staff',
    view_only: 'View Only'
  }
  return <span className={`badge ${map[role] ?? 'bg-slate-100 text-slate-600'}`}>{label[role] ?? role}</span>
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
  onConfirm,
  onCancel
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl2 shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-rose-50 text-rose-600' : 'bg-gold-50 text-gold-700'}`}>
          <AlertTriangle size={22} />
        </div>
        <h3 className="font-display font-bold text-lg text-navy-950">{title}</h3>
        <p className="text-sm text-slate-500 mt-2">{description}</p>
        <div className="flex gap-2 mt-6">
          <button className="btn-secondary flex-1" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className={danger ? 'btn-danger flex-1' : 'btn-primary flex-1'} onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center bg-navy-950/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`bg-white rounded-xl2 shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} my-8 animate-in fade-in zoom-in-95`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-display font-bold text-lg text-navy-950">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
