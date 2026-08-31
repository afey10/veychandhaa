import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Wallet, TrendingUp, TrendingDown, PiggyBank, CalendarDays } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatMVR, MONTH_NAMES, type Chandhaa, type Expense } from '../types'
import { LoadingSpinner, EmptyState, PageHeader } from '../components/ui'

interface Totals {
  totalCollection: number
  totalExpenses: number
  currentMonthCollection: number
  currentMonthExpenses: number
}

interface RecentTx {
  id: string
  date: string
  type: 'Chandhaa' | 'Expense'
  description: string
  amount: number
  addedBy: string
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState<Totals>({
    totalCollection: 0,
    totalExpenses: 0,
    currentMonthCollection: 0,
    currentMonthExpenses: 0
  })
  const [monthlyData, setMonthlyData] = useState<{ month: string; Collection: number; Expenses: number; Balance: number }[]>([])
  const [recent, setRecent] = useState<RecentTx[]>([])

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)

      const [{ data: chandhaaRows }, { data: expenseRows }] = await Promise.all([
        supabase
          .from('chandhaa')
          .select('id, amount, month, year, payment_date, contributor_name, created_at, created_by, profiles:created_by(full_name)')
          .order('payment_date', { ascending: false }),
        supabase
          .from('expenses')
          .select('id, amount, expense_date, description, created_at, created_by, profiles:created_by(full_name), expense_categories(name)')
          .order('expense_date', { ascending: false })
      ])

      if (!mounted) return

      const chandhaa = (chandhaaRows ?? []) as any[]
      const expenses = (expenseRows ?? []) as any[]

      const totalCollection = chandhaa.reduce((sum, r) => sum + Number(r.amount), 0)
      const totalExpenses = expenses.reduce((sum, r) => sum + Number(r.amount), 0)
      const currentMonthCollection = chandhaa
        .filter((r) => r.month === currentMonth && r.year === currentYear)
        .reduce((sum, r) => sum + Number(r.amount), 0)
      const currentMonthExpenses = expenses
        .filter((r) => {
          const d = new Date(r.expense_date)
          return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
        })
        .reduce((sum, r) => sum + Number(r.amount), 0)

      setTotals({ totalCollection, totalExpenses, currentMonthCollection, currentMonthExpenses })

      // Build last 6 months trend
      const buckets: Record<string, { Collection: number; Expenses: number }> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - 1 - i, 1)
        const key = `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
        buckets[key] = { Collection: 0, Expenses: 0 }
      }
      chandhaa.forEach((r) => {
        const d = new Date(r.year, r.month - 1, 1)
        const key = `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
        if (buckets[key]) buckets[key].Collection += Number(r.amount)
      })
      expenses.forEach((r) => {
        const d = new Date(r.expense_date)
        const key = `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
        if (buckets[key]) buckets[key].Expenses += Number(r.amount)
      })
      setMonthlyData(
        Object.entries(buckets).map(([month, v]) => ({
          month,
          Collection: v.Collection,
          Expenses: v.Expenses,
          Balance: v.Collection - v.Expenses
        }))
      )

      const recentTx: RecentTx[] = [
        ...chandhaa.slice(0, 8).map((r) => ({
          id: r.id,
          date: r.payment_date,
          type: 'Chandhaa' as const,
          description: r.contributor_name,
          amount: Number(r.amount),
          addedBy: r.profiles?.full_name ?? '—'
        })),
        ...expenses.slice(0, 8).map((r) => ({
          id: r.id,
          date: r.expense_date,
          type: 'Expense' as const,
          description: r.description,
          amount: Number(r.amount),
          addedBy: r.profiles?.full_name ?? '—'
        }))
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8)

      setRecent(recentTx)
      setLoading(false)
    }

    load()
    return () => {
      mounted = false
    }
  }, [currentMonth, currentYear])

  const balance = totals.totalCollection - totals.totalExpenses

  const cards = useMemo(
    () => [
      { label: 'Total Collection', value: totals.totalCollection, icon: Wallet, tone: 'bg-navy-50 text-navy-700' },
      { label: 'Total Expenses', value: totals.totalExpenses, icon: TrendingDown, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Current Month Collection', value: totals.currentMonthCollection, icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Current Month Expenses', value: totals.currentMonthExpenses, icon: CalendarDays, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Remaining Balance', value: balance, icon: PiggyBank, tone: 'bg-gold-50 text-gold-800' }
    ],
    [totals, balance]
  )

  if (loading) return <LoadingSpinner label="Loading dashboard…" />

  return (
    <div>
      <PageHeader title="Dashboard" description={`Financial overview · ${MONTH_NAMES[currentMonth - 1]} ${currentYear}`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.tone}`}>
              <c.icon size={20} />
            </div>
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
            <p className="text-lg font-display font-bold text-navy-950 mt-1 truncate">{formatMVR(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card xl:col-span-2">
          <h2 className="font-display font-bold text-navy-950 mb-4">Monthly Collection vs Expenses</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatMVR(v)} />
                <Legend />
                <Bar dataKey="Collection" fill="#215577" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#e8a930" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display font-bold text-navy-950 mb-4">Recent Transactions</h2>
          {recent.length === 0 ? (
            <EmptyState title="No transactions yet" description="Recent Chandhaa and expenses will show up here." />
          ) : (
            <ul className="space-y-3">
              {recent.map((tx) => (
                <li key={`${tx.type}-${tx.id}`} className="flex items-start justify-between gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-950 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-400">
                      {tx.type} · {new Date(tx.date).toLocaleDateString()} · {tx.addedBy}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${tx.type === 'Expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {tx.type === 'Expense' ? '−' : '+'}{formatMVR(tx.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
