import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Bell,
  LogOut,
  Sun,
  Moon,
  LayoutDashboard,
  FileStack,
  Landmark,
  GitMerge,
  PlusCircle,
  FileText,
} from 'lucide-react'
import qpLogo from '../../logo/qplogo.png'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import useStore from '../store/useStore'
import { apiLogout, apiGetNotifications, apiMarkNotificationRead } from '../api/client'
import Badge from './common/Badge'

const BRANCH_TABS = [
  { to: '/branch/transactions/new', label: 'New Transaction', Icon: PlusCircle, end: true },
  { to: '/branch/transactions',     label: 'My Transactions', Icon: FileText,   end: false },
]

const HO_TABS = [
  { to: '/ho/dashboard',      label: 'Dashboard',      Icon: LayoutDashboard, end: true },
  { to: '/ho/transactions',   label: 'Transactions',   Icon: FileStack },
  { to: '/ho/banking',        label: 'Banking',        Icon: Landmark },
  { to: '/ho/reconciliation', label: 'Reconciliation', Icon: GitMerge },
]

export default function TopBar() {
  const { user, clearAuth, notifications, setNotifications, theme, toggleTheme } = useStore()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const tabs = user?.role === 'branch_user' ? BRANCH_TABS : HO_TABS

  /* ── Notification polling ──────────────────────────────── */
  const fetchNotifications = async () => {
    try {
      const res = await apiGetNotifications()
      setNotifications(res.data || [])
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /* ── Handlers ──────────────────────────────────────────── */
  const handleLogout = async () => {
    try { await apiLogout() } catch { /* ignore */ }
    clearAuth()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  const handleMarkRead = async (id, e) => {
    e.stopPropagation()
    try {
      await apiMarkNotificationRead(id)
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch { /* ignore */ }
  }

  /* ── Render ────────────────────────────────────────────── */
  return (
    <header className="h-14 bg-surface-paper border-b border-surface-border flex items-stretch flex-shrink-0 z-40">

      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 border-r border-surface-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
          <img src={qpLogo} alt="Quantum Phinance logo" className="h-full w-full object-cover" />
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-sm font-semibold text-ink">MF Recon</div>
          <div className="text-[10px] text-ink-muted">Quantum Phinance</div>
        </div>
      </div>

      {/* ── Navigation tabs ──────────────────────────────── */}
      <nav
        className="flex items-stretch flex-1 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex items-center gap-2 px-4 text-sm font-medium border-b-2',
                'transition-colors duration-150 whitespace-nowrap flex-shrink-0',
                isActive
                  ? 'border-qp-navy text-qp-navy'
                  : 'border-transparent text-ink-muted hover:text-ink hover:border-surface-border',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Right controls ───────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-3 flex-shrink-0 border-l border-surface-border">

        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="btn-ghost relative p-2"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-qp-red text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-surface-elevated rounded-2xl shadow-panel border border-surface-border z-50 max-h-96 overflow-y-auto">
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-qp-navy font-medium">{unreadCount} unread</span>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-ink-muted">
                  No notifications
                </div>
              ) : (
                <ul>
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={[
                        'px-4 py-3 border-b border-surface-border last:border-b-0 transition-colors',
                        !n.is_read ? 'bg-qp-navy-50' : 'hover:bg-surface-hover',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-ink truncate">
                            {n.title || n.message}
                          </p>
                          {n.title && (
                            <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                          )}
                          <p className="text-xs text-ink-subtle mt-1">
                            {n.created_at
                              ? format(parseISO(n.created_at), 'dd MMM yyyy, HH:mm')
                              : ''}
                          </p>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={(e) => handleMarkRead(n.id, e)}
                            className="text-xs text-qp-navy hover:text-qp-navy-light whitespace-nowrap mt-0.5 font-medium"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn-ghost p-2"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun  className="h-4 w-4" />
            : <Moon className="h-4 w-4" />}
        </button>

        {/* User name + role */}
        {user && (
          <div className="hidden md:flex items-center gap-2 px-2">
            <span className="text-sm font-medium text-ink">{user.name || user.username}</span>
            <Badge status={user.role} />
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="btn-ghost"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
