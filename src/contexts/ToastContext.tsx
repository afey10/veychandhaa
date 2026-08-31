import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const icon = { success: CheckCircle2, error: XCircle, info: Info }
  const style = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    info: 'bg-navy-50 border-navy-200 text-navy-800'
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => {
          const Icon = icon[t.type]
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in fade-in slide-in-from-top-2 ${style[t.type]}`}
              role="alert"
            >
              <Icon size={20} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
