import { useEffect, useMemo, useState } from 'react'
import { Printer, FileDown, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatMVR, MONTH_NAMES, type Chandhaa } from '../../types'
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui'
import { exportToPDF, exportToExcel, printElement } from '../../utils/export'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i)

export default function CollectionReport() {
  const [rows, setRows] = useState<Chandhaa[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [contributor, setContributor] = useState('')
  const [serviceNumber, setServiceNumber] = useState('')

  useEffect(() => {
    supabase.from('chandhaa').select('*, profiles:created_by(full_name)').order('payment_date', { ascending: false }).then(({ data }) => {
      setRows((data ?? []) as any)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (month && r.month !== Number(month)) return false
      if (year && r.year !== Number(year)) return false
      if (contributor && !r.contributor_name.toLowerCase().includes(contributor.toLowerCase())) return false
      if (serviceNumber && !(r.service_number ?? '').toLowerCase().includes(serviceNumber.toLowerCase())) return false
      return true
    })
  }, [rows, month, year, contributor, serviceNumber])

  const totalCollection = filtered.reduce((s, r) => s + Number(r.amount), 0)
  const totalContributors = new Set(filtered.map((r) => r.contributor_name)).size

  function handlePDF() {
    exportToPDF({
      title: 'Collection Report',
      summary: [
        { label: 'Total Contributors', value: String(totalContributors) },
        { label: 'Total Collection', value: formatMVR(totalCollection) }
      ],
      head: [['Contributor', 'Service #', 'Month/Year', 'Amount', 'Payment Date']],
      body: filtered.map((r) => [r.contributor_name, r.service_number ?? '—', `${MONTH_NAMES[r.month - 1]} ${r.year}`, formatMVR(Number(r.amount)), new Date(r.payment_date).toLocaleDateString()]),
      filename: 'collection-report'
    })
  }

  function handleExcel() {
    exportToExcel({
      sheetName: 'Collection Report',
      headers: ['Contributor', 'Service #', 'Month', 'Year', 'Amount', 'Payment Date'],
      rows: filtered.map((r) => [r.contributor_name, r.service_number ?? '—', MONTH_NAMES[r.month - 1], r.year, Number(r.amount), r.payment_date]),
      filename: 'collection-report'
    })
  }

  return (
    <div>
      <PageHeader
        title="Collection Report"
        description="Filter contributions by contributor, service number, month, or year."
        actions={
          <>
            <button className="btn-secondary" onClick={() => printElement('collection-report-print')}><Printer size={16} /> Print</button>
            <button className="btn-secondary" onClick={handlePDF}><FileDown size={16} /> PDF</button>
            <button className="btn-secondary" onClick={handleExcel}><FileSpreadsheet size={16} /> Excel</button>
          </>
        }
      />

      <div className="card mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input className="input" placeholder="Contributor name" value={contributor} onChange={(e) => setContributor(e.target.value)} />
        <input className="input" placeholder="Service number" value={serviceNumber} onChange={(e) => setServiceNumber(e.target.value)} />
        <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">All Months</option>
          {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div id="collection-report-print">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card"><p className="text-xs font-medium text-slate-500">Total Contributors</p><p className="text-lg font-display font-bold text-navy-950 mt-1">{totalContributors}</p></div>
            <div className="card"><p className="text-xs font-medium text-slate-500">Total Collection</p><p className="text-lg font-display font-bold text-emerald-700 mt-1">{formatMVR(totalCollection)}</p></div>
          </div>

          {filtered.length === 0 ? <div className="card"><EmptyState title="No matching contributions" /></div> : (
            <div className="table-wrap card !p-0">
              <table className="w-full">
                <thead><tr><th className="th">Contributor</th><th className="th">Service #</th><th className="th">Month/Year</th><th className="th">Amount</th><th className="th">Payment Date</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="td font-medium text-navy-950">{r.contributor_name}</td>
                      <td className="td">{r.service_number ?? '—'}</td>
                      <td className="td">{MONTH_NAMES[r.month - 1]} {r.year}</td>
                      <td className="td font-semibold">{formatMVR(Number(r.amount))}</td>
                      <td className="td">{new Date(r.payment_date).toLocaleDateString()}</td>
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
