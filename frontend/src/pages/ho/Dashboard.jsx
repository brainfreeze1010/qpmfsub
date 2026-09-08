import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Clock, CheckCircle2, Building2, ChevronRight,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { apiGetTransactionStats, apiGetReconRuns, apiGetTransactions } from '../../api/client'
import useStore from '../../store/useStore'
import StatCard from '../../components/common/StatCard'
import Badge from '../../components/common/Badge'
import Table from '../../components/common/Table'

/* ─────────────────────────────────────────────────────────────────
   useCountUp — animates 0 → target with cubic ease-out
───────────────────────────────────────────────────────────────── */
function useCountUp(target, duration = 1100) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (typeof target !== 'number') return
    cancelAnimationFrame(rafRef.current)
    const start = performance.now()
    const easeOut = t => 1 - Math.pow(1 - t, 3)

    function tick(now) {
      const p = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(target * easeOut(p)))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return display
}

/* ─────────────────────────────────────────────────────────────────
   BarChart — bars grow from 0 → target once `ready` is true,
   each bar staggered by 110 ms.
───────────────────────────────────────────────────────────────── */
function BarChart({ data, ready }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const targetPct = Math.max((item.value / max) * 100, 4)
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="text-xs text-ink-muted w-32 truncate text-right flex-shrink-0">
              {item.label}
            </span>
            <div className="flex-1 h-5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${item.color} flex items-center justify-end pr-2`}
                style={{
                  width: ready ? `${targetPct}%` : '0%',
                  transition: `width 750ms cubic-bezier(0.34, 1.0, 0.64, 1) ${i * 110}ms`,
                }}
              >
                {ready && (
                  <span className="text-white text-[11px] font-semibold leading-none">
                    {item.value}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs font-mono text-ink-muted w-8 text-right flex-shrink-0">
              {item.pct != null ? `${item.pct}%` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   KPI skeleton
───────────────────────────────────────────────────────────────── */
function KPISkeleton() {
  return (
    <div className="kpi-card">
      <div className="skeleton h-3 w-24 rounded mb-3" />
      <div className="skeleton h-8 w-16 rounded" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useStore()

  const today = format(new Date(), 'yyyy-MM-dd')
  const [stats,      setStats]      = useState(null)
  const [reconRuns,  setReconRuns]  = useState([])
  const [recentTxns, setRecentTxns] = useState([])
  const [startDate,  setStartDate]  = useState(today)
  const [endDate,    setEndDate]    = useState(today)
  const [loading,    setLoading]    = useState(true)

  /* animation gate states */
  const [chartsReady, setChartsReady] = useState(false)
  const [tilesReady,  setTilesReady]  = useState(false)

  /* ── Fetch ─────────────────────────────────────────────────── */
  useEffect(() => {
    let chartsTimer, tilesTimer
    async function fetchAll() {
      setLoading(true)
      setChartsReady(false)
      setTilesReady(false)
      try {
        const [statsRes, reconRes, txnRes] = await Promise.allSettled([
          apiGetTransactionStats(),
          apiGetReconRuns(),
          apiGetTransactions({ page: 1, page_size: 10 }),   // no date filter — always show latest
        ])
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
        if (reconRes.status  === 'fulfilled') setReconRuns(reconRes.value.data?.items || reconRes.value.data || [])
        if (txnRes.status    === 'fulfilled') setRecentTxns(txnRes.value.data?.items  || txnRes.value.data  || [])

        /* stagger chart + tile animations after data lands */
        chartsTimer = setTimeout(() => setChartsReady(true), 120)
        tilesTimer  = setTimeout(() => setTilesReady(true),  420)
      } catch {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
    return () => { clearTimeout(chartsTimer); clearTimeout(tilesTimer) }
  }, [startDate, endDate])

  /* ── Derived ─────────────────────────────────────────────────── */
  const total = stats?.total ?? 0

  const kpiTarget = {
    total:      stats?.total                        ?? 0,
    pending:    stats?.pending_reconciliation       ?? 0,
    reconciled: stats?.by_status?.RECONCILED        ?? 0,
    branches:   Object.keys(stats?.by_branch || {}).length,
  }

  const animTotal      = useCountUp(kpiTarget.total)
  const animPending    = useCountUp(kpiTarget.pending)
  const animReconciled = useCountUp(kpiTarget.reconciled)
  const animBranches   = useCountUp(kpiTarget.branches)

  const statusData = [
    { label: 'Reconciled', value: stats?.by_status?.RECONCILED ?? 0, color: 'bg-qp-green' },
    { label: 'Submitted',  value: stats?.by_status?.SUBMITTED  ?? 0, color: 'bg-qp-navy'  },
    { label: 'Pending',    value: stats?.pending_reconciliation ?? 0, color: 'bg-qp-amber' },
    { label: 'Rejected',   value: stats?.by_status?.REJECTED   ?? 0, color: 'bg-qp-red'   },
  ]
    .filter(d => d.value > 0)
    .map(d => ({ ...d, pct: total > 0 ? Math.round((d.value / total) * 100) : 0 }))

  const schemeTotal = Object.values(stats?.by_scheme || {}).reduce((a, b) => a + b, 0) || 1
  const schemeData  = Object.entries(stats?.by_scheme || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({
      label: name, value: count, color: 'bg-qp-navy',
      pct: Math.round((count / schemeTotal) * 100),
    }))

  const latestRun = reconRuns[0]

  /* ── Recent txn columns ─────────────────────────────────────── */
  const recentCols = [
    { key: 'slip_no',         label: 'Slip No.',   render: v => <span className="font-mono text-xs">{v || '—'}</span> },
    { key: 'unitholder_name', label: 'Unit Holder', render: (v, row) => (
        <div>
          <div className="font-medium text-sm text-ink">{v || '—'}</div>
          <div className="text-xs text-ink-muted">{row.branch_name || ''}</div>
        </div>
      ),
    },
    { key: 'scheme_name', label: 'Scheme',
      render: v => <div className="max-w-[9rem] truncate text-xs text-ink-secondary" title={v}>{v || '—'}</div>,
    },
    { key: 'submitted_at', label: 'Date',
      render: v => <span className="text-xs">{v ? format(parseISO(v), 'dd MMM yyyy') : '—'}</span>,
    },
    { key: 'status', label: 'Status', render: v => <Badge status={v || 'SUBMITTED'} /> },
  ]

  /* ═══════════════════════════════════════════════════════════════
     Render
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Date filter ── */}
      <div
        className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in"
        style={{ animationDelay: '60ms' }}
      >
        <div>
          <label className="input-label">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="input-label">End Date</label>
          <input type="date" value={endDate}   onChange={e => setEndDate(e.target.value)}   className="input" />
        </div>
      </div>

      {/* ── KPI row — staggered entrance ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-fade-in h-full" style={{ animationDelay: `${i * 80}ms` }}>
                <KPISkeleton />
              </div>
            ))
          : [
              { title: 'Total Transactions',     value: animTotal,      icon: FileText,    color: 'navy' },
              { title: 'Pending Reconciliation', value: animPending,    icon: Clock,       color: 'amber', trend: 'Awaiting processing' },
              { title: 'Reconciled',              value: animReconciled, icon: CheckCircle2,color: 'green',
                trend: total > 0 ? `${Math.round((kpiTarget.reconciled / total) * 100)}% rate` : undefined },
              { title: 'Active Branches',         value: animBranches,   icon: Building2,   color: 'navy', subtitle: 'Across all regions' },
            ].map((card, i) => (
              <div
                key={card.title}
                className="animate-fade-in h-full"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <StatCard {...card} />
              </div>
            ))
        }
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 animate-fade-in" style={{ animationDelay: '180ms' }}>
          <h2 className="kpi-label mb-4">Transactions by Status</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-5 rounded-full" />)}
            </div>
          ) : statusData.length > 0 ? (
            <BarChart data={statusData} ready={chartsReady} />
          ) : (
            <p className="text-sm text-ink-muted py-4 text-center">No data available</p>
          )}
        </div>

        <div className="card p-5 animate-fade-in" style={{ animationDelay: '240ms' }}>
          <h2 className="kpi-label mb-4">Transactions by Scheme (Top 5)</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-5 rounded-full" />)}
            </div>
          ) : schemeData.length > 0 ? (
            <BarChart data={schemeData} ready={chartsReady} />
          ) : (
            <p className="text-sm text-ink-muted py-4 text-center">No scheme data available</p>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent transactions */}
        <div
          className="card lg:col-span-2 overflow-hidden animate-fade-in"
          style={{ animationDelay: '300ms' }}
        >
          <div className="card-header">
            <h2 className="kpi-label">Recent Transactions</h2>
            <button onClick={() => navigate('/ho/transactions')} className="btn-ghost text-xs text-qp-navy">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <Table
            columns={recentCols}
            data={recentTxns.slice(0, 10)}
            loading={loading}
            emptyMessage="No recent transactions"
            onRowClick={row => navigate(`/ho/transactions/${row.id}`)}
            pageSize={10}
          />
        </div>

        {/* Reconciliation status */}
        <div className="card p-5 animate-fade-in" style={{ animationDelay: '360ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="kpi-label">Reconciliation Status</h2>
            <button onClick={() => navigate('/ho/reconciliation')} className="btn-ghost text-xs text-qp-navy">
              Open <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-20 rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
              </div>
            </div>
          ) : latestRun ? (
            <div className="space-y-4">

              {/* Latest run summary */}
              <div
                className="p-3 bg-surface-hover rounded-xl animate-fade-in"
                style={{ animationDelay: '400ms' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Latest Run</span>
                  <Badge
                    status={latestRun.status === 'COMPLETED' ? 'RECONCILED' : 'PENDING'}
                    label={latestRun.status}
                  />
                </div>
                <p className="text-xs text-ink-secondary">
                  {latestRun.period_from ? format(parseISO(latestRun.period_from), 'dd MMM') : '—'}
                  {' — '}
                  {latestRun.period_to   ? format(parseISO(latestRun.period_to),   'dd MMM yyyy') : '—'}
                </p>
                {latestRun.scheme_name && (
                  <p className="text-xs text-ink-muted mt-0.5 truncate">{latestRun.scheme_name}</p>
                )}
                <p className="text-xs text-ink-muted mt-0.5">
                  {latestRun.created_at ? format(parseISO(latestRun.created_at), 'dd MMM yyyy, HH:mm') : ''}
                </p>
              </div>

              {/* Count tiles — pop-in with per-tile stagger */}
              {latestRun.exact_count != null && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Exact',      value: latestRun.exact_count,      color: 'text-qp-green-dark', bg: 'bg-qp-green-50' },
                    { label: 'Approx',     value: latestRun.approx_count,     color: 'text-qp-amber',      bg: 'bg-qp-amber-50' },
                    { label: 'Nil',        value: latestRun.nil_count,        color: 'text-qp-red',        bg: 'bg-qp-red-50'   },
                    { label: 'Manual',     value: latestRun.manual_count,     color: 'text-qp-navy',       bg: 'bg-qp-navy-50'  },
                    { label: 'Reconciled', value: latestRun.reconciled_count, color: 'text-qp-green-dark', bg: 'bg-qp-green-50' },
                    { label: 'Total',      value: latestRun.total,            color: 'text-ink',           bg: 'bg-surface-hover'},
                  ].map((item, i) => (
                    <div
                      key={item.label}
                      className={[
                        item.bg,
                        'rounded-xl p-2.5 text-center shadow-card',
                        'hover:-translate-y-1 hover:shadow-card-hover transition-all duration-200',
                        tilesReady ? 'animate-pop-in' : 'opacity-0',
                      ].join(' ')}
                      style={{ animationDelay: `${i * 55}ms` }}
                    >
                      <div className={`font-mono text-lg font-bold ${item.color}`}>
                        {item.value ?? 0}
                      </div>
                      <div className="text-[11px] text-ink-muted font-semibold uppercase tracking-wide mt-0.5">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Previous runs */}
              {reconRuns.length > 1 && (
                <div
                  className="pt-3 border-t border-surface-border animate-fade-in"
                  style={{ animationDelay: '520ms' }}
                >
                  <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-2">
                    Previous Runs
                  </p>
                  <div className="space-y-1.5">
                    {reconRuns.slice(1, 5).map((run, i) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between text-xs py-1 animate-fade-in"
                        style={{ animationDelay: `${540 + i * 40}ms` }}
                      >
                        <span className="text-ink-secondary font-mono">
                          {run.period_from ? format(parseISO(run.period_from), 'dd/MM') : '—'}
                          {' — '}
                          {run.period_to   ? format(parseISO(run.period_to),   'dd/MM/yy') : '—'}
                        </span>
                        <Badge
                          status={run.status === 'COMPLETED' ? 'RECONCILED' : 'PENDING'}
                          label={run.status}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center animate-fade-in">
              <CheckCircle2 className="h-12 w-12 text-ink-subtle mx-auto mb-2" />
              <p className="text-sm text-ink-muted">No reconciliation runs yet</p>
              <button
                onClick={() => navigate('/ho/reconciliation')}
                className="mt-3 text-xs text-qp-navy hover:text-qp-navy-dark font-medium"
              >
                Run Reconciliation →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
