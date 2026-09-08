import React, { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2,
  RotateCcw, Loader2, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import Badge from '../../components/common/Badge'
import { apiBulkCreateTransactions } from '../../api/client'

// ── Template definition ───────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  'Salutation', 'Unit Holder Name', 'PAN', 'Folio No', 'Scheme Name',
  'Plan', 'Option', 'Transaction Type', 'Payment Mode', 'Purchase Amount',
  'Cheque UTR No', 'Transaction Date', 'Source Bank Name', 'Source Bank AC',
  'Account Type', 'Switch From Scheme', 'Switch To Scheme', 'Switch Amount',
  'Redemption Amount', 'Redemption Units', 'Broker Code ARN', 'Ref No',
]

const TEMPLATE_NOTES = [
  'Mr./Ms./M/s.',
  'Required',
  'Required',
  '',
  'Required — use exact scheme name',
  'Regular / Direct',
  'Growth / IDCW',
  'PURCHASE / SWITCH / REDEMPTION',
  'NEFT / RTGS / CHEQUE / OTM / FUND_TRANSFER',
  'Numeric',
  '',
  'YYYY-MM-DD',
  '',
  '',
  'Savings / Current / NRE / NRO',
  'For SWITCH only',
  'For SWITCH only',
  'Numeric',
  'Numeric',
  'Numeric',
  '',
  '',
]

const TEMPLATE_EXAMPLES = [
  [
    'Mr.', 'Amit Kumar Gupta', 'ABCPK1234H', '', 'UNION Large Cap Fund',
    'Regular', 'Growth', 'PURCHASE', 'NEFT', 50000,
    'NEFT2606080001', '2026-06-08', 'HDFC Bank', 'XXXXXXXX1234',
    'Savings', '', '', '', '', '', 'ARN-12345', 'REF-001',
  ],
  [
    'Ms.', 'Priya Sharma', 'BCDPS5678J', '12345678', 'UNION Flexi Cap Fund',
    'Direct', 'Growth', 'PURCHASE', 'RTGS', 200000,
    'RTGS2606080002', '2026-06-08', 'ICICI Bank', 'XXXXXXXX5678',
    'Current', '', '', '', '', '', 'ARN-67890', 'REF-002',
  ],
  [
    'Mr.', 'Venkatesh Rao', 'DEFVR4567K', '45678901', 'UNION Flexi Cap Fund',
    'Direct', 'Growth', 'SWITCH', '', '',
    '', '', '', '', '',
    'UNION Large Cap Fund - Regular - Growth', 'UNION Flexi Cap Fund - Direct - Growth',
    75000, '', '', 'ARN-22222', 'REF-003',
  ],
]

// ── Column → field mapping ────────────────────────────────────────────────────

const COL_MAP = {
  'Salutation':          'salutation',
  'Unit Holder Name':    'unitholder_name',
  'PAN':                 'pan',
  'Folio No':            'folio_no',
  'Scheme Name':         'scheme_name',
  'Plan':                'plan',
  'Option':              'option',
  'Transaction Type':    '_txn_type',
  'Payment Mode':        'purchase_payment_mode',
  'Purchase Amount':     'purchase_amount',
  'Cheque UTR No':       'purchase_cheque_utr_no',
  'Transaction Date':    'purchase_transaction_date',
  'Source Bank Name':    'purchase_source_bank_name',
  'Source Bank AC':      'purchase_source_bank_ac',
  'Account Type':        'purchase_account_type',
  'Switch From Scheme':  'switch_from_scheme',
  'Switch To Scheme':    'switch_to_scheme',
  'Switch Amount':       'switch_amount',
  'Redemption Amount':   'redemption_amount',
  'Redemption Units':    'redemption_units',
  'Broker Code ARN':     'broker_code_arn',
  'Ref No':              'ref_no',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(v) {
  if (!v && v !== 0) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v).trim()
  // Excel might give a number serial for dates
  if (/^\d+$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s))
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  return s
}

function validate(row) {
  const errs = []
  if (!row.unitholder_name) errs.push('Unit Holder Name required')
  if (!row.pan)             errs.push('PAN required')
  if (!row.scheme_name)     errs.push('Scheme Name required')

  const t = row._txn_type
  if (!t) {
    errs.push('Transaction Type required')
  } else if (!['PURCHASE', 'SWITCH', 'REDEMPTION'].includes(t)) {
    errs.push(`Invalid Transaction Type "${t}"`)
  } else if (t === 'PURCHASE' && !row.purchase_amount) {
    errs.push('Purchase Amount required')
  } else if (t === 'SWITCH' && (!row.switch_from_scheme || !row.switch_to_scheme)) {
    errs.push('Switch From/To Scheme required')
  } else if (t === 'REDEMPTION' && !row.redemption_amount && !row.redemption_units) {
    errs.push('Redemption Amount or Units required')
  }
  return errs
}

function mapRawRow(raw) {
  const row = {}
  for (const [header, field] of Object.entries(COL_MAP)) {
    let val = raw[header] ?? ''
    if (field === 'purchase_transaction_date') val = formatDate(val)
    row[field] = val
  }
  row._txn_type = String(row._txn_type || '').toUpperCase().trim()
  row._errors   = validate(row)
  return row
}

function buildPayload(row) {
  const t = row._txn_type
  return {
    salutation:                   row.salutation || 'Mr.',
    unitholder_name:              row.unitholder_name,
    pan:                          row.pan,
    folio_no:                     row.folio_no || '',
    scheme_name:                  row.scheme_name,
    plan:                         row.plan || '',
    option:                       row.option || '',
    transaction_types:            [t],
    purchase_payment_mode:        t === 'PURCHASE' ? (row.purchase_payment_mode || null) : null,
    purchase_amount:              row.purchase_amount ? Number(row.purchase_amount) : null,
    purchase_cheque_utr_no:       row.purchase_cheque_utr_no || null,
    purchase_transaction_date:    row.purchase_transaction_date || null,
    purchase_source_bank_name:    row.purchase_source_bank_name || null,
    purchase_source_bank_ac:      row.purchase_source_bank_ac || null,
    purchase_account_type:        row.purchase_account_type || null,
    switch_from_scheme:           row.switch_from_scheme || null,
    switch_to_scheme:             row.switch_to_scheme || null,
    switch_amount:                row.switch_amount ? Number(row.switch_amount) : null,
    redemption_amount:            row.redemption_amount ? Number(row.redemption_amount) : null,
    redemption_units:             row.redemption_units ? Number(row.redemption_units) : null,
    broker_code_arn:              row.broker_code_arn || '',
    ref_no:                       row.ref_no || '',
  }
}

const INR = (v) =>
  v ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v) : '—'

// ── Template download ─────────────────────────────────────────────────────────

function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  // Transactions sheet
  const txnData = [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES]
  const txnWs = XLSX.utils.aoa_to_sheet(txnData)

  // Column widths
  txnWs['!cols'] = TEMPLATE_HEADERS.map((h, i) => ({
    wch: Math.max(h.length, String(TEMPLATE_EXAMPLES[0][i] || '').length, 14),
  }))

  XLSX.utils.book_append_sheet(wb, txnWs, 'Transactions')

  // Notes sheet
  const notesData = [
    ['Column', 'Notes / Allowed Values'],
    ...TEMPLATE_HEADERS.map((h, i) => [h, TEMPLATE_NOTES[i] || '']),
  ]
  const notesWs = XLSX.utils.aoa_to_sheet(notesData)
  notesWs['!cols'] = [{ wch: 26 }, { wch: 52 }]
  XLSX.utils.book_append_sheet(wb, notesWs, 'Notes')

  XLSX.writeFile(wb, 'MF_Bulk_Transactions_Template.xlsx')
  toast.success('Template downloaded')
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BulkUploadModal({ isOpen, onClose, onSuccess }) {
  const [step,        setStep]        = useState('upload')   // upload | preview | results
  const [dragging,    setDragging]    = useState(false)
  const [fileName,    setFileName]    = useState('')
  const [rows,        setRows]        = useState([])         // mapped + validated rows
  const [submitting,  setSubmitting]  = useState(false)
  const [results,     setResults]     = useState(null)       // bulk API response
  const fileInputRef = useRef(null)

  function reset() {
    setStep('upload')
    setDragging(false)
    setFileName('')
    setRows([])
    setSubmitting(false)
    setResults(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function parseFile(file) {
    if (!file) return
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!allowed.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)')
      return
    }
    setFileName(file.name)
    const buf = await file.arrayBuffer()
    const wb  = XLSX.read(buf, { type: 'array', cellDates: true })
    const ws  = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
    if (!raw.length) {
      toast.error('No data rows found in the file.')
      return
    }
    const mapped = raw.map(mapRawRow)
    setRows(mapped)
    setStep('preview')
  }

  const onDrop = useCallback(async (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    await parseFile(file)
  }, [])

  const onFileChange = useCallback(async (e) => {
    await parseFile(e.target.files[0])
  }, [])

  async function handleSubmit() {
    const valid = rows.filter(r => r._errors.length === 0)
    if (!valid.length) return
    setSubmitting(true)
    try {
      const payloads = valid.map(buildPayload)
      const res = await apiBulkCreateTransactions(payloads)
      setResults(res.data)
      setStep('results')
      if (res.data.succeeded > 0) {
        onSuccess?.()
        toast.success(`${res.data.succeeded} transaction${res.data.succeeded !== 1 ? 's' : ''} submitted`)
      }
    } catch {
      toast.error('Bulk submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const validCount   = rows.filter(r => r._errors.length === 0).length
  const invalidCount = rows.length - validCount

  // ── Step: upload ──────────────────────────────────────────────────────────
  const uploadBody = (
    <div className="space-y-5">
      {/* Download template */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-qp-navy-50 border border-qp-navy/20">
        <FileSpreadsheet className="h-8 w-8 text-qp-navy flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-qp-navy">Step 1 — Download the template</p>
          <p className="text-xs text-ink-muted mt-0.5">
            Fill in transaction details using the provided Excel template. The file includes example rows and a Notes sheet with allowed values.
          </p>
          <button onClick={downloadTemplate} className="btn-secondary mt-3 text-xs">
            <Download className="h-3.5 w-3.5" />
            Download Template (.xlsx)
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div>
        <p className="text-sm font-semibold text-ink mb-2">Step 2 — Upload completed file</p>
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-qp-navy bg-qp-navy-50'
              : 'border-surface-border hover:border-qp-navy hover:bg-qp-navy-50/30'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={onFileChange}
          />
          <Upload className="h-8 w-8 text-ink-subtle mx-auto mb-3" />
          <p className="text-sm font-medium text-ink">Drag &amp; drop your Excel file here</p>
          <p className="text-xs text-ink-muted mt-1">or click to browse — .xlsx / .xls supported</p>
        </div>
      </div>
    </div>
  )

  // ── Step: preview ─────────────────────────────────────────────────────────
  const previewBody = (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-hover text-xs">
          <FileSpreadsheet className="h-4 w-4 text-ink-muted" />
          <span className="text-ink-secondary font-medium">{fileName}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-qp-green-50 text-xs text-qp-green-dark font-medium">
          <CheckCircle2 className="h-4 w-4" />
          {validCount} valid
        </div>
        {invalidCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-qp-red-50 text-xs text-qp-red font-medium">
            <AlertCircle className="h-4 w-4" />
            {invalidCount} error{invalidCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Preview table */}
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-hover">
            <tr>
              {['#', 'Unit Holder', 'PAN', 'Scheme', 'Type', 'Amount', 'Status'].map(h => (
                <th key={h} className="py-2.5 px-3 text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const ok = row._errors.length === 0
              return (
                <tr key={i} className={`border-t border-surface-border ${ok ? '' : 'bg-qp-red-50/40'}`}>
                  <td className="py-2.5 px-3 text-xs text-ink-muted w-8">{i + 1}</td>
                  <td className="py-2.5 px-3 text-xs text-ink font-medium max-w-[160px] truncate">
                    {row.unitholder_name || <span className="text-qp-red">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono text-ink-secondary whitespace-nowrap">
                    {row.pan || <span className="text-qp-red">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-ink-secondary max-w-[140px] truncate" title={row.scheme_name}>
                    {row.scheme_name || <span className="text-qp-red">—</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    {row._txn_type
                      ? <Badge status={row._txn_type} />
                      : <span className="text-xs text-qp-red">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono text-ink whitespace-nowrap">
                    {row.purchase_amount ? INR(row.purchase_amount)
                      : row.switch_amount ? INR(row.switch_amount)
                      : row.redemption_amount ? INR(row.redemption_amount)
                      : '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    {ok ? (
                      <span className="inline-flex items-center gap-1 text-xs text-qp-green-dark">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-qp-red cursor-help"
                        title={row._errors.join(' · ')}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        {row._errors[0]}
                        {row._errors.length > 1 && ` +${row._errors.length - 1}`}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {invalidCount > 0 && (
        <p className="text-xs text-ink-muted">
          Rows with errors will be skipped. Fix them in the Excel file and re-upload to include them.
        </p>
      )}
    </div>
  )

  // ── Step: results ─────────────────────────────────────────────────────────
  const resultsBody = results && (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: results.total,     bg: 'bg-surface-hover',  text: 'text-ink' },
          { label: 'Submitted', value: results.succeeded, bg: 'bg-qp-green-50', text: 'text-qp-green-dark' },
          { label: 'Failed',    value: results.failed,    bg: 'bg-qp-red-50',   text: 'text-qp-red' },
        ].map(({ label, value, bg, text }) => (
          <div key={label} className={`rounded-xl p-4 text-center ${bg}`}>
            <div className={`text-2xl font-bold ${text}`}>{value}</div>
            <div className="text-xs text-ink-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Per-row results */}
      <div className="rounded-xl border border-surface-border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-hover">
            <tr>
              {['Row', 'Result', 'Slip No. / Message'].map(h => (
                <th key={h} className="py-2.5 px-3 text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.results.map((r, i) => (
              <tr key={i} className="border-t border-surface-border">
                <td className="py-2.5 px-3 text-xs text-ink-muted">{r.row_index + 1}</td>
                <td className="py-2.5 px-3">
                  {r.status === 'success' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-qp-green-dark">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Success
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-qp-red">
                      <AlertCircle className="h-3.5 w-3.5" /> Failed
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-xs font-mono text-ink-secondary">
                  {r.status === 'success' ? r.slip_no : r.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── Footer buttons ────────────────────────────────────────────────────────
  const footer = (
    <>
      {step === 'upload' && (
        <button onClick={handleClose} className="btn-secondary">Cancel</button>
      )}

      {step === 'preview' && (
        <>
          <button onClick={reset} className="btn-ghost">
            <RotateCcw className="h-3.5 w-3.5" /> Upload Different File
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || validCount === 0}
            className="btn-primary"
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              : <><ChevronRight className="h-4 w-4" /> Submit {validCount} Transaction{validCount !== 1 ? 's' : ''}</>}
          </button>
        </>
      )}

      {step === 'results' && (
        <>
          <button onClick={reset} className="btn-secondary">
            <RotateCcw className="h-3.5 w-3.5" /> Upload More
          </button>
          <button onClick={handleClose} className="btn-primary">Done</button>
        </>
      )}
    </>
  )

  const TITLES = {
    upload:  'Bulk Upload Transactions',
    preview: `Preview — ${rows.length} row${rows.length !== 1 ? 's' : ''} found`,
    results: 'Upload Results',
  }

  return (
    <Modal
      isOpen={isOpen}
      title={TITLES[step]}
      onClose={handleClose}
      size="xl"
      footer={footer}
    >
      {step === 'upload'   && uploadBody}
      {step === 'preview'  && previewBody}
      {step === 'results'  && resultsBody}
    </Modal>
  )
}
