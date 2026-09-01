export type UserRole = 'administrator' | 'staff' | 'view_only'

export interface Profile {
  id: string
  service_number: string
  full_name: string
  role: UserRole
  active: boolean
  created_at: string
  updated_at: string
  last_login?: string | null
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'other'

export interface Chandhaa {
  id: string
  contributor_name: string
  service_number: string | null
  month: number
  year: number
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  reference_number: string | null
  remarks: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  created_by_name?: string
}

export interface ExpenseCategory {
  id: string
  name: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  expense_date: string
  category_id: string
  description: string
  amount: number
  payment_method: PaymentMethod
  reference_number: string | null
  remarks: string | null
  receipt_url: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  category_name?: string
  created_by_name?: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  description: string | null
  created_at: string
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function formatMVR(amount: number): string {
  return `MVR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
