import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatMVR, MONTH_NAMES } from '../../types'
import { PageHeader, LoadingSpinner } from '../../components/ui'
import { printElement } from '../../utils/export'

export default function FinancialSummary() {
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({
    totalCollection: 0, totalExpenses: 0,
    currentMonthCollection: 0, currentMonthExpenses: 0,
    previousMonthCollection: 0, previousMonthExpenses: 0
  })

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const prevDate = new Date(currentYear, currentMonth - 2, 1)
  const prevMonth = prevDate.getMonth() + 1
  const prevYear = prevDate.getFullYear()

  useEffect(() => {
    Promise.all([
      supabase.from('chandhaa').select('amount, month, year'),
      supabase.from('expenses').select('amount, expense_date')
    ]).then(([{ data: c }, { data: e }]) => {
      const chandhaa = c ?? []
      const expenses = e ?? []
      const sum = (arr: any[]) => arr.reduce((s, r) => s + Number(r.amount), 0)

      setTotals({
        totalCollection: sum(chandhaa),
        totalExpenses: sum(expenses),
        currentMonthCollection: sum(chandhaa.filter((r: any) => r.month === currentMonth && r.year === currentYear)),
        currentMonthExpenses: sum(expenses.filter((r: any) => {
          const d = new Date(r.expense_date)
          return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
        })),
        previousMonthCollection: sum(chandhaa.filter((r: any) => r.month === prevMonth && r.year === prevYear)),
        previousMonthExpenses: sum(expenses.filter((r: any) => {
          const d = new Date(r.expense_date)
          return d.getMonth() + 1 === prevMonth && d.getFullYear() === prevYear
        }))
      })
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentBalance = totals.totalCollection - totals.totalExpenses

  const rows = [
    { label: 'Total Collection', value: totals.totalCollection },
    { label: 'Total Expenses', value: totals.totalExpenses },
    { label: 'Current Balance', value: currentBalance },
    { label: `Current Month Collection (${MONTH_NAMES[currentMonth - 1]})`, value: totals.currentMonthCollection },
    { label: `Current Month Expenses (${MONTH_NAMES[currentMonth - 1]})`, value: totals.currentMonthExpenses },
    { label: `Previous Month Collection (${MONTH_NAMES[prevMonth - 1]})`, value: totals.previousMonthCollection },
    { label: `Previous Month Expenses (${MONTH_NAMES[prevMonth - 1]})`, value: totals.previousMonthExpenses }
  ]

  const momCollectionChange = totals.previousMonthCollection
    ? ((totals.currentMonthCollection - totals.previousMonthCollection) / totals.previousMonthCollection) * 100
    : null
  const momExpenseChange = totals.previousMonthExpenses
    ? ((totals.currentMonthExpenses - totals.previousMonthExpenses) / totals.previousMonthExpenses) * 100
    : null

  return (
    <div>
      <PageHeader
        title="Financial Summary"
        description="Overall financial position and month-over-month performance."
        actions={<button className="btn-secondary" onClick={() => printElement('financial-summary-print')}><Printer size={16} /> Print</button>}
      />

      {loading ? <LoadingSpinner /> : (
        <div id="financial-summary-print" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <h2 className="font-display font-bold text-navy-950 mb-4">Financial Position</h2>
            <dl className="divide-y divide-slate-100">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between py-3">
                  <dt className="text-sm text-slate-500">{r.label}</dt>
                  <dd className="text-sm font-semibold text-navy-950">{formatMVR(r.value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-4">
            <div className="card">
              <p className="text-xs font-medium text-slate-500 mb-1">Month-over-month collection</p>
              <p className={`text-2xl font-display font-bold ${momCollectionChange !== null && momCollectionChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {momCollectionChange === null ? '—' : `${momCollectionChange >= 0 ? '+' : ''}${momCollectionChange.toFixed(1)}%`}
              </p>
              <p className="text-xs text-slate-400 mt-1">vs {MONTH_NAMES[prevMonth - 1]} {prevYear}</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium text-slate-500 mb-1">Month-over-month expenses</p>
              <p className={`text-2xl font-display font-bold ${momExpenseChange !== null && momExpenseChange <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {momExpenseChange === null ? '—' : `${momExpenseChange >= 0 ? '+' : ''}${momExpenseChange.toFixed(1)}%`}
              </p>
              <p className="text-xs text-slate-400 mt-1">vs {MONTH_NAMES[prevMonth - 1]} {prevYear}</p>
            </div>
            <div className="card bg-navy-950 text-white border-0">
              <p className="text-xs font-medium text-navy-300 mb-1">Current Balance</p>
              <p className="text-2xl font-display font-bold text-gold-400">{formatMVR(currentBalance)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
