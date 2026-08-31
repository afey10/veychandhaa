import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { ExpenseCategory, PaymentMethod } from '../types'
import { PageHeader } from '../components/ui'

export default function AddExpense() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category_id: '',
    description: '',
    amount: '',
    payment_method: 'cash' as PaymentMethod,
    reference_number: '',
    remarks: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase
      .from('expense_categories')
      .select('*')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setCategories(data ?? [])
        if (data && data.length && !form.category_id) {
          setForm((f) => ({ ...f, category_id: data[0].id }))
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  function validate() {
    const e: Record<string, string> = {}
    if (!form.category_id) e.category_id = 'Select a category.'
    if (!form.description.trim()) e.description = 'Description is required.'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Amount must be greater than 0.'
    if (!form.expense_date) e.expense_date = 'Expense date is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate() || !profile) return
    setSubmitting(true)

    const { error } = await supabase.from('expenses').insert({
      expense_date: form.expense_date,
      category_id: form.category_id,
      description: form.description.trim(),
      amount: Number(form.amount),
      payment_method: form.payment_method,
      reference_number: form.reference_number.trim() || null,
      remarks: form.remarks.trim() || null,
      created_by: profile.id
    })

    setSubmitting(false)

    if (error) {
      showToast('Could not save the expense. Please try again.', 'error')
      return
    }

    showToast('Expense saved successfully.', 'success')
    navigate('/expenses/records')
  }

  return (
    <div>
      <PageHeader title="Add Expenses" description="Record a station expense." />

      <form onSubmit={handleSubmit} className="card max-w-3xl space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Expense Date *</label>
            <input type="date" className="input" value={form.expense_date} onChange={(e) => update('expense_date', e.target.value)} />
            {errors.expense_date && <p className="text-xs text-rose-600 mt-1">{errors.expense_date}</p>}
          </div>
          <div>
            <label className="label">Expense Category *</label>
            <select className="input" value={form.category_id} onChange={(e) => update('category_id', e.target.value)}>
              {categories.length === 0 && <option value="">No categories available</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.category_id && <p className="text-xs text-rose-600 mt-1">{errors.category_id}</p>}
          </div>
        </div>

        <div>
          <label className="label">Description *</label>
          <input className="input" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What was this expense for?" />
          {errors.description && <p className="text-xs text-rose-600 mt-1">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Amount (MVR) *</label>
            <input type="number" min="0.01" step="0.01" className="input" value={form.amount} onChange={(e) => update('amount', e.target.value)} placeholder="0.00" />
            {errors.amount && <p className="text-xs text-rose-600 mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input" value={form.payment_method} onChange={(e) => update('payment_method', e.target.value)}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Receipt / Reference Number</label>
          <input className="input" value={form.reference_number} onChange={(e) => update('reference_number', e.target.value)} placeholder="Optional" />
        </div>

        <div>
          <label className="label">Remarks</label>
          <textarea className="input" rows={3} value={form.remarks} onChange={(e) => update('remarks', e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save Expense'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/expenses/records')} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
