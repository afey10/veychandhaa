import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { MONTH_NAMES, type PaymentMethod } from '../types'
import { PageHeader } from '../components/ui'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i)

export default function AddChandhaa() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    month: new Date().getMonth() + 1,
    year: currentYear,
    contributor_name: '',
    service_number: '',
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash' as PaymentMethod,
    reference_number: '',
    remarks: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const update = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }))

  function validate() {
    const e: Record<string, string> = {}
    if (!form.contributor_name.trim()) e.contributor_name = 'Contributor name is required.'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Amount must be greater than 0.'
    if (!form.payment_date) e.payment_date = 'Payment date is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate() || !profile) return
    setSubmitting(true)

    const { error } = await supabase.from('chandhaa').insert({
      contributor_name: form.contributor_name.trim(),
      service_number: form.service_number.trim() || null,
      month: Number(form.month),
      year: Number(form.year),
      amount: Number(form.amount),
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      reference_number: form.reference_number.trim() || null,
      remarks: form.remarks.trim() || null,
      created_by: profile.id
    })

    setSubmitting(false)

    if (error) {
      showToast('Could not save the Chandhaa record. Please try again.', 'error')
      return
    }

    showToast('Chandhaa record saved successfully.', 'success')
    navigate('/chandhaa/records')
  }

  return (
    <div>
      <PageHeader title="Add Chandhaa for the Month" description="Record a monthly Chandhaa contribution." />

      <form onSubmit={handleSubmit} className="card max-w-3xl space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Month</label>
            <select className="input" value={form.month} onChange={(e) => update('month', Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select className="input" value={form.year} onChange={(e) => update('year', Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Contributor Name *</label>
          <input className="input" value={form.contributor_name} onChange={(e) => update('contributor_name', e.target.value)} placeholder="Full name" />
          {errors.contributor_name && <p className="text-xs text-rose-600 mt-1">{errors.contributor_name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Service Number</label>
            <input className="input" value={form.service_number} onChange={(e) => update('service_number', e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="label">Amount (MVR) *</label>
            <input type="number" min="0.01" step="0.01" className="input" value={form.amount} onChange={(e) => update('amount', e.target.value)} placeholder="0.00" />
            {errors.amount && <p className="text-xs text-rose-600 mt-1">{errors.amount}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Payment Date *</label>
            <input type="date" className="input" value={form.payment_date} onChange={(e) => update('payment_date', e.target.value)} />
            {errors.payment_date && <p className="text-xs text-rose-600 mt-1">{errors.payment_date}</p>}
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
          <label className="label">Reference / Receipt Number</label>
          <input className="input" value={form.reference_number} onChange={(e) => update('reference_number', e.target.value)} placeholder="Optional" />
        </div>

        <div>
          <label className="label">Remarks</label>
          <textarea className="input" rows={3} value={form.remarks} onChange={(e) => update('remarks', e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save Chandhaa Record'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/chandhaa/records')} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
