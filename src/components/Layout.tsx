import { ReactNode, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, PlusCircle, ListChecks, Receipt, FileBarChart,
  Users, Tags, UserCircle, LogOut, ChevronDown
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { RoleBadge } from './ui'

interface NavChild {
  label: string
  to: string
  requiresEdit?: boolean
}

interface NavItem {
  label: string
  to?: string
  base: string
  icon: ReactNode
  children?: NavChild[]
}

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, canEdit, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const navItems: NavItem[] = [
    { label: 'Dashboard', to: '/dashboard', base: '/dashboard', icon: <LayoutDashboard size={20} /> },
    {
      label: 'Chandhaa',
      base: '/chandhaa',
      icon: <ListChecks size={20} />,
      children: [
        { label: 'Add Chandhaa for the Month', to: '/chandhaa/add', requiresEdit: true },
        { label: 'Chandhaa Records', to: '/chandhaa/records' }
      ]
    },
    {
      label: 'Expenses',
      base: '/expenses',
      icon: <Receipt size={20} />,
      children: [
        { label: 'Add Expenses', to: '/expenses/add', requiresEdit: true },
        { label: 'Expense Records', to: '/expenses/records' }
      ]
    },
    {
      label: 'Reports',
      base: '/reports',
      icon: <FileBarChart size={20} />,
      children: [
        { label: 'Monthly Report', to: '/reports/monthly' },
        { label: 'Collection Report', to: '/reports/collection' },
        { label: 'Expense Report', to: '/reports/expense' },
        { label: 'Financial Summary', to: '/reports/summary' }
      ]
    }
  ]

  // Hide "add" style entries for view-only accounts — they can browse
  // records and reports, but the app itself blocks them from these
  // routes, so there's no point showing a link that leads to an
  // "access restricted" page.
  const visibleItems = navItems
    .map((item) => ({
      ...item,
      children: item.children?.filter((c) => !c.requiresEdit || canEdit)
    }))
    .filter((item) => item.to || (item.children && item.children.length > 0))

  const activeItem = visibleItems.find((item) => location.pathname.startsWith(item.base))
  const activeChildren = activeItem?.children

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Close the profile menu whenever the route changes.
  useEffect(() => {
    setProfileOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  function navTo(item: NavItem) {
    if (item.to) return item.to
    return item.children?.[0]?.to ?? '/dashboard'
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 sm:px-6 py-3 flex items-center gap-3">
        <img src="/logo.png" alt="Tha. Veymandoo Police" className="w-9 h-9 rounded-lg object-contain shrink-0" />
        <div className="min-w-0">
          <p className="font-display font-bold text-sm leading-tight text-navy-950 truncate">Tha. Veymandoo Police</p>
          <p className="text-xs text-slate-400 truncate">Chandhaa Management</p>
        </div>

        <div className="flex-1" />

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full pl-1.5 pr-2.5 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center shrink-0">
              <UserCircle size={20} />
            </span>
            <span className="hidden sm:block text-left leading-tight">
              <span className="block text-sm font-semibold text-navy-950 truncate max-w-[9rem]">{profile?.full_name}</span>
              <span className="block text-xs text-slate-400">#{profile?.service_number}</span>
            </span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl2 shadow-xl border border-slate-100 py-2 z-30">
              <div className="px-4 py-2.5 border-b border-slate-50">
                <p className="text-sm font-semibold text-navy-950 truncate">{profile?.full_name}</p>
                <p className="text-xs text-slate-400 mb-1.5">#{profile?.service_number}</p>
                {profile && <RoleBadge role={profile.role} />}
              </div>

              <NavLink to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <UserCircle size={17} /> Profile &amp; Settings
              </NavLink>

              {isAdmin && (
                <>
                  <p className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">Administration</p>
                  <NavLink to="/administration/users" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Users size={17} /> Users
                  </NavLink>
                  <NavLink to="/administration/categories" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Tags size={17} /> Expense Categories
                  </NavLink>
                </>
              )}

              <div className="border-t border-slate-50 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={17} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {activeChildren && activeChildren.length > 0 && (
        <div className="bg-white border-b border-slate-100 px-4 sm:px-6 overflow-x-auto">
          <div className="flex items-center gap-1 max-w-[1400px] mx-auto py-2">
            {activeChildren.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive ? 'bg-navy-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`
                }
              >
                {child.to.includes('add') && <PlusCircle size={14} />}
                {child.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 max-w-[1400px] w-full mx-auto">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-100 pb-[env(safe-area-inset-bottom)]">
        <div className={`grid max-w-[1400px] mx-auto`} style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}>
          {visibleItems.map((item) => {
            const isActive = location.pathname.startsWith(item.base)
            return (
              <button
                key={item.label}
                onClick={() => navigate(navTo(item))}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-navy-800' : 'text-slate-400 hover:text-navy-600'
                }`}
              >
                <span className={isActive ? 'text-navy-800' : 'text-slate-400'}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
