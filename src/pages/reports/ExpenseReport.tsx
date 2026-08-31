import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Printer, FileDown, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatMVR, MONTH_NAMES, type Expense, type ExpenseCategory } from '../../types'
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui'
import { exportToPDF, exportToExcel, printElement } from '../../utils/export'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i)
const COLORS = ['#0F3D5C', '#215577', '#4e8dad', '#e8a930', '#d68f1e', '#7fb0ca', '#b06f16', '#adccdd', '#5c3816']

export default function ExpenseReport() {
  const [rows, setRows] = useState<(Expense & { category_name?: string })[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [category, setCategory] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('expenses').select('*, expense_categories(name)').order('expense_date', { ascending: false }),
      supabase.from('expense_categories').select('*').order('name')
    ]).then(([{ data }, { data: cats }]) => {
      setRows((data ?? []).map((r: any) => ({ ...r, category_name: r.expense_categories?.name ?? '—' })))
      setCategories(cats ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const d = new Date(r.expense_date)
      if (month && d.getMonth() + 1 !== Number(month)) return false
      if (year && d.getFullYear() !== Number(year)) return false
      if (category && r.category_id !== category) return false
      if (fromDate && r.expense_date < fromDate) return false
      if (toDate && r.expense_date > toDate) return false
      return true
    })
  }, [rows, month, year, category, fromDate, toDate])

  const totalExpenses = filtered.reduce((s, r) => s + Number(r.amount), 0)

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach((r) => {
      const key = r.category_name ?? 'Other'
      map[key] = (map[key] ?? 0) + Number(r.amount)
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [filtered])

  function handlePDF() {
    exportToPDF({
      title: 'Expense Report',
      summary: [
        { label: 'Number of Expenses', value: String(filtered.length) },
        { label: 'Total Expenses', value: formatMVR(totalExpenses) }
      ],
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: filtered.map((r) => [new Date(r.expense_date).toLocaleDateString(), r.category_name ?? '—', r.description, formatMVR(Number(r.amount))]),
      filename: 'expense-report'
    })
  }

  function handleExcel() {
    exportToExcel({
      sheetName: 'Expense Report',
      headers: ['Date', 'Category', 'Description', 'Amount'],
      rows: filtered.map((r) => [r.expense_date, r.category_name ?? '—', r.description, Number(r.amount)]),
      filename: 'expense-report'
    })
  }

  return (
    <div>
      <PageHeader
        title="Expense Report"
        description="Breakdown of expenses by category, month, and date range."
        actions={
          <>
            <button className="btn-secondary" onClick={() => printElement('expense-report-print')}><Printer size={16} /> Print</button>
            <button className="btn-secondary" onClick={handlePDF}><FileDown size={16} /> PDF</button>
            <button className="btn-secondary" onClick={handleExcel}><FileSpreadsheet size={16} /> Excel</button>
          </>
        }
      />

      <div className="card mb-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">All Months</option>
          {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div id="expense-report-print">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="card"><p className="text-xs font-medium text-slate-500">Total Expenses</p><p className="text-lg font-display font-bold text-rose-700 mt-1">{formatMVR(totalExpenses)}</p></div>
            <div className="card"><p className="text-xs font-medium text-slate-500">Number of Expenses</p><p className="text-lg font-display font-bold text-navy-950 mt-1">{filtered.length}</p></div>
            <div className="card lg:row-span-3 lg:col-start-3 lg:row-start-1">
              <p className="text-xs font-medium text-slate-500 mb-2">Category Breakdown</p>
              {byCategory.length === 0 ? <EmptyState title="No data" /> : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatMVR(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {filtered.length === 0 ? <div className="card"><EmptyState title="No expenses match these filters" /></div> : (
            <div className="table-wrap card !p-0">
              <table className="w-full">
                <thead><tr><th className="th">Date</th><th className="th">Category</th><th className="th">Description</th><th className="th">Amount</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="td">{new Date(r.expense_date).toLocaleDateString()}</td>
                      <td className="td"><span className="badge bg-navy-50 text-navy-700">{r.category_name}</span></td>
                      <td className="td font-medium text-navy-950">{r.description}</td>
                      <td className="td font-semibold">{formatMVR(Number(r.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
