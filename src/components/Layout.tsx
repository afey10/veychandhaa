import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, PlusCircle, ListChecks, Receipt, FileBarChart,
  Users, Tags, UserCircle, LogOut, Menu, X, ShieldCheck, ChevronDown
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { RoleBadge } from './ui'

interface NavItem {
  label: string
  to?: string
  icon: ReactNode
  children?: { label: string; to: string }[]
  adminOnly?: boolean
}

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems: NavItem[] = [
    { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    {
      label: 'Chandhaa',
      icon: <ListChecks size={18} />,
      children: [
        { label: 'Add Chandhaa for the Month', to: '/chandhaa/add' },
        { label: 'Chandhaa Records', to: '/chandhaa/records' }
      ]
    },
    {
      label: 'Expenses',
      icon: <Receipt size={18} />,
      children: [
        { label: 'Add Expenses', to: '/expenses/add' },
        { label: 'Expense Records', to: '/expenses/records' }
      ]
    },
    {
      label: 'Reports',
      icon: <FileBarChart size={18} />,
      children: [
        { label: 'Monthly Report', to: '/reports/monthly' },
        { label: 'Collection Report', to: '/reports/collection' },
        { label: 'Expense Report', to: '/reports/expense' },
        { label: 'Financial Summary', to: '/reports/summary' }
      ]
    },
    {
      label: 'Administration',
      icon: <ShieldCheck size={18} />,
      adminOnly: true,
      children: [
        { label: 'Users', to: '/administration/users' },
        { label: 'Expense Categories', to: '/administration/categories' }
      ]
    }
  ]

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-navy-950/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-navy-950 text-navy-100 flex flex-col transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <img src="/logo.png" alt="Tha. Veymandoo Police" className="w-10 h-10 rounded-lg object-contain shrink-0" />
          <div className="min-w-0">
            <p className="font-display font-bold text-sm leading-tight text-white truncate">Tha. Veymandoo Police</p>
            <p className="text-xs text-navy-300 truncate">Chandhaa Management</p>
          </div>
          <button className="ml-auto lg:hidden text-navy-300" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleItems.map((item) =>
            item.children ? (
              <NavGroup key={item.label} item={item} onNavigate={() => setMobileOpen(false)} />
            ) : (
              <NavLink
                key={item.label}
                to={item.to!}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/10 text-white' : 'text-navy-200 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="border-t border-white/10 p-3 space-y-1">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                isActive ? 'bg-white/10 text-white' : 'text-navy-200 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <UserCircle size={18} />
            Profile
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <button className="lg:hidden text-navy-800" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-navy-950 leading-tight">{profile?.full_name}</p>
              <p className="text-xs text-slate-400">#{profile?.service_number}</p>
            </div>
            {profile && <RoleBadge role={profile.role} />}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}

function NavGroup({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-navy-200 hover:bg-white/5 hover:text-white"
      >
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-4 pl-4 border-l border-white/10 mt-1 space-y-0.5">
          {item.children!.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-white/10 text-white font-medium' : 'text-navy-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {child.to.includes('add') && <PlusCircle size={14} className="shrink-0" />}
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}
