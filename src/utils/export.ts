import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export function exportToPDF(opts: {
  title: string
  subtitle?: string
  head: string[][]
  body: (string | number)[][]
  summary?: { label: string; value: string }[]
  filename: string
}) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.setTextColor(15, 61, 92)
  doc.text('Tha. Veymandoo Police Chandhaa', 14, 16)
  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.text(opts.title, 14, 24)
  if (opts.subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(opts.subtitle, 14, 30)
  }

  let startY = opts.subtitle ? 36 : 30

  if (opts.summary && opts.summary.length) {
    doc.setFontSize(10)
    doc.setTextColor(40)
    opts.summary.forEach((s, i) => {
      doc.text(`${s.label}: ${s.value}`, 14, startY + i * 6)
    })
    startY += opts.summary.length * 6 + 4
  }

  autoTable(doc, {
    head: opts.head,
    body: opts.body,
    startY,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 61, 92], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 249, 251] }
  })

  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10)

  doc.save(`${opts.filename}.pdf`)
}

export function exportToExcel(opts: {
  sheetName: string
  headers: string[]
  rows: (string | number)[][]
  filename: string
}) {
  const worksheet = XLSX.utils.aoa_to_sheet([opts.headers, ...opts.rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, opts.sheetName)
  XLSX.writeFile(workbook, `${opts.filename}.xlsx`)
}

export function printElement(elementId: string) {
  const el = document.getElementById(elementId)
  if (!el) return
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) return
  printWindow.document.write(`
    <html>
      <head>
        <title>Print</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          h2 { font-size: 14px; color: #475569; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
          th { background: #0F3D5C; color: white; }
          tr:nth-child(even) { background: #f8fafc; }
        </style>
      </head>
      <body>${el.innerHTML}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 300)
}
