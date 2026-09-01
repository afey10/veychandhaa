import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types'
import { LoadingSpinner } from './ui'
import Layout from './Layout'
import { ShieldOff } from 'lucide-react'

export default function ProtectedRoute({
  children,
  allowedRoles
}: {
  children: ReactNode
  allowedRoles?: UserRole[]
}) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner label="Checking your session…" />
      </div>
    )
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />
  }

  if (!profile.active) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <ShieldOff size={26} />
          </div>
          <h2 className="font-display font-bold text-xl text-navy-950">Access restricted</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">
            Your account role ({profile.role.replace('_', ' ')}) does not have permission to view this page.
          </p>
        </div>
      </Layout>
    )
  }

  return <Layout>{children}</Layout>
}
