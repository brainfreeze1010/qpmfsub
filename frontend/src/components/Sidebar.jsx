import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  PlusCircle,
  FileText,
  LayoutDashboard,
  FileStack,
  Landmark,
  GitMerge,
} from 'lucide-react'
import useStore from '../store/useStore'
import Badge from './common/Badge'

const branchLinks = [
  { to: '/branch/transactions/new', label: 'New Transaction', icon: PlusCircle, end: true },
  { to: '/branch/transactions',     label: 'My Transactions', icon: FileText,   end: true },
]

const hoLinks = [
  { to: '/ho/dashboard',      label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/ho/transactions',   label: 'All Transactions', icon: FileStack },
  { to: '/ho/banking',        label: 'Banking',          icon: Landmark },
  { to: '/ho/reconciliation', label: 'Reconciliation',   icon: GitMerge },
]

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-subtle px-2 py-1 mt-2 mb-1">
      {children}
    </div>
  )
}

function NavItem({ to, label, Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-qp-navy-50 text-qp-navy font-semibold'
            : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
        }`
      }
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user } = useStore()

  if (!user) return null

  const isBranch = user.role === 'branch_user'

  return (
    <aside className="w-64 h-screen bg-surface-paper border-r border-surface-border flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="bg-qp-navy rounded-lg p-1.5 flex-shrink-0">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-ink text-sm leading-tight">MF Sub Recon</div>
            <div className="text-[11px] text-ink-muted leading-tight">Quantum Phinance</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {isBranch ? (
          <>
            <SectionLabel>Branch</SectionLabel>
            {branchLinks.map((link) => (
              <NavItem key={link.to} to={link.to} label={link.label} Icon={link.icon} end={link.end} />
            ))}
          </>
        ) : (
          <>
            <SectionLabel>Head Office</SectionLabel>
            {hoLinks.map((link) => (
              <NavItem
                key={link.to}
                to={link.to}
                label={link.label}
                Icon={link.icon}
                end={link.to === '/ho/dashboard'}
              />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-surface-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink truncate">
              {user.name || user.username}
            </div>
            {user.branch_name && (
              <div className="text-[11px] text-ink-muted truncate">{user.branch_name}</div>
            )}
          </div>
          <Badge status={user.role} className="flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
