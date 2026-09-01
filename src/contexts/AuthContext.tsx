import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, UserRole } from '../types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  role: UserRole | null
  isAdmin: boolean
  isStaff: boolean
  isViewOnly: boolean
  canEdit: boolean // administrator or staff
  signIn: (serviceNumber: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Service numbers are mapped to an internal email alias so we can use
// Supabase's standard email/password auth while presenting a
// "Service Number" field to the user, per the login page requirements.
function serviceNumberToEmail(serviceNumber: string): string {
  const cleaned = serviceNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${cleaned}@veymandoo-police.local`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      setProfile(null)
      return
    }
    setProfile(data as Profile)
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        await loadProfile(data.session.user.id)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        await loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn: AuthContextValue['signIn'] = async (serviceNumber, password) => {
    const email = serviceNumberToEmail(serviceNumber)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { error: 'Invalid service number or password.' }
    }

    // Confirm the profile exists and is active before allowing access.
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profileRow) {
      await supabase.auth.signOut()
      return { error: 'No profile found for this account. Contact your administrator.' }
    }

    if (!profileRow.active) {
      await supabase.auth.signOut()
      return { error: 'This account has been disabled. Contact your administrator.' }
    }

    setProfile(profileRow as Profile)
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }

  const refreshProfile = async () => {
    if (session?.user) {
      await loadProfile(session.user.id)
    }
  }

  const role = profile?.role ?? null

  const value: AuthContextValue = {
    session,
    profile,
    loading,
    role,
    isAdmin: role === 'administrator',
    isStaff: role === 'staff',
    isViewOnly: role === 'view_only',
    canEdit: role === 'administrator' || role === 'staff',
    signIn,
    signOut,
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export { serviceNumberToEmail }
