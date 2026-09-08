import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mf_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('mf_token')
      localStorage.removeItem('mf_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const apiLogin = (data) => api.post('/auth/login', data)
export const apiLogout = () => api.post('/auth/logout')
export const apiMe = () => api.get('/auth/me')

// Transactions
export const apiGetTransactions = (params) => api.get('/transactions', { params })
export const apiCreateTransaction = (data) => api.post('/transactions', data)
export const apiGetTransaction = (id) => api.get(`/transactions/${id}`)
export const apiUploadSlip = (id, formData) =>
  api.post(`/transactions/${id}/upload-slip`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const apiGetTransactionStats = () => api.get('/transactions/stats')
export const apiGetTransactionBankCredit = (id) => api.get(`/transactions/${id}/bank-credit`)
export const apiBulkCreateTransactions = (rows) => api.post('/transactions/bulk', { rows })

// Banking
export const apiGetBankAccounts = () => api.get('/banking/accounts')
export const apiGetBankStatements = (accountId) =>
  api.get(`/banking/accounts/${accountId}/statements`)
export const apiGetBankStatement = (stmtId) =>
  api.get(`/banking/statements/${stmtId}`)
export const apiUploadBankStatement = (accountId, formData) =>
  api.post(`/banking/accounts/${accountId}/upload-statement`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const apiFetchBankStatement = (accountId, data) =>
  api.post(`/banking/accounts/${accountId}/fetch-statement`, data)

// Reconciliation
export const apiGetReconRuns = () => api.get('/reconciliation/runs')
export const apiCreateReconRun = (data) => api.post('/reconciliation/runs', data)
export const apiGetReconRun = (runId) => api.get(`/reconciliation/runs/${runId}`)
export const apiGetReconMatches = (runId) =>
  api.get(`/reconciliation/runs/${runId}/matches`)
export const apiMakerAction = (matchId, data) =>
  api.post(`/reconciliation/matches/${matchId}/maker-action`, data)
export const apiCheckerAction = (matchId, data) =>
  api.post(`/reconciliation/matches/${matchId}/checker-action`, data)
export const apiManualMap = (data) => api.post('/reconciliation/manual-map', data)
export const apiGetNotifications = () => api.get('/reconciliation/notifications')
export const apiMarkNotificationRead = (id) =>
  api.post(`/reconciliation/notifications/${id}/read`)

export default api
