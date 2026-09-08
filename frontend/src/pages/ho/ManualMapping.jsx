import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Link2, Search, CheckCircle2, Landmark } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { apiGetBankAccounts, apiGetBankStatements, apiManualMap } from '../../api/client'
import useStore from '../../store/useStore'

const INR = (val) => {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val)
}

const MOCK_UNMATCHED_ENTRIES = [
  {
    id: 'be-ba001-0602-001',
    date: '2026-06-02',
    description: 'NEFT CR-NEFT2606020001-Suresh Patel',
    ref_no: 'NEFT2606020001',
    credit: 30000.0,
    scheme_name: 'UNION Large Cap Fund',
    bank_name: 'Union Bank of India',
  },
  {
    id: 'be-ba001-0603-002',
    date: '2026-06-03',
    description: 'CHQ CR-CHQ2606030001-Vikram Nair',
    ref_no: 'CHQ2606030001',
    credit: 20000.0,
    scheme_name: 'UNION Large Cap Fund',
    bank_name: 'Union Bank of India',
  },
  {
    id: 'be-ba001-0605-001',
    date: '2026-06-05',
    description: 'NEFT CR-NEFT2606050001-Meena Iyer',
    ref_no: 'NEFT2606050001',
    credit: 15000.0,
    scheme_name: 'UNION Large Cap Fund',
    bank_name: 'Union Bank of India',
  },
  {
    id: 'be-ba001-0605-003',
    date: '2026-06-05',
    description: 'NEFT CR-NEFT2606050002-Rajan Mehta',
    ref_no: 'NEFT2606050002',
    credit: 50000.0,
    scheme_name: 'UNION Large Cap Fund',
    bank_name: 'Union Bank of India',
  },
  {
    id: 'be-ba002-0602-001',
    date: '2026-06-02',
    description: 'NEFT CR-NEFT2606020011-Lakshman Rao',
    ref_no: 'NEFT2606020011',
    credit: 25000.0,
    scheme_name: 'UNION Flexi Cap Fund',
    bank_name: 'Union Bank of India',
  },
  {
    id: 'be-ba002-0604-001',
    date: '2026-06-04',
    description: 'NEFT CR-NEFT2606040011-Shyam Krishnamurthy',
    ref_no: 'NEFT2606040011',
    credit: 60000.0,
    scheme_name: 'UNION Flexi Cap Fund',
    bank_name: 'Union Bank of India',
  },
  {
    id: 'be-ba002-0604-002',
    date: '2026-06-04',
    description: 'CHQ CR-CHQ2606040011-Rekha Pillai',
    ref_no: 'CHQ2606040011',
    credit: 40000.0,
    scheme_name: 'UNION Flexi Cap Fund',
    bank_name: 'Union Bank of India',
  },
  {
    id: 'be-ba002-0605-001',
    date: '2026-06-05',
    description: 'NEFT CR-NEFT2606050011-Vinod Joshi',
    ref_no: 'NEFT2606050011',
    credit: 18000.0,
    scheme_name: 'UNION Flexi Cap Fund',
    bank_name: 'Union Bank of India',
  },
]

export default function ManualMapping() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useStore()

  const { match, runId } = location.state || {}
  const txn = match?.transaction || {}
  const txnAmt = txn.purchase_amount || txn.switch_amount || txn.redemption_amount

  const [allEntries, setAllEntries]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState([])
  const [submitting, setSubmitting]     = useState(false)

  useEffect(() => {
    if (!match) return
    async function loadEntries() {
      setLoading(true)
      try {
        const accRes = await apiGetBankAccounts()
        const accounts = accRes.data || []
        const entries = []
        await Promise.all(
          accounts.map(async (acc) => {
            try {
              const stmtRes = await apiGetBankStatements(acc.id)
              const stmts = stmtRes.data || []
              stmts.forEach(stmt => {
                (stmt.entries || []).forEach(e => {
                  if (!e.is_matched && e.credit > 0) {
                    entries.push({ ...e, account_id: acc.id, scheme_name: acc.scheme_name, bank_name: acc.bank_name })
                  }
                })
              })
            } catch {
              // skip failed account
            }
          })
        )
        entries.sort((a, b) => {
          const diff = a => txnAmt ? Math.abs((a.credit || 0) - txnAmt) : 0
          return diff(a) - diff(b)
        })
        const sorted = entries.length > 0 ? entries : [...MOCK_UNMATCHED_ENTRIES].sort((a, b) => {
          const d = x => txnAmt ? Math.abs((x.credit || 0) - txnAmt) : 0
          return d(a) - d(b)
        })
        setAllEntries(sorted)
      } catch {
        setAllEntries(MOCK_UNMATCHED_ENTRIES)
      } finally {
        setLoading(false)
      }
    }
    loadEntries()
  }, [match])

  const filtered = allEntries.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.description?.toLowerCase().includes(q) ||
      e.ref_no?.toLowerCase().includes(q) ||
      e.scheme_name?.toLowerCase().includes(q) ||
      String(e.credit || '').includes(q)
    )
  })

  function toggleEntry(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleConfirm() {
    if (selected.length === 0) { toast.error('Select at least one bank entry'); return }
    if (!runId || !txn.id) { toast.error('Missing run or transaction context'); return }
    setSubmitting(true)
    try {
      await apiManualMap({
        run_id:         runId,
        transaction_id: txn.id,
        bank_entry_ids: selected,
        remarks:        `Manual map by ${user?.name || user?.username}`,
      })
      toast.success('Mapping confirmed successfully')
      navigate('/ho/reconciliation')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Mapping failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-ink-muted">No mapping context found.</p>
        <button className="btn-secondary" onClick={() => navigate('/ho/reconciliation')}>
          <ArrowLeft className="h-4 w-4" /> Back to Reconciliation
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/ho/reconciliation')}
          className="btn-ghost p-2"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="page-title">Manual Mapping</h1>
          <p className="page-subtitle">Map an unreconciled transaction slip to a bank credit entry</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left — transaction */}
        <div className="card overflow-hidden">
          <div className="card-header border-l-4 border-l-qp-red">
            <h2 className="kpi-label text-qp-red">Unreconciled Transaction</h2>
          </div>
          <div className="p-5">
            <dl className="space-y-3">
              {[
                ['Slip No.',     txn.slip_no,                                  true],
                ['Unit Holder',  txn.unitholder_name,                          false],
                ['PAN',          txn.pan,                                       true],
                ['Scheme',       txn.scheme_name,                               false],
                ['Amount',       INR(txnAmt),                                   true],
                ['Payment Mode', txn.purchase_payment_mode,                    false],
                ['Cheque / UTR', txn.purchase_cheque_utr_no,                   true],
                ['Branch',       txn.branch_name,                              false],
                ['Date',         txn.submitted_at
                  ? format(parseISO(txn.submitted_at), 'dd MMM yyyy')
                  : null,                                                        false],
              ].map(([label, val, mono]) => (
                <div key={label} className="flex justify-between gap-4 text-sm">
                  <dt className="text-ink-muted flex-shrink-0 w-28">{label}</dt>
                  <dd className={`text-ink text-right ${mono ? 'font-mono' : ''}`}>{val || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Right — bank entries */}
        <div className="card overflow-hidden flex flex-col">
          <div className="card-header border-l-4 border-l-qp-green">
            <h2 className="kpi-label text-qp-green-dark">Available Bank Credit Entries</h2>
            <div className="flex items-center gap-2 ml-auto">
              {selected.length > 0 && (
                <span className="text-xs font-semibold text-qp-navy bg-qp-navy-50 px-2 py-0.5 rounded-full">
                  {selected.length} selected
                </span>
              )}
              <button
                type="button"
                className="btn-primary"
                disabled={selected.length === 0 || submitting}
                onClick={handleConfirm}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Confirming…
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    Confirm Mapping
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-surface-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-subtle pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-8 text-xs"
                placeholder="Search amount, ref no., description, scheme…"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-6 w-6 text-qp-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center gap-2">
                <Landmark className="h-8 w-8 text-ink-subtle" />
                <p className="text-sm text-ink-muted">No unmatched bank credit entries found</p>
              </div>
            ) : (
              filtered.map(entry => {
                const diff     = txnAmt && entry.credit ? Math.abs(entry.credit - txnAmt) : null
                const diffPct  = diff != null && txnAmt ? (diff / txnAmt) * 100 : null
                const diffColor = diffPct == null ? '' : diffPct < 1 ? 'text-qp-green-dark' : diffPct < 5 ? 'text-qp-amber' : 'text-qp-red'
                const isSelected = selected.includes(entry.id)

                return (
                  <label
                    key={entry.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-qp-navy-50 border-qp-navy shadow-sm'
                        : 'bg-surface-paper border-surface-border hover:bg-surface-hover'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEntry(entry.id)}
                      className="mt-0.5 h-4 w-4 accent-qp-navy flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-qp-green-dark">{INR(entry.credit)}</span>
                        <span className="text-ink-muted flex-shrink-0">
                          {entry.date ? format(parseISO(entry.date), 'dd MMM yyyy') : '—'}
                        </span>
                      </div>
                      <div className="text-ink-secondary mt-0.5 truncate">{entry.description || '—'}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {entry.ref_no && (
                          <span className="font-mono text-[10px] text-ink-muted bg-surface-hover px-1.5 py-0.5 rounded border border-surface-border">
                            {entry.ref_no}
                          </span>
                        )}
                        {entry.scheme_name && (
                          <span className="text-[10px] text-ink-subtle">{entry.scheme_name}</span>
                        )}
                      </div>
                      {diff != null && (
                        <div className={`mt-1.5 font-semibold ${diffColor}`}>
                          Diff: {INR(diff)}{diffPct != null ? ` (${diffPct.toFixed(1)}%)` : ''}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-qp-navy flex-shrink-0 mt-0.5" />
                    )}
                  </label>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center pt-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/ho/reconciliation')}
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}
