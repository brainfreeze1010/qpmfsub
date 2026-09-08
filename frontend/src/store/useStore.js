import { create } from 'zustand'

/* ── helpers ──────────────────────────────────────────────── */
function getInitialUser() {
  try { return JSON.parse(localStorage.getItem('mf_user')) } catch { return null }
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

/* Apply theme immediately on module load (before React renders) */
const _savedTheme = localStorage.getItem('mf_theme') || 'dark'
applyTheme(_savedTheme)

/* ── store ────────────────────────────────────────────────── */
const useStore = create((set, get) => ({
  /* Auth */
  user:  getInitialUser(),
  token: localStorage.getItem('mf_token') || null,

  setUser(user) {
    if (user) localStorage.setItem('mf_user', JSON.stringify(user))
    else       localStorage.removeItem('mf_user')
    set({ user })
  },

  setToken(token) {
    if (token) localStorage.setItem('mf_token', token)
    else       localStorage.removeItem('mf_token')
    set({ token })
  },

  clearAuth() {
    localStorage.removeItem('mf_token')
    localStorage.removeItem('mf_user')
    set({ user: null, token: null, notifications: [] })
  },

  /* Notifications */
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),

  /* Theme */
  theme: _savedTheme,

  setTheme(theme) {
    localStorage.setItem('mf_theme', theme)
    applyTheme(theme)
    set({ theme })
  },

  toggleTheme() {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
}))

export default useStore
