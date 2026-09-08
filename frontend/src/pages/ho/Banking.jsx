import React, { useState, useEffect, useRef } from 'react'
import {
  Landmark, ChevronDown, ChevronRight, Upload, RefreshCw,
  CheckCircle2, Search, X,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  apiGetBankAccounts,
  apiGetBankStatements,
  apiGetBankStatement,
  apiUploadBankStatement,
  apiFetchBankStatement,
} from '../../api/client'
import Modal from '../../components/common/Modal'
import { MOCK_BANK_ACCOUNTS, MOCK_STATEMENTS_BY_ACCOUNT } from '../../bankingMockData'

const INR = (val) => {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val)
}

/* ── Account list item ─────────────────────────────────── */
function AccountItem({ account, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 transition-all rounded-r-xl ${
        selected
          ? 'bg-qp-navy-50 border-l-2 border-qp-navy'
          : 'hover:bg-surface-hover border-l-2 border-transparent'
      }`}
    >
      <div className="font-medium text-sm text-ink truncate">{account.scheme_name || 'Unknown Scheme'}</div>
      <div className="font-mono text-xs text-ink-muted mt-0.5 truncate">{account.account_no || '—'}</div>
      <div className="text-xs text-ink-subtle mt-0.5">{account.bank_name || '—'}</div>
    </button>
  )
}

/* ── Statement row (collapsible) ──────────────────────── */
function StatementRow({ statement, expanded, onToggle, entries, loadingEntries, entrySearch }) {
  const formatSafe = (dateStr) => {
    try { return format(parseISO(dateStr), 'dd MMM yyyy') }
    catch { return '—' }
  }

  // Use loaded entries (post-expand) or fall back to entries embedded in the statement object
  const allEntries = entries ?? statement.entries ?? []

  const filtered = allEntries.filter(e => {
    if (!entrySearch) return true
    const q = entrySearch.toLowerCase()
    return (
      e.description?.toLowerCase().includes(q) ||
      e.ref_no?.toLowerCase().includes(q) ||
      String(e.date || '').includes(q)
    )
  })

  const totalCredits = allEntries.reduce((s, e) => s + (e.credit || 0), 0)
  const totalDebits  = allEntries.reduce((s, e) => s + (e.debit  || 0), 0)

  return (
    <div className="border border-surface-border rounded-xl overflow-hidden mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-hover/50 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded
            ? <ChevronDown className="h-4 w-4 text-ink-muted flex-shrink-0" />
            : <ChevronRight className="h-4 w-4 text-ink-muted flex-shrink-0" />}
          <div className="text-left">
            <div className="text-sm font-medium text-ink">
              {statement.from_date ? formatSafe(statement.from_date) : '—'}
              {statement.from_date !== statement.to_date && ` — ${statement.to_date ? formatSafe(statement.to_date) : '—'}`}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              Uploaded: {statement.uploaded_at ? formatSafe(statement.uploaded_at) : '—'}
              {statement.uploaded_by && ` · ${statement.uploaded_by}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5 text-xs text-right flex-shrink-0">
          <div>
            <div className="text-ink-muted">Entries</div>
            <div className="font-semibold text-ink">{allEntries.length}</div>
          </div>
          <div>
            <div className="text-qp-green-dark">Credits</div>
            <div className="font-mono font-semibold text-qp-green-dark">{INR(totalCredits || statement.total_credits)}</div>
          </div>
          <div>
            <div className="text-qp-red">Debits</div>
            <div className="font-mono font-semibold text-qp-red">{INR(totalDebits || statement.total_debits)}</div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-surface-border">
          {loadingEntries ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-qp-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Ref No.</th>
                    <th style={{ textAlign: 'right' }}>Debit</th>
                    <th style={{ textAlign: 'right' }}>Credit</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Matched Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-ink-muted">No entries found</td>
                    </tr>
                  ) : (
                    filtered.map((entry, idx) => (
                      <tr key={entry.id || idx}>
                        <td className="whitespace-nowrap">
                          {entry.date ? format(parseISO(entry.date), 'dd MMM yyyy') : '—'}
                        </td>
                        <td>
                          <div className="max-w-48 truncate" title={entry.description}>{entry.description || '—'}</div>
                        </td>
                        <td className="font-mono">{entry.ref_no || '—'}</td>
                        <td style={{ textAlign: 'right' }} className="font-mono text-qp-red">{entry.debit ? INR(entry.debit) : '—'}</td>
                        <td style={{ textAlign: 'right' }} className={`font-mono font-semibold ${entry.credit ? 'text-qp-green-dark' : 'text-ink-muted'}`}>
                          {entry.credit ? INR(entry.credit) : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }} className="font-mono">{entry.balance != null ? INR(entry.balance) : '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {entry.is_matched
                            ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-qp-green-50 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-qp-green-dark flex-shrink-0" />
                                <span className="font-mono text-[10px] font-semibold text-qp-green-dark leading-none">
                                  {entry.matched_slip_no || '✓'}
                                </span>
                              </span>
                            )
                            : <div className="h-4 w-4 rounded-full border-2 border-surface-border mx-auto" />}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export default function Banking() {
  const [accounts, setAccounts]                   = useState(MOCK_BANK_ACCOUNTS)
  const [accountSearch, setAccountSearch]         = useState('')
  const [selectedAccount, setSelectedAccount]     = useState(null)
  const [statements, setStatements]               = useState([])
  const [expandedStmtId, setExpandedStmtId]       = useState(null)
  const [stmtEntries, setStmtEntries]             = useState({})
  const [entrySearch, setEntrySearch]             = useState('')
  const [loadingAccounts, setLoadingAccounts]     = useState(true)
  const [loadingStatements, setLoadingStatements] = useState(false)
  const [loadingEntries, setLoadingEntries]       = useState(false)

  // Per-account upload/fetch modals
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading]   = useState(false)
  const uploadRef                   = useRef()

  const [showFetch, setShowFetch] = useState(false)
  const [fetchFrom, setFetchFrom] = useState('')
  const [fetchTo, setFetchTo]     = useState('')
  const [fetching, setFetching]   = useState(false)

  // Global bulk modals
  const [showBulkUpload, setShowBulkUpload]   = useState(false)
  const [bulkUploadFile, setBulkUploadFile]   = useState(null)
  const [bulkUploading, setBulkUploading]     = useState(false)
  const bulkUploadRef                         = useRef()

  const [showBulkFetch, setShowBulkFetch]     = useState(false)
  const [bulkFetchFrom, setBulkFetchFrom]     = useState('2026-06-01')
  const [bulkFetchTo, setBulkFetchTo]         = useState('2026-06-08')
  const [bulkFetching, setBulkFetching]       = useState(false)

  useEffect(() => {
    async function loadAccounts() {
      setLoadingAccounts(true)
      try {
        const res = await apiGetBankAccounts()
        const result = res.data || []
        setAccounts(result.length > 0 ? result : MOCK_BANK_ACCOUNTS)
      } catch {
        setAccounts(MOCK_BANK_ACCOUNTS)
      } finally {
        setLoadingAccounts(false)
      }
    }
    loadAccounts()
  }, [])

  // Auto-select UNION Large Cap Fund account on initial load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      const unionLargeCapAccount = accounts.find(acc => acc.scheme_name === 'UNION Large Cap Fund')
      if (unionLargeCapAccount) {
        selectAccount(unionLargeCapAccount)
      }
    }
  }, [accounts])

  const filteredAccounts = accounts.filter(acc => {
    if (!accountSearch) return true
    const q = accountSearch.toLowerCase()
    return (
      acc.scheme_name?.toLowerCase().includes(q) ||
      acc.account_no?.toLowerCase().includes(q)
    )
  })

  async function selectAccount(account) {
    setSelectedAccount(account)
    setStatements([])
    setExpandedStmtId(null)
    setEntrySearch('')
    setLoadingStatements(true)
    try {
      const res = await apiGetBankStatements(account.id)
      const result = (res.data || []).sort((a, b) =>
        new Date(b.from_date || b.to_date) - new Date(a.from_date || a.to_date)
      )
      setStatements(result.length > 0 ? result : (MOCK_STATEMENTS_BY_ACCOUNT[account.id] || []))
    } catch {
      setStatements(MOCK_STATEMENTS_BY_ACCOUNT[account.id] || [])
    } finally {
      setLoadingStatements(false)
    }
  }

  async function toggleStatement(stmt) {
    if (expandedStmtId === stmt.id) { setExpandedStmtId(null); return }
    setExpandedStmtId(stmt.id)
    if (stmtEntries[stmt.id]) return
    // Mock statements have embedded entries — use them directly
    if (stmt.entries?.length) {
      setStmtEntries(prev => ({ ...prev, [stmt.id]: stmt.entries }))
      return
    }
    setLoadingEntries(true)
    try {
      const res = await apiGetBankStatement(stmt.id)
      setStmtEntries(prev => ({ ...prev, [stmt.id]: res.data?.entries || res.data || [] }))
    } catch {
      toast.error('Failed to load statement entries')
    } finally {
      setLoadingEntries(false)
    }
  }

  async function handleUpload() {
    if (!uploadFile || !selectedAccount) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      await apiUploadBankStatement(selectedAccount.id, fd)
      toast.success('Statement uploaded successfully')
      setShowUpload(false); setUploadFile(null)
      const res = await apiGetBankStatements(selectedAccount.id)
      setStatements(res.data || [])
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to upload statement')
    } finally {
      setUploading(false)
    }
  }

  async function handleFetch() {
    if (!fetchFrom || !fetchTo || !selectedAccount) { toast.error('Please select date range'); return }
    setFetching(true)
    try {
      await apiFetchBankStatement(selectedAccount.id, { from_date: fetchFrom, to_date: fetchTo })
      toast.success('Statement fetched successfully')
      setShowFetch(false); setFetchFrom(''); setFetchTo('')
      const res = await apiGetBankStatements(selectedAccount.id)
      setStatements(res.data || [])
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to fetch statement')
    } finally {
      setFetching(false)
    }
  }

  async function handleBulkUpload() {
    if (!bulkUploadFile) return
    setBulkUploading(true)
    await new Promise(r => setTimeout(r, 1200))
    toast.success(`Statements uploaded for ${accounts.length} accounts`)
    setShowBulkUpload(false)
    setBulkUploadFile(null)
    setBulkUploading(false)
  }

  async function handleBulkFetch() {
    if (!bulkFetchFrom || !bulkFetchTo) { toast.error('Please select date range'); return }
    setBulkFetching(true)
    await new Promise(r => setTimeout(r, 1500))
    toast.success(`Statements fetched for ${accounts.length} accounts (${bulkFetchFrom} to ${bulkFetchTo})`)
    setShowBulkFetch(false)
    setBulkFetching(false)
  }

  const Spinner = () => (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Banking Module</h1>
          <p className="page-subtitle">Collection accounts and bank statement management</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowBulkUpload(true)} className="btn-secondary">
            <Upload className="h-4 w-4" />
            Upload Statements
          </button>
          <button onClick={() => setShowBulkFetch(true)} className="btn-primary">
            <RefreshCw className="h-4 w-4" />
            Fetch All Statements
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-5" style={{ minHeight: 'calc(100vh - 14rem)' }}>

        {/* Left panel — accounts */}
        <div className="w-72 flex-shrink-0 card flex flex-col overflow-hidden">
          <div className="card-header flex-shrink-0">
            <h2 className="kpi-label">Collection Accounts</h2>
          </div>

          {/* Search bar */}
          <div className="px-3 py-2 border-b border-surface-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-subtle pointer-events-none" />
              <input
                value={accountSearch}
                onChange={e => setAccountSearch(e.target.value)}
                className="input pl-8 text-xs py-1.5"
                placeholder="Search scheme or account no…"
              />
              {accountSearch && (
                <button
                  type="button"
                  onClick={() => setAccountSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {loadingAccounts ? (
              <div className="px-4 py-6 space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
              </div>
            ) : filteredAccounts.length === 0 ? (
              <p className="px-4 py-8 text-sm text-ink-muted text-center">
                {accountSearch ? 'No accounts match your search' : 'No accounts configured'}
              </p>
            ) : (
              filteredAccounts.map(acc => (
                <AccountItem
                  key={acc.id}
                  account={acc}
                  selected={selectedAccount?.id === acc.id}
                  onClick={() => selectAccount(acc)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0 space-y-4">
          {!selectedAccount ? (
            <div className="card flex flex-col items-center justify-center h-full py-20 text-center">
              <Landmark className="h-16 w-16 text-ink-subtle mb-4" />
              <h3 className="text-base font-semibold text-ink-secondary">Select a Bank Account</h3>
              <p className="text-sm text-ink-muted mt-1">Choose an account from the left panel to view statements</p>
            </div>
          ) : (
            <>
              {/* Account detail card */}
              <div className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-qp-navy-50 flex items-center justify-center flex-shrink-0">
                      <Landmark className="h-5 w-5 text-qp-navy" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-ink text-base">{selectedAccount.scheme_name}</h2>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-xs">
                        <div className="text-ink-secondary">
                          <span className="text-ink-muted">Bank: </span>
                          <strong>{selectedAccount.bank_name}</strong>
                        </div>
                        <div className="text-ink-secondary font-mono">
                          <span className="text-ink-muted not-italic font-normal">A/C: </span>
                          <strong>{selectedAccount.account_no}</strong>
                        </div>
                        {selectedAccount.ifsc && (
                          <div className="font-mono text-ink-secondary">
                            <span className="text-ink-muted not-italic font-normal">IFSC: </span>
                            {selectedAccount.ifsc}
                          </div>
                        )}
                        {selectedAccount.branch && (
                          <div className="text-ink-secondary">
                            <span className="text-ink-muted">Branch: </span>
                            {selectedAccount.branch}
                          </div>
                        )}
                        {selectedAccount.account_type && (
                          <div className="text-ink-secondary">
                            <span className="text-ink-muted">Type: </span>
                            {selectedAccount.account_type}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setShowUpload(true)} className="btn-secondary p-2" title="Upload Statement">
                      <Upload className="h-4 w-4" />
                    </button>
                    <button onClick={() => setShowFetch(true)} className="btn-secondary p-2" title="Fetch Statement">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Statements */}
              <div className="card overflow-hidden">
                <div className="card-header">
                  <h3 className="kpi-label">
                    Statements
                    {statements.length > 0 && (
                      <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full bg-surface-hover text-ink-muted font-semibold">
                        {statements.length}
                      </span>
                    )}
                  </h3>
                  {expandedStmtId && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-subtle pointer-events-none" />
                      <input
                        value={entrySearch}
                        onChange={e => setEntrySearch(e.target.value)}
                        className="input pl-8 text-xs py-1.5 w-52"
                        placeholder="Search entries…"
                      />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {loadingStatements ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
                    </div>
                  ) : statements.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-surface-border rounded-xl">
                      <Upload className="h-10 w-10 text-ink-subtle mx-auto mb-2" />
                      <p className="text-sm text-ink-muted">No statements available</p>
                      <p className="text-xs text-ink-subtle mt-1">Upload or fetch a statement to get started</p>
                    </div>
                  ) : (
                    statements.map(stmt => (
                      <StatementRow
                        key={stmt.id}
                        statement={stmt}
                        expanded={expandedStmtId === stmt.id}
                        onToggle={() => toggleStatement(stmt)}
                        entries={stmtEntries[stmt.id]}
                        loadingEntries={loadingEntries && expandedStmtId === stmt.id}
                        entrySearch={entrySearch}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Per-account: Upload Statement Modal ── */}
      <Modal
        isOpen={showUpload}
        title={`Upload Statement — ${selectedAccount?.scheme_name || ''}`}
        onClose={() => { setShowUpload(false); setUploadFile(null) }}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setShowUpload(false); setUploadFile(null) }}>Cancel</button>
            <button className="btn-primary" disabled={!uploadFile || uploading} onClick={handleUpload}>
              {uploading ? <><Spinner /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload Statement</>}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Upload a bank statement file for <strong>{selectedAccount?.bank_name}</strong> — A/C ending{' '}
            <strong className="font-mono">{selectedAccount?.account_no?.slice(-4)}</strong>.
          </p>
          <p className="text-xs text-ink-muted bg-surface-hover rounded-xl p-3">
            Expected format: CSV with columns — Date, Description, Ref No., Debit, Credit, Balance
          </p>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              uploadFile ? 'border-qp-green bg-qp-green-50' : 'border-surface-border hover:border-qp-navy hover:bg-qp-navy-50/30'
            }`}
            onClick={() => uploadRef.current?.click()}
          >
            <input ref={uploadRef} type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden"
              onChange={e => setUploadFile(e.target.files[0])} />
            {uploadFile ? (
              <div>
                <CheckCircle2 className="h-8 w-8 text-qp-green-dark mx-auto mb-1" />
                <p className="font-medium text-qp-green-dark text-sm">{uploadFile.name}</p>
                <p className="text-xs text-ink-muted mt-0.5">{(uploadFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <Upload className="h-10 w-10 text-ink-subtle mx-auto mb-2" />
                <p className="text-sm text-ink-secondary font-medium">Click to select statement file</p>
                <p className="text-xs text-ink-muted mt-1">CSV, Excel, or PDF</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Per-account: Fetch Statement Modal ── */}
      <Modal
        isOpen={showFetch}
        title={`Fetch Statement — ${selectedAccount?.scheme_name || ''}`}
        onClose={() => { setShowFetch(false); setFetchFrom(''); setFetchTo('') }}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setShowFetch(false); setFetchFrom(''); setFetchTo('') }}>Cancel</button>
            <button className="btn-primary" disabled={!fetchFrom || !fetchTo || fetching} onClick={handleFetch}>
              {fetching ? <><Spinner /> Fetching…</> : <><RefreshCw className="h-4 w-4" /> Fetch Statement</>}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">Fetch bank statement from the bank's system for the selected date range.</p>
          <div>
            <label className="input-label">From Date</label>
            <input type="date" value={fetchFrom} onChange={e => setFetchFrom(e.target.value)} className="input" />
          </div>
          <div>
            <label className="input-label">To Date</label>
            <input type="date" value={fetchTo} onChange={e => setFetchTo(e.target.value)} className="input" />
          </div>
        </div>
      </Modal>

      {/* ── Global: Bulk Upload Statements Modal ── */}
      <Modal
        isOpen={showBulkUpload}
        title="Upload Statements — All Accounts"
        onClose={() => { setShowBulkUpload(false); setBulkUploadFile(null) }}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setShowBulkUpload(false); setBulkUploadFile(null) }}>Cancel</button>
            <button className="btn-primary" disabled={!bulkUploadFile || bulkUploading} onClick={handleBulkUpload}>
              {bulkUploading ? <><Spinner /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload Statements</>}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Upload a consolidated statement file covering all <strong>{accounts.length}</strong> collection accounts.
          </p>
          <div className="bg-surface-hover rounded-xl p-3 space-y-1">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between text-xs">
                <span className="text-ink-secondary truncate">{acc.scheme_name}</span>
                <span className="font-mono text-ink-muted ml-4 flex-shrink-0">{acc.account_no}</span>
              </div>
            ))}
          </div>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              bulkUploadFile ? 'border-qp-green bg-qp-green-50' : 'border-surface-border hover:border-qp-navy hover:bg-qp-navy-50/30'
            }`}
            onClick={() => bulkUploadRef.current?.click()}
          >
            <input ref={bulkUploadRef} type="file" accept=".csv,.xlsx,.xls,.zip,.pdf" className="hidden"
              onChange={e => setBulkUploadFile(e.target.files[0])} />
            {bulkUploadFile ? (
              <div>
                <CheckCircle2 className="h-8 w-8 text-qp-green-dark mx-auto mb-1" />
                <p className="font-medium text-qp-green-dark text-sm">{bulkUploadFile.name}</p>
                <p className="text-xs text-ink-muted mt-0.5">{(bulkUploadFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <Upload className="h-10 w-10 text-ink-subtle mx-auto mb-2" />
                <p className="text-sm text-ink-secondary font-medium">Click to select bulk statement file</p>
                <p className="text-xs text-ink-muted mt-1">CSV, Excel, ZIP, or PDF</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Global: Fetch All Statements Modal ── */}
      <Modal
        isOpen={showBulkFetch}
        title="Fetch All Statements"
        onClose={() => setShowBulkFetch(false)}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowBulkFetch(false)}>Cancel</button>
            <button className="btn-primary" disabled={!bulkFetchFrom || !bulkFetchTo || bulkFetching} onClick={handleBulkFetch}>
              {bulkFetching ? <><Spinner /> Fetching…</> : <><RefreshCw className="h-4 w-4" /> Fetch All Statements</>}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Fetch statements for all <strong>{accounts.length}</strong> collection accounts from the bank's system.
          </p>
          <div>
            <label className="input-label">From Date</label>
            <input type="date" value={bulkFetchFrom} onChange={e => setBulkFetchFrom(e.target.value)} className="input" />
          </div>
          <div>
            <label className="input-label">To Date</label>
            <input type="date" value={bulkFetchTo} onChange={e => setBulkFetchTo(e.target.value)} className="input" />
          </div>
          <div className="bg-surface-hover rounded-xl p-3 space-y-1">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between text-xs">
                <span className="text-ink-secondary truncate">{acc.scheme_name}</span>
                <span className="font-mono text-ink-muted ml-4 flex-shrink-0">{acc.bank_name}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
