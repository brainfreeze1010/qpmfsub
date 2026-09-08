import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  GitMerge, PlayCircle, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Flag, ThumbsUp, ThumbsDown,
  Link2, Search, AlertCircle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  apiGetReconRuns,
  apiCreateReconRun,
  apiGetReconMatches,
  apiMakerAction,
  apiCheckerAction,
} from '../../api/client'
import useStore from '../../store/useStore'
import Badge from '../../components/common/Badge'

const SCHEMES = [
  { id: 's001', name: 'UNION Large Cap Fund' },
  { id: 's002', name: 'UNION Flexi Cap Fund' },
  { id: 's003', name: 'UNION Balanced Advantage Fund' },
  { id: 's004', name: 'UNION Tax Saver Fund (ELSS)' },
  { id: 's005', name: 'UNION Liquid Fund' },
]

const TABS = [
  { key: 'EXACT',       label: 'Exact Matches',   countKey: 'exact'      },
  { key: 'APPROXIMATE', label: 'Approximate',      countKey: 'approximate'},
  { key: 'NIL',         label: 'Nil Matches',      countKey: 'nil'        },
  { key: 'MANUAL',      label: 'Manual Mapped',    countKey: 'manual'     },
  { key: 'RECONCILED',  label: 'Reconciled',       countKey: 'reconciled' },
]

const ROW_BG = {
  EXACT:       'row-exact',
  APPROXIMATE: 'row-approx',
  NIL:         'row-nil',
  MANUAL:      'row-manual',
  RECONCILED:  'row-exact',
}

const INR = (val) => {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val)
}

/* ── Inline action section ──────────────────────────── */
function ActionPanel({ match, userRole, onAction }) {
  const [remarks, setRemarks]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState(false)

  const canMaker   = userRole === 'ho_maker'   && (!match.maker_action   || match.maker_action   === 'PENDING')
  const canChecker = userRole === 'ho_checker' && match.maker_action === 'APPROVED' && (!match.checker_action || match.checker_action === 'PENDING')
  const canAdmin   = userRole === 'ho_admin'

  if (!canMaker && !canChecker && !canAdmin) {
    return (
      <div className="text-xs space-y-1">
        {match.maker_action   && <div className="flex items-center gap-1"><span className="text-ink-muted">Maker:</span><Badge status={match.maker_action} /></div>}
        {match.checker_action && <div className="flex items-center gap-1"><span className="text-ink-muted">Checker:</span><Badge status={match.checker_action} /></div>}
      </div>
    )
  }

  async function act(action) {
    setLoading(true)
    try {
      await onAction(match.id, action, remarks)
      setRemarks('')
      setExpanded(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2 min-w-[12rem]" onClick={e => e.stopPropagation()}>
      {!expanded && (
        <button type="button" onClick={() => setExpanded(true)} className="btn-ghost text-xs px-2 py-1">
          Actions…
        </button>
      )}
      {expanded && (
        <>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Remarks (optional)"
            rows={2}
            className="input text-xs resize-none w-full"
          />
          <div className="flex gap-1.5 flex-wrap">
            {(canMaker || canAdmin) && (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => act('APPROVED')}
                  className="btn-ghost text-xs text-qp-green-dark hover:bg-qp-green-50 px-2 py-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => act('FLAGGED')}
                  className="btn-ghost text-xs text-qp-amber hover:bg-qp-amber-50 px-2 py-1"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Flag
                </button>
              </>
            )}
            {canChecker && (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => act('APPROVED')}
                  className="btn-ghost text-xs text-qp-green-dark hover:bg-qp-green-50 px-2 py-1"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => act('REJECTED')}
                  className="btn-ghost text-xs text-qp-red hover:bg-qp-red-50 px-2 py-1"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  Reject
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Match table row ────────────────────────────────── */
function MatchRow({ match, userRole, onMakerAction, onCheckerAction, onMapping, tabKey, isSelected, onToggle }) {
  const [expanded, setExpanded]     = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const showCheckbox = tabKey === 'EXACT' || tabKey === 'APPROXIMATE'

  const txn         = match.transaction    || {}
  const bankEntries = match.bank_entries || (match.bank_entry ? [match.bank_entry] : [])
  const primaryBank = bankEntries[0] || {}

  const txnAmt  = txn.purchase_amount || txn.switch_amount || txn.redemption_amount
  const bankAmt = primaryBank.credit

  async function handleAction(id, action, remarks) {
    setActionLoading(true)
    try {
      if (userRole === 'ho_checker') {
        await onCheckerAction(id, action, remarks)
      } else {
        await onMakerAction(id, action, remarks)
      }
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <tr
        className={`cursor-pointer transition-colors ${ROW_BG[tabKey] || ''}`}
        onClick={() => setExpanded(v => !v)}
      >
        {showCheckbox && (
          <td className="w-8 text-center" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(match.id)}
              className="h-4 w-4 accent-qp-navy"
            />
          </td>
        )}
        {/* Transaction */}
        <td>
          <div className="text-xs">
            <div className="font-mono font-medium text-ink">{txn.slip_no || `#${txn.id || '—'}`}</div>
            <div className="text-ink-secondary truncate max-w-[8rem]">{txn.unitholder_name || '—'}</div>
            <div className="font-mono font-semibold text-ink mt-0.5">{INR(txnAmt)}</div>
          </div>
        </td>

        {/* Bank credit */}
        <td>
          {primaryBank.id ? (
            <div className="text-xs space-y-0.5">
              <div className="font-medium text-ink">
                {primaryBank.date ? format(parseISO(primaryBank.date), 'dd MMM yyyy') : '—'}
              </div>
              <div className="text-ink-secondary truncate max-w-[8rem]">{primaryBank.description || '—'}</div>
              <div className="font-mono font-semibold text-qp-green-dark">{INR(primaryBank.credit)}</div>
              {primaryBank.ref_no && (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-hover border border-surface-border">
                  <span className="font-mono text-[10px] text-ink-secondary">{primaryBank.ref_no}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-ink-muted">No bank entry</span>
          )}
        </td>

        {/* Match type */}
        <td><Badge status={match.match_type || tabKey} /></td>

        {/* Maker */}
        <td>
          <div className="text-xs space-y-0.5">
            {match.maker_user_name && <div className="text-ink-secondary">{match.maker_user_name}</div>}
            {match.maker_action    && <Badge status={match.maker_action} />}
            {match.maker_remarks   && <div className="text-ink-muted italic truncate max-w-[6rem]">{match.maker_remarks}</div>}
          </div>
        </td>

        {/* Checker */}
        <td>
          <div className="text-xs space-y-0.5">
            {match.checker_user_name && <div className="text-ink-secondary">{match.checker_user_name}</div>}
            {match.checker_action    && <Badge status={match.checker_action} />}
          </div>
        </td>

        {/* Final status */}
        <td><Badge status={match.final_status || match.status || tabKey} /></td>

        {/* Actions — tab-specific direct buttons */}
        <td onClick={e => e.stopPropagation()}>
          <div className="flex flex-col gap-1 min-w-[6rem]">
            {tabKey === 'EXACT' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction(match.id, 'APPROVED', '')}
                className="btn-ghost text-xs text-qp-green-dark hover:bg-qp-green-50 px-2 py-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </button>
            )}
            {tabKey === 'APPROXIMATE' && (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction(match.id, 'APPROVED', '')}
                  className="btn-ghost text-xs text-qp-green-dark hover:bg-qp-green-50 px-2 py-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction(match.id, 'REJECTED', '')}
                  className="btn-ghost text-xs text-qp-red hover:bg-qp-red-50 px-2 py-1"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
              </>
            )}
            {tabKey === 'NIL' && (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction(match.id, 'APPROVED', '')}
                  className="btn-ghost text-xs text-qp-green-dark hover:bg-qp-green-50 px-2 py-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onMapping(match)}
                  className="btn-ghost text-xs text-qp-navy hover:bg-qp-navy-50 px-2 py-1"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Mapping
                </button>
              </>
            )}
            {(tabKey === 'MANUAL' || tabKey === 'RECONCILED') && (
              <ActionPanel match={match} userRole={userRole} onAction={handleAction} />
            )}
          </div>
        </td>

        {/* Expand indicator */}
        <td className="w-6 text-center">
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
            : <ChevronRight className="h-3.5 w-3.5 text-ink-muted" />}
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className={ROW_BG[tabKey] || ''}>
          <td colSpan={showCheckbox ? 9 : 8} className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {/* Transaction details */}
              <div className="bg-surface-paper rounded-xl p-4 border border-surface-border">
                <h4 className="input-label mb-3">Transaction Details</h4>
                <dl className="space-y-1.5 text-xs">
                  {[
                    ['Slip No.',        txn.slip_no,                   true],
                    ['Unit Holder',     txn.unitholder_name,           false],
                    ['PAN',             txn.pan,                       true],
                    ['Scheme',          txn.scheme_name,               false],
                    ['Amount',          INR(txnAmt),                   true],
                    ['Payment Mode',    txn.purchase_payment_mode,     false],
                    ['Cheque/UTR',      txn.purchase_cheque_utr_no,    true],
                    ['Branch',          txn.branch_name,               false],
                  ].map(([label, val, mono]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <dt className="text-ink-muted flex-shrink-0">{label}</dt>
                      <dd className={`text-ink text-right ${mono ? 'font-mono' : ''}`}>{val || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Bank entry details */}
              <div className="bg-surface-paper rounded-xl p-4 border border-surface-border">
                <h4 className="input-label mb-3">Bank Entry Details</h4>
                {primaryBank.id ? (
                  <dl className="space-y-1.5 text-xs">
                    {[
                      ['Date',        primaryBank.date ? format(parseISO(primaryBank.date), 'dd MMM yyyy') : null, false],
                      ['Description', primaryBank.description, false],
                      ['Ref No.',     primaryBank.ref_no,       true],
                      ['Credit',      INR(primaryBank.credit),  true],
                      ['Balance',     INR(primaryBank.balance), true],
                    ].map(([label, val, mono]) => (
                      <div key={label} className="flex justify-between gap-2">
                        <dt className="text-ink-muted flex-shrink-0">{label}</dt>
                        <dd className={`text-ink text-right ${mono ? 'font-mono' : ''}`}>{val || '—'}</dd>
                      </div>
                    ))}
                    {txnAmt && bankAmt && (
                      <div className="flex justify-between gap-2 pt-1 border-t border-surface-border mt-1">
                        <dt className="text-ink-muted font-semibold">Diff</dt>
                        <dd className={`font-mono font-semibold ${Math.abs(bankAmt - txnAmt) < 1 ? 'text-qp-green-dark' : 'text-qp-red'}`}>
                          {INR(Math.abs(bankAmt - txnAmt))}
                        </dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <div className="flex flex-col items-center py-6 text-ink-muted">
                    <XCircle className="h-8 w-8 mb-2 text-ink-subtle" />
                    <p className="text-xs">No matching bank entry found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Maker/Checker history */}
            {(match.maker_action || match.checker_action) && (
              <div className="mt-3 bg-surface-paper rounded-xl p-4 border border-surface-border">
                <h4 className="input-label mb-2">Approval History</h4>
                <div className="flex flex-wrap gap-6 text-xs">
                  {match.maker_action && (
                    <div>
                      <span className="text-ink-muted">Maker: </span>
                      <Badge status={match.maker_action} />
                      {match.maker_user_name && <span className="ml-2 text-ink-secondary">by {match.maker_user_name}</span>}
                      {match.maker_at        && <span className="ml-2 text-ink-muted">{format(parseISO(match.maker_at), 'dd MMM HH:mm')}</span>}
                      {match.maker_remarks   && <p className="italic text-ink-muted mt-0.5">"{match.maker_remarks}"</p>}
                    </div>
                  )}
                  {match.checker_action && (
                    <div>
                      <span className="text-ink-muted">Checker: </span>
                      <Badge status={match.checker_action} />
                      {match.checker_user_name && <span className="ml-2 text-ink-secondary">by {match.checker_user_name}</span>}
                      {match.checker_at        && <span className="ml-2 text-ink-muted">{format(parseISO(match.checker_at), 'dd MMM HH:mm')}</span>}
                      {match.checker_remarks   && <p className="italic text-ink-muted mt-0.5">"{match.checker_remarks}"</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export default function Reconciliation() {
  const { user }   = useStore()
  const userRole   = user?.role
  const navigate   = useNavigate()

  const [runs, setRuns]               = useState([])
  const [selectedRun, setSelectedRun] = useState(null)
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [creating, setCreating]       = useState(false)

  const [matches, setMatches]           = useState([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [activeTab, setActiveTab]       = useState('EXACT')
  const [selectedMatchIds, setSelectedMatchIds] = useState([])

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      from_date: format(new Date(), 'yyyy-MM-dd'),
      to_date:   format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true)
    try {
      const res = await apiGetReconRuns()
      const data = res.data?.items || res.data || []
      setRuns(data)
      if (data.length > 0 && !selectedRun) setSelectedRun(data[0])
    } catch {
      toast.error('Failed to load reconciliation runs')
    } finally {
      setLoadingRuns(false)
    }
  }, [selectedRun])

  useEffect(() => { loadRuns() }, [])

  async function loadMatches(runId) {
    setLoadingMatches(true)
    try {
      const res = await apiGetReconMatches(runId)
      setMatches(res.data || [])
    } catch {
      toast.error('Failed to load matches')
    } finally {
      setLoadingMatches(false)
    }
  }

  useEffect(() => {
    if (selectedRun) loadMatches(selectedRun.id)
  }, [selectedRun])

  useEffect(() => { setSelectedMatchIds([]) }, [activeTab])

  async function handleCreateRun(data) {
    setCreating(true)
    try {
      const res = await apiCreateReconRun({
        period_from: data.from_date,
        period_to:   data.to_date,
        scheme_id:   data.scheme_id || null,
      })
      const newRun = res.data
      toast.success('Reconciliation run started')
      setRuns(prev => [newRun, ...prev])
      setSelectedRun(newRun)
      reset()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create run')
    } finally {
      setCreating(false)
    }
  }

  async function handleMakerAction(matchId, action, remarks) {
    try {
      await apiMakerAction(matchId, { action, remarks })
      toast.success(`Match ${action.toLowerCase()} by maker`)
      if (selectedRun) loadMatches(selectedRun.id)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed')
    }
  }

  async function handleCheckerAction(matchId, action, remarks) {
    try {
      await apiCheckerAction(matchId, { action, remarks })
      toast.success(`Match ${action.toLowerCase()} by checker`)
      if (selectedRun) loadMatches(selectedRun.id)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed')
    }
  }

  function handleMapping(match) {
    navigate('/ho/reconciliation/mapping', {
      state: { match, runId: selectedRun?.id },
    })
  }

  function handleToggleMatch(id) {
    setSelectedMatchIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleSelectAll() {
    const allIds = tabMatches.map(m => m.id)
    const allSelected = allIds.every(id => selectedMatchIds.includes(id))
    setSelectedMatchIds(allSelected ? [] : allIds)
  }

  async function handleBulkAction(action) {
    const fn = userRole === 'ho_checker' ? handleCheckerAction : handleMakerAction
    for (const id of selectedMatchIds) {
      await fn(id, action, '')
    }
    setSelectedMatchIds([])
  }

  /* ── Summary computation ── */
  const summary = {
    exact:       matches.filter(m => m.match_type === 'EXACT').length,
    approximate: matches.filter(m => m.match_type === 'APPROXIMATE').length,
    nil:         matches.filter(m => m.match_type === 'NIL').length,
    manual:      matches.filter(m => m.match_type === 'MANUAL').length,
    reconciled:  matches.filter(m => m.final_status === 'RECONCILED' || m.status === 'RECONCILED').length,
  }

  const tabMatches = matches.filter(m => {
    if (activeTab === 'RECONCILED') return m.final_status === 'RECONCILED' || m.status === 'RECONCILED'
    return m.match_type === activeTab
  })

  /* ── Summary pill colors ── */
  const PILLS = [
    { key: 'EXACT',       label: 'Exact',      count: summary.exact,       pill: 'bg-qp-green-50 text-qp-green-dark border-qp-green/30' },
    { key: 'APPROXIMATE', label: 'Approx',     count: summary.approximate, pill: 'bg-qp-amber-50 text-qp-amber border-qp-amber/30'     },
    { key: 'NIL',         label: 'Nil',        count: summary.nil,         pill: 'bg-qp-red-50 text-qp-red border-qp-red/30'           },
    { key: 'MANUAL',      label: 'Manual',     count: summary.manual,      pill: 'bg-qp-navy-50 text-qp-navy border-qp-navy/30'        },
    { key: 'RECONCILED',  label: 'Reconciled', count: summary.reconciled,  pill: 'bg-qp-green-50 text-qp-green-dark border-qp-green/30'},
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Run configuration */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-ink-muted" />
            <h2 className="text-sm font-semibold text-ink">Run Reconciliation</h2>
          </div>
        </div>
        <div className="p-5">
          <form onSubmit={handleSubmit(handleCreateRun)}>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="input-label">Start Date</label>
                <input {...register('from_date', { required: true })} type="date" className="input" />
              </div>
              <div>
                <label className="input-label">End Date</label>
                <input {...register('to_date', { required: true })} type="date" className="input" />
              </div>
              <div className="min-w-[14rem]">
                <label className="input-label">Scheme</label>
                <select {...register('scheme_id')} className="input">
                  <option value="">All Schemes</option>
                  {SCHEMES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Running…
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Run Reconciliation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Two-column: sidebar + main */}
      <div className="flex gap-5" style={{ minHeight: 'calc(100vh - 22rem)' }}>

        {/* Runs sidebar */}
        <div className="w-64 flex-shrink-0 card max-h-[600px] overflow-y-auto">
          <div className="card-header">
            <h3 className="kpi-label">Recon Runs</h3>
          </div>
          <div className="py-2">
            {loadingRuns ? (
              <div className="px-4 py-6 space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
              </div>
            ) : runs.length === 0 ? (
              <p className="px-4 py-6 text-xs text-ink-muted text-center">No runs yet</p>
            ) : (
              runs.map(run => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setSelectedRun(run)}
                  className={`w-full text-left px-4 py-3 transition-all text-xs rounded-r-xl ${
                    selectedRun?.id === run.id
                      ? 'bg-qp-navy-50 border-l-2 border-qp-navy'
                      : 'hover:bg-surface-hover border-l-2 border-transparent'
                  }`}
                >
                  <div className="font-mono font-medium text-ink">
                    {run.period_from ? format(parseISO(run.period_from), 'dd MMM') : '—'}
                    {' — '}
                    {run.period_to ? format(parseISO(run.period_to), 'dd MMM yy') : '—'}
                  </div>
                  {run.scheme_name && (
                    <div className="text-ink-muted truncate mt-0.5">{run.scheme_name}</div>
                  )}
                  <div className="text-ink-subtle mt-0.5">
                    {run.created_at ? format(parseISO(run.created_at), 'HH:mm dd/MM/yy') : ''}
                  </div>
                  <div className="mt-1">
                    <Badge
                      status={run.status === 'COMPLETED' ? 'RECONCILED' : 'PENDING'}
                      label={run.status || 'PENDING'}
                    />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Results area */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {!selectedRun ? (
            <div className="card flex-1 flex flex-col items-center justify-center py-20 text-center">
              <GitMerge className="h-16 w-16 text-ink-subtle mb-4" />
              <h3 className="text-base font-semibold text-ink-secondary">No Run Selected</h3>
              <p className="text-sm text-ink-muted mt-1">Select a run from the sidebar or create a new one above</p>
            </div>
          ) : (
            <>
              {/* Run info + summary bar */}
              {!loadingMatches && (
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-ink">
                        {selectedRun.period_from ? format(parseISO(selectedRun.period_from), 'dd MMM yyyy') : '—'}
                        {' — '}
                        {selectedRun.period_to ? format(parseISO(selectedRun.period_to), 'dd MMM yyyy') : '—'}
                      </span>
                      <Badge
                        status={selectedRun.status === 'COMPLETED' ? 'RECONCILED' : 'PENDING'}
                        label={selectedRun.status}
                      />
                    </div>
                    <span className="text-xs text-ink-muted">{matches.length} total matches</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PILLS.map(pill => (
                      <button
                        key={pill.key}
                        type="button"
                        onClick={() => setActiveTab(pill.key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${pill.pill} ${
                          activeTab === pill.key ? 'ring-2 ring-offset-1 ring-qp-navy/30 shadow-sm' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {pill.count}
                        <span className="font-medium">{pill.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab bar */}
              <div className="card overflow-hidden flex-1">
                <div className="tab-group px-4">
                  {TABS.map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`tab-button ${activeTab === tab.key ? 'tab-button-active' : 'tab-button-inactive'}`}
                    >
                      {tab.label}
                      <span className="ml-1.5 text-[11px] bg-surface-hover px-1.5 py-0.5 rounded-full text-ink-muted">
                        {summary[tab.countKey] ?? 0}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Matches table */}
                {loadingMatches ? (
                  <div className="flex items-center justify-center py-16">
                    <svg className="animate-spin h-8 w-8 text-qp-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  </div>
                ) : tabMatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="h-10 w-10 text-ink-subtle mb-3" />
                    <p className="text-sm text-ink-muted">
                      No {TABS.find(t => t.key === activeTab)?.label?.toLowerCase()} for this run
                    </p>
                  </div>
                ) : (
                  <>
                  {(activeTab === 'EXACT' || activeTab === 'APPROXIMATE') && (
                    <div className={`px-4 py-2 border-b border-surface-border flex items-center gap-3 ${selectedMatchIds.length > 0 ? 'bg-qp-navy-50' : 'bg-surface-paper'}`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-qp-navy"
                        checked={tabMatches.length > 0 && tabMatches.every(m => selectedMatchIds.includes(m.id))}
                        onChange={handleSelectAll}
                      />
                      <span className="text-xs text-ink-muted">
                        {selectedMatchIds.length > 0 ? `${selectedMatchIds.length} selected` : 'Select all'}
                      </span>
                      {selectedMatchIds.length > 0 && (
                        <>
                          <div className="w-px h-4 bg-surface-border" />
                          <button
                            type="button"
                            onClick={() => handleBulkAction('APPROVED')}
                            className="btn-ghost text-xs text-qp-green-dark hover:bg-qp-green-50 px-2 py-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Bulk Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkAction('REJECTED')}
                            className="btn-ghost text-xs text-qp-red hover:bg-qp-red-50 px-2 py-1"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Bulk Reject
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {(activeTab === 'EXACT' || activeTab === 'APPROXIMATE') && <th className="w-8" />}
                          <th>Transaction</th>
                          <th>Bank Credit</th>
                          <th>Match Type</th>
                          <th>Maker</th>
                          <th>Checker</th>
                          <th>Final Status</th>
                          <th>Actions</th>
                          <th className="w-6" />
                        </tr>
                      </thead>
                      <tbody>
                        {tabMatches.map(match => (
                          <MatchRow
                            key={match.id}
                            match={match}
                            userRole={userRole}
                            onMakerAction={handleMakerAction}
                            onCheckerAction={handleCheckerAction}
                            onMapping={handleMapping}
                            tabKey={activeTab}
                            isSelected={selectedMatchIds.includes(match.id)}
                            onToggle={handleToggleMatch}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  )
}
