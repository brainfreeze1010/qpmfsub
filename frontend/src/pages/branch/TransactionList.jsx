import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Search, Filter, Eye, Pencil, Download, Upload } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { apiGetTransactions } from '../../api/client'
import Table from '../../components/common/Table'
import Badge from '../../components/common/Badge'
import { MOCK_TRANSACTIONS } from '../../mockData'
import BulkUploadModal from './BulkUploadModal'

const STATUS_OPTIONS = ['SUBMITTED', 'RECONCILED']

function downloadSlip() {
  const a = document.createElement('a')
  a.href = '/union-mf-txn-slip.pdf'
  a.download = 'Union-MF-Transaction-Slip.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

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

export default function TransactionList() {
  const navigate = useNavigate()

  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom]         = useState(new Date(Date.now() - 86400000).toISOString().slice(0, 10))
  const [dateTo, setDateTo]             = useState(new Date().toISOString().slice(0, 10))
  const [bulkOpen, setBulkOpen]         = useState(false)

  async function fetchTransactions() {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (dateFrom)     params.date_from = dateFrom
      if (dateTo)       params.date_to   = dateTo
      const res = await apiGetTransactions(params)
      const result = res.data?.items || res.data || []
      setTransactions(result.length > 0 ? result : MOCK_TRANSACTIONS)
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTransactions() }, [statusFilter, dateFrom, dateTo])

  const filtered = transactions.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.slip_no?.toLowerCase().includes(q) ||
      t.unitholder_name?.toLowerCase().includes(q) ||
      t.pan?.toLowerCase().includes(q) ||
      t.scheme_name?.toLowerCase().includes(q)
    )
  })

  const columns = [
    {
      key: 'slip_no',
      label: 'Slip No.',
      render: v => <span className="font-mono text-xs font-medium text-ink">{v || '—'}</span>,
    },
    {
      key: 'submitted_at',
      label: 'Trans Date',
      render: v => <span className="text-xs text-ink-secondary">{v ? format(parseISO(v), 'dd MMM yyyy') : '—'}</span>,
    },
    {
      key: 'applicable_nav_date',
      label: 'Applicable NAV Date',
      render: v => <span className="text-xs text-ink-secondary">{v ? format(parseISO(v), 'dd MMM yyyy') : '—'}</span>,
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
      render: (v, row) => {
        if (row.transaction_types?.includes('SWITCH')) {
          return (
            <div className="text-xs text-ink-secondary max-w-[11rem]">
              <div className="truncate" title={row.switch_from_scheme}>{row.switch_from_scheme || '—'}</div>
              <div className="text-ink-subtle text-[10px] leading-none my-0.5">↓ to</div>
              <div className="truncate" title={row.switch_to_scheme}>{row.switch_to_scheme || '—'}</div>
            </div>
          )
        }
        return <div className="max-w-[11rem] truncate text-xs text-ink-secondary" title={v}>{v || '—'}</div>
      },
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
      render: (_, row) => (
        <span className="font-mono text-sm text-ink font-medium">{getPrimaryAmount(row)}</span>
      ),
    },
    {
      key: '_units',
      label: 'Units',
      align: 'right',
      render: (_, row) => {
        const isSwitch    = row.transaction_types?.includes('SWITCH')
        const isRedeem    = row.transaction_types?.includes('REDEMPTION')
        if (isSwitch) {
          if (row.switch_all_units)  return <span className="font-mono text-xs text-ink">All</span>
          if (row.switch_units)      return <span className="font-mono text-xs text-ink">{Number(row.switch_units).toLocaleString('en-IN')}</span>
        }
        if (isRedeem) {
          if (row.redemption_all_units) return <span className="font-mono text-xs text-ink">All</span>
          if (row.redemption_units)     return <span className="font-mono text-xs text-ink">{Number(row.redemption_units).toLocaleString('en-IN')}</span>
        }
        return <span className="text-ink-muted">—</span>
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: v => <Badge status={v || 'SUBMITTED'} />,
    },
    {
      key: '_actions',
      label: 'Actions',
      align: 'center',
      render: (_, row) => (
        <div className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            title="View"
            onClick={() => navigate(`/ho/transactions/${row.id}`)}
            className="p-1.5 rounded-lg text-ink-muted hover:text-qp-navy hover:bg-qp-navy-50 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Edit"
            onClick={() => navigate('/branch/transactions/new', { state: { transaction: row } })}
            className="p-1.5 rounded-lg text-ink-muted hover:text-qp-amber hover:bg-qp-amber-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Download Slip"
            onClick={downloadSlip}
            className="p-1.5 rounded-lg text-ink-muted hover:text-qp-green-dark hover:bg-qp-green-50 transition-colors"
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
          <h1 className="page-title">My Transactions</h1>
          <p className="page-subtitle">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            {statusFilter ? ` · ${statusFilter}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulkOpen(true)} className="btn-secondary">
            <Upload className="h-4 w-4" />
            Bulk Transactions
          </button>
          <button onClick={() => navigate('/branch/transactions/new')} className="btn-primary">
            <PlusCircle className="h-4 w-4" />
            New Transaction
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1.75fr_1fr_14rem] gap-3">
          <div>
            <label className="input-label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9"
                placeholder="Search name, PAN, slip no., scheme…"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Start Date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input" />
            </div>
            <div>
              <label className="input-label">End Date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="input-label">Status</label>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-ink-subtle flex-shrink-0" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="input flex-1"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No transactions found. Click 'New Transaction' to get started."
        />
      </div>

      <BulkUploadModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={fetchTransactions}
      />
    </div>
  )
}
