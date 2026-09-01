import { useEffect, useState } from 'react'
import { Plus, Pencil, Ban, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import type { ExpenseCategory } from '../../types'
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge, Modal } from '../../components/ui'

export default function ExpenseCategories() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategory | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('expense_categories').select('*').order('name')
    if (error) showToast('Could not load categories.', 'error')
    setCategories(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(cat: ExpenseCategory) {
    const { error } = await supabase.from('expense_categories').update({ active: !cat.active }).eq('id', cat.id)
    if (error) {
      showToast('Could not update category.', 'error')
      return
    }
    showToast(`Category ${cat.active ? 'disabled' : 'enabled'}.`, 'success')
    load()
  }

  return (
    <div>
      <PageHeader
        title="Expense Categories"
        description="Manage the categories available when logging expenses."
        actions={<button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Category</button>}
      />

      {loading ? <LoadingSpinner /> : categories.length === 0 ? (
        <div className="card"><EmptyState title="No categories yet" /></div>
      ) : (
        <div className="table-wrap card !p-0">
          <table className="w-full">
            <thead><tr><th className="th">Name</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="td font-medium text-navy-950">{c.name}</td>
                  <td className="td"><StatusBadge active={c.active} /></td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-3">
                      <button className="text-navy-600 hover:text-navy-800" onClick={() => setEditing(c)}><Pencil size={16} /></button>
                      <button
                        className={c.active ? 'text-rose-500 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-800'}
                        onClick={() => toggleActive(c)}
                      >
                        {c.active ? <Ban size={16} /> : <CheckCircle size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <CategoryModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {editing && <CategoryModal category={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </div>
  )
}

function CategoryModal({ category, onClose, onSaved }: { category?: ExpenseCategory; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const [name, setName] = useState(category?.name ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      showToast('Category name is required.', 'error')
      return
    }
    setSaving(true)
    const { error } = category
      ? await supabase.from('expense_categories').update({ name: name.trim() }).eq('id', category.id)
      : await supabase.from('expense_categories').insert({ name: name.trim() })
    setSaving(false)
    if (error) {
      showToast('Could not save category.', 'error')
      return
    }
    showToast(category ? 'Category updated.' : 'Category added.', 'success')
    onSaved()
  }

  return (
    <Modal open title={category ? 'Edit Category' : 'Add Category'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Category Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="btn-secondary flex-1" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}
