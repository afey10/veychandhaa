import { useEffect, useMemo, useState } from 'react'
import { Printer, FileDown, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatMVR, MONTH_NAMES, type Chandhaa, type Expense } from '../../types'
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui'
import { exportToPDF, exportToExcel, printElement } from '../../utils/export'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i)

export default function MonthlyReport() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [loading, setLoading] = useState(true)
  const [chandhaa, setChandhaa] = useState<Chandhaa[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [openingBalance, setOpeningBalance] = useState(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const [{ data: cRows }, { data: eRows }, { data: allC }, { data: allE }] = await Promise.all([
        supabase.from('chandhaa').select('*, profiles:created_by(full_name)').eq('month', month).eq('year', year).order('payment_date'),
        supabase
          .from('expenses')
          .select('*, profiles:created_by(full_name), expense_categories(name)')
          .gte('expense_date', `${year}-${String(month).padStart(2, '0')}-01`)
          .lt('expense_date', month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`)
          .order('expense_date'),
        supabase.from('chandhaa').select('amount, month, year'),
        supabase.from('expenses').select('amount, expense_date')
      ])
      if (!mounted) return

      setChandhaa((cRows ?? []) as any)
      setExpenses((eRows ?? []) as any)

      // Opening balance = everything collected/spent strictly before this month
      const priorCollection = (allC ?? [])
        .filter((r: any) => r.year < year || (r.year === year && r.month < month))
        .reduce((s: number, r: any) => s + Number(r.amount), 0)
      const priorExpenses = (allE ?? [])
        .filter((r: any) => {
          const d = new Date(r.expense_date)
          return d.getFullYear() < year || (d.getFullYear() === year && d.getMonth() + 1 < month)
        })
        .reduce((s: number, r: any) => s + Number(r.amount), 0)
      setOpeningBalance(priorCollection - priorExpenses)

      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [month, year])

  const totalCollection = useMemo(() => chandhaa.reduce((s, r) => s + Number(r.amount), 0), [chandhaa])
  const totalExpenses = useMemo(() => expenses.reduce((s, r) => s + Number(r.amount), 0), [expenses])
  const closingBalance = openingBalance + totalCollection - totalExpenses

  function handlePDF() {
    exportToPDF({
      title: `Monthly Report — ${MONTH_NAMES[month - 1]} ${year}`,
      summary: [
        { label: 'Opening Balance', value: formatMVR(openingBalance) },
        { label: 'Total Collection', value: formatMVR(totalCollection) },
        { label: 'Total Expenses', value: formatMVR(totalExpenses) },
        { label: 'Closing Balance', value: formatMVR(closingBalance) }
      ],
      head: [['Type', 'Date', 'Description', 'Amount', 'Added By']],
      body: [
        ...chandhaa.map((r: any) => ['Chandhaa', new Date(r.payment_date).toLocaleDateString(), r.contributor_name, formatMVR(Number(r.amount)), r.profiles?.full_name ?? '—']),
        ...expenses.map((r: any) => ['Expense', new Date(r.expense_date).toLocaleDateString(), r.description, formatMVR(Number(r.amount)), r.profiles?.full_name ?? '—'])
      ],
      filename: `monthly-report-${year}-${month}`
    })
  }

  function handleExcel() {
    exportToExcel({
      sheetName: 'Monthly Report',
      headers: ['Type', 'Date', 'Description', 'Amount', 'Added By'],
      rows: [
        ...chandhaa.map((r: any) => ['Chandhaa', r.payment_date, r.contributor_name, Number(r.amount), r.profiles?.full_name ?? '—']),
        ...expenses.map((r: any) => ['Expense', r.expense_date, r.description, Number(r.amount), r.profiles?.full_name ?? '—'])
      ],
      filename: `monthly-report-${year}-${month}`
    })
  }

  return (
    <div>
      <PageHeader
        title="Monthly Report"
        description="Collection, expenses, and balance for a selected month."
        actions={
          <>
            <button className="btn-secondary" onClick={() => printElement('monthly-report-print')}><Printer size={16} /> Print</button>
            <button className="btn-secondary" onClick={handlePDF}><FileDown size={16} /> PDF</button>
            <button className="btn-secondary" onClick={handleExcel}><FileSpreadsheet size={16} /> Excel</button>
          </>
        }
      />

      <div className="card mb-4 flex flex-wrap gap-3">
        <select className="input w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div id="monthly-report-print">
          <h1 style={{ display: 'none' }} className="print:block">Monthly Report — {MONTH_NAMES[month - 1]} {year}</h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <SummaryCard label="Opening Balance" value={openingBalance} />
            <SummaryCard label="Total Collection" value={totalCollection} tone="text-emerald-700" />
            <SummaryCard label="Total Expenses" value={totalExpenses} tone="text-rose-700" />
            <SummaryCard label="Closing Balance" value={closingBalance} tone="text-navy-800" />
          </div>

          <div className="card mb-6">
            <h2 className="font-display font-bold text-navy-950 mb-3">Collection Details</h2>
            {chandhaa.length === 0 ? <EmptyState title="No Chandhaa collected this month" /> : (
              <div className="table-wrap">
                <table className="w-full">
                  <thead><tr><th className="th">Contributor</th><th className="th">Amount</th><th className="th">Payment Date</th><th className="th">Added By</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {chandhaa.map((r: any) => (
                      <tr key={r.id}>
                        <td className="td">{r.contributor_name}</td>
                        <td className="td font-semibold">{formatMVR(Number(r.amount))}</td>
                        <td className="td">{new Date(r.payment_date).toLocaleDateString()}</td>
                        <td className="td">{r.profiles?.full_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="font-display font-bold text-navy-950 mb-3">Expense Details</h2>
            {expenses.length === 0 ? <EmptyState title="No expenses this month" /> : (
              <div className="table-wrap">
                <table className="w-full">
                  <thead><tr><th className="th">Description</th><th className="th">Category</th><th className="th">Amount</th><th className="th">Date</th><th className="th">Added By</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {expenses.map((r: any) => (
                      <tr key={r.id}>
                        <td className="td">{r.description}</td>
                        <td className="td">{r.expense_categories?.name ?? '—'}</td>
                        <td className="td font-semibold">{formatMVR(Number(r.amount))}</td>
                        <td className="td">{new Date(r.expense_date).toLocaleDateString()}</td>
                        <td className="td">{r.profiles?.full_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, tone = 'text-navy-950' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-lg font-display font-bold mt-1 ${tone}`}>{formatMVR(value)}</p>
    </div>
  )
}
