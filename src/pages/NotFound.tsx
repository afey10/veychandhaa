import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-4">
      <div className="w-14 h-14 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center mb-4">
        <ShieldAlert size={26} />
      </div>
      <h1 className="font-display font-bold text-2xl text-navy-950">Page not found</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-sm">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/dashboard" className="btn-primary mt-6">Back to Dashboard</Link>
    </div>
  )
}
