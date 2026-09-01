import { useEffect, useMemo, useState } from 'react'
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, Receipt } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatMVR, MONTH_NAMES, type Expense, type ExpenseCategory, type PaymentMethod } from '../types'
import { PageHeader, LoadingSpinner, EmptyState, ConfirmDialog, Modal } from '../components/ui'
import ReceiptPicker from '../components/ReceiptPicker'
import { uploadReceipt } from '../utils/receipts'

const PAGE_SIZE = 10

export default function ExpenseRecords() {
  const { canEdit, isAdmin, profile } = useAuth()
  const { showToast } = useToast()

  const [rows, setRows] = useState<(Expense & { category_name?: string; created_by_name?: string })[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<keyof Expense>('expense_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data, error }, { data: cats }] = await Promise.all([
      supabase.from('expenses').select('*, profiles:created_by(full_name), expense_categories(name)').order('expense_date', { ascending: false }),
      supabase.from('expense_categories').select('*').order('name')
    ])
    if (error) {
      showToast('Could not load expense records.', 'error')
      setLoading(false)
      return
    }
    setCategories(cats ?? [])
    setRows((data ?? []).map((r: any) => ({ ...r, created_by_name: r.profiles?.full_name ?? '—', category_name: r.expense_categories?.name ?? '—' })))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    let out = rows
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      out = out.filter((r) => r.description.toLowerCase().includes(q) || (r.reference_number ?? '').toLowerCase().includes(q))
    }
    if (categoryFilter) out = out.filter((r) => r.category_id === categoryFilter)
    if (monthFilter) out = out.filter((r) => new Date(r.expense_date).getMonth() + 1 === Number(monthFilter))
    if (yearFilter) out = out.filter((r) => new Date(r.expense_date).getFullYear() === Number(yearFilter))

    out = [...out].sort((a, b) => {
      const va = a[sortKey] as any
      const vb = b[sortKey] as any
      if (va === vb) return 0
      const res = va > vb ? 1 : -1
      return sortDir === 'asc' ? res : -res
    })
    return out
  }, [rows, search, categoryFilter, monthFilter, yearFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const years = Array.from(new Set(rows.map((r) => new Date(r.expense_date).getFullYear()))).sort((a, b) => b - a)

  function toggleSort(key: keyof Expense) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  async function handleDelete() {
    if (!deleting) return
    setBusy(true)
    const { error } = await supabase.from('expenses').delete().eq('id', deleting.id)
    setBusy(false)
    setDeleting(null)
    if (error) {
      showToast('Could not delete this record. You may not have permission.', 'error')
      return
    }
    showToast('Expense deleted.', 'success')
    load()
  }

  return (
    <div>
      <PageHeader title="Expense Records" description={`${filtered.length} record${filtered.length === 1 ? '' : 's'} found`} />

      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search description, reference…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="input" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setPage(1) }}>
            <option value="">All Months</option>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="input" value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setPage(1) }}>
            <option value="">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title="No expense records" description="Try clearing filters, or add a new expense." /></div>
      ) : (
        <>
          <div className="table-wrap card !p-0">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th cursor-pointer" onClick={() => toggleSort('expense_date')}>
                    <span className="inline-flex items-center gap-1">Date <ArrowUpDown size={12} /></span>
                  </th>
                  <th className="th">Category</th>
                  <th className="th">Description</th>
                  <th className="th cursor-pointer" onClick={() => toggleSort('amount')}>
                    <span className="inline-flex items-center gap-1">Amount <ArrowUpDown size={12} /></span>
                  </th>
                  <th className="th">Method</th>
                  <th className="th">Reference</th>
                  <th className="th">Receipt</th>
                  <th className="th">Added By</th>
                  {canEdit && <th className="th text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="td">{new Date(r.expense_date).toLocaleDateString()}</td>
                    <td className="td"><span className="badge bg-navy-50 text-navy-700">{r.category_name}</span></td>
                    <td className="td font-medium text-navy-950">{r.description}</td>
                    <td className="td font-semibold">{formatMVR(Number(r.amount))}</td>
                    <td className="td capitalize">{r.payment_method.replace('_', ' ')}</td>
                    <td className="td">{r.reference_number ?? '—'}</td>
                    <td className="td">
                      {r.receipt_url ? (
                        <a
                          href={r.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-navy-600 hover:text-navy-800 hover:underline"
                        >
                          <Receipt size={14} /> View
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="td">{r.created_by_name}</td>
                    {canEdit && (
                      <td className="td">
                        <div className="flex items-center justify-end gap-2">
                          <button className="text-navy-600 hover:text-navy-800" onClick={() => setEditing(r)} title="Edit">
                            <Pencil size={16} />
                          </button>
                          {isAdmin && (
                            <button className="text-rose-500 hover:text-rose-700" onClick={() => setDeleting(r)} title="Delete">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button className="btn-secondary px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={16} /></button>
              <button className="btn-secondary px-3" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={16} /></button>
            </div>
          </div>
        </>
      )}

      {editing && (
        <EditExpenseModal categories={categories} record={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete expense record?"
        description={`This will permanently delete "${deleting?.description}". This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

function EditExpenseModal({
  record, categories, onClose, onSaved
}: { record: Expense; categories: ExpenseCategory[]; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    expense_date: record.expense_date,
    category_id: record.category_id,
    description: record.description,
    amount: String(record.amount),
    payment_method: record.payment_method,
    reference_number: record.reference_number ?? '',
    remarks: record.remarks ?? ''
  })
  const [saving, setSaving] = useState(false)
  const [receiptFile, setReceiptFile] = useState<Blob | null>(null)
  const [receiptRemoved, setReceiptRemoved] = useState(false)

  function handleReceiptChange(file: Blob | null) {
    setReceiptFile(file)
    if (!file) setReceiptRemoved(true)
  }

  async function handleSave() {
    if (!form.description.trim() || Number(form.amount) <= 0) {
      showToast('Please provide a valid description and amount.', 'error')
      return
    }
    setSaving(true)

    let receiptUrl: string | null | undefined = undefined // undefined = leave unchanged
    if (receiptFile) {
      try {
        receiptUrl = await uploadReceipt(receiptFile)
      } catch {
        showToast('Changes will be saved, but the new receipt photo could not be uploaded.', 'error')
      }
    } else if (receiptRemoved) {
      receiptUrl = null
    }

    const { error } = await supabase
      .from('expenses')
      .update({
        expense_date: form.expense_date,
        category_id: form.category_id,
        description: form.description.trim(),
        amount: Number(form.amount),
        payment_method: form.payment_method as PaymentMethod,
        reference_number: form.reference_number.trim() || null,
        remarks: form.remarks.trim() || null,
        ...(receiptUrl !== undefined ? { receipt_url: receiptUrl } : {}),
        updated_by: profile?.id
      })
      .eq('id', record.id)
    setSaving(false)
    if (error) {
      showToast('Could not update this record.', 'error')
      return
    }
    showToast('Expense updated.', 'success')
    onSaved()
  }

  return (
    <Modal open title="Edit Expense" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Expense Date</label>
            <input type="date" className="input" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Amount (MVR)</label>
            <input type="number" min="0.01" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Receipt / Reference Number</label>
          <input className="input" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
        </div>
        <div>
          <label className="label">Remarks</label>
          <textarea className="input" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        </div>
        <ReceiptPicker existingUrl={record.receipt_url} onChange={handleReceiptChange} />
        <div className="flex gap-3 pt-2">
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          <button className="btn-secondary flex-1" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}
