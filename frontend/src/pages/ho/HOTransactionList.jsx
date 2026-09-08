import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Download, AlertTriangle, Eye, Pencil } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { apiGetTransactions } from '../../api/client'
import Table from '../../components/common/Table'
import Badge from '../../components/common/Badge'

const STATUS_OPTIONS = ['SUBMITTED', 'RECONCILED', 'REJECTED', 'PENDING']

const INR = (val) => {
  if (!val) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
}

function getPrimaryAmount(txn) {
  if (txn.purchase_amount)   return INR(txn.purchase_amount)
  if (txn.switch_amount)     return INR(txn.switch_amount)
  if (txn.redemption_amount) return INR(txn.redemption_amount)
  return '—'
}

function getPrimaryUnits(txn) {
  if (txn.switch_all_units || txn.redemption_all_units) return 'All'
  const u = txn.switch_units ?? txn.redemption_units
  if (u != null) return Number(u).toLocaleString('en-IN')
  return '—'
}

export default function HOTransactionList() {
  const navigate = useNavigate()

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [branches, setBranches]         = useState([])

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (branchFilter) params.branch_code = branchFilter
      if (dateFrom)     params.date_from = dateFrom
      if (dateTo)       params.date_to = dateTo

      const res = await apiGetTransactions(params)
      const data = res.data?.items || res.data || []
      setTransactions(data)

      const uniqueBranches = [
        ...new Map(
          data
            .filter(t => t.branch_code && t.branch_name)
            .map(t => [t.branch_code, { id: t.branch_code, name: t.branch_name }])
        ).values(),
      ]
      setBranches(uniqueBranches)
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, branchFilter, dateFrom, dateTo])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const filtered = transactions.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.slip_no?.toLowerCase().includes(q) ||
      t.unitholder_name?.toLowerCase().includes(q) ||
      t.pan?.toLowerCase().includes(q) ||
      t.scheme_name?.toLowerCase().includes(q) ||
      t.branch_name?.toLowerCase().includes(q)
    )
  })

  function exportCSV() {
    const headers = ['Slip No.', 'Branch', 'Unit Holder', 'PAN', 'Scheme', 'Type', 'Amount', 'Payment Mode', 'Date', 'Status', 'Duplicate']
    const rows = filtered.map(t => [
      t.slip_no || '',
      t.branch_name || '',
      t.unitholder_name || '',
      t.pan || '',
      t.scheme_name || '',
      (t.transaction_types || []).join('+'),
      getPrimaryAmount(t).replace(/[₹,\s]/g, ''),
      t.purchase_payment_mode || '',
      t.submitted_at ? format(parseISO(t.submitted_at), 'dd/MM/yyyy') : '',
      t.status || '',
      t.is_duplicate ? 'YES' : 'NO',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  function downloadSingleCSV(txn) {
    const headers = ['Slip No.', 'Date', 'Unit Holder', 'PAN', 'Branch', 'Scheme', 'Type', 'Amount', 'Units', 'Payment Mode', 'Status']
    const row = [
      txn.slip_no || '',
      txn.submitted_at ? format(parseISO(txn.submitted_at), 'dd/MM/yyyy') : '',
      txn.unitholder_name || '',
      txn.pan || '',
      txn.branch_name || '',
      txn.scheme_name || '',
      (txn.transaction_types || []).join('+'),
      getPrimaryAmount(txn).replace(/[₹,\s]/g, ''),
      getPrimaryUnits(txn),
      txn.purchase_payment_mode || '',
      txn.status || '',
    ]
    const csv = [headers, row].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${txn.slip_no || txn.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    {
      key: 'slip_no',
      label: 'Slip No.',
      render: (v, row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-medium text-ink">{v || '—'}</span>
          {row.is_duplicate && (
            <AlertTriangle className="h-3.5 w-3.5 text-qp-amber flex-shrink-0" title="Possible duplicate" />
          )}
        </div>
      ),
    },
    {
      key: 'submitted_at',
      label: 'Date',
      render: v => (
        <span className="text-xs text-ink-secondary whitespace-nowrap">{v ? format(parseISO(v), 'dd MMM yyyy') : '—'}</span>
      ),
    },
    {
      key: 'unitholder_name',
      label: 'Unit Holder',
      render: (v, row) => (
        <div>
          <div className="font-medium text-sm text-ink">{v || '—'}</div>
          <div className="text-xs text-ink-muted font-mono mt-0.5">{row.pan || ''}</div>
        </div>
      ),
    },
    {
      key: 'scheme_name',
      label: 'Scheme',
      render: v => (
        <div className="max-w-[9rem] truncate text-xs text-ink-secondary" title={v}>{v || '—'}</div>
      ),
    },
    {
      key: 'transaction_types',
      label: 'Type',
      render: (v, row) => (
        <div className="flex flex-wrap gap-0.5">
          {(row.transaction_types || []).map(t => <Badge key={t} status={t} />)}
          {(!row.transaction_types || row.transaction_types.length === 0) && <span className="text-ink-muted">—</span>}
        </div>
      ),
    },
    {
      key: 'purchase_amount',
      label: 'Amount',
      align: 'right',
      render: (v, row) => (
        <span className="font-mono text-sm text-ink font-medium">{getPrimaryAmount(row)}</span>
      ),
    },
    {
      key: '_units',
      label: 'Units',
      align: 'right',
      render: (v, row) => (
        <span className="font-mono text-sm text-ink-secondary">{getPrimaryUnits(row)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: v => <Badge status={v || 'SUBMITTED'} />,
    },
    {
      key: '_actions',
      label: 'Actions',
      render: (v, row) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/ho/transactions/${row.id}`)}
            className="p-1.5 rounded hover:bg-surface-hover text-ink-secondary hover:text-qp-blue transition-colors"
            title="View"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => navigate(`/ho/transactions/${row.id}?edit=true`)}
            className="p-1.5 rounded hover:bg-surface-hover text-ink-secondary hover:text-qp-blue transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => downloadSingleCSV(row)}
            className="p-1.5 rounded hover:bg-surface-hover text-ink-secondary hover:text-qp-blue transition-colors"
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">All Transactions</h1>
          <p className="page-subtitle">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''} across all branches
          </p>
        </div>
        <button onClick={exportCSV} className="btn-secondary">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Search name, PAN, slip no., branch…"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-subtle flex-shrink-0" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input flex-1">
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="input">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input flex-1"
              title="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input flex-1"
              title="To date"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No transactions found matching the current filters."
          onRowClick={row => navigate(`/ho/transactions/${row.id}`)}
          rowClassName={row => row.is_duplicate ? 'bg-qp-amber-50' : ''}
        />
      </div>
    </div>
  )
}
