import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, AlertTriangle, FileText, Image, CloudUpload, CheckCircle2, Landmark,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { apiGetTransaction, apiUploadSlip, apiGetTransactionBankCredit } from '../../api/client'
import useStore from '../../store/useStore'
import Badge from '../../components/common/Badge'
import { MOCK_TRANSACTIONS } from '../../mockData'

const INR = (val) => {
  if (!val) return null
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val)
}

/* ── Field display ────────────────────────────────────────── */
function Field({ label, value, mono }) {
  return (
    <div>
      <dt className="input-label">{label}</dt>
      <dd className={`text-sm text-ink mt-0.5 ${mono ? 'font-mono' : ''}`}>
        {value != null && value !== '' ? value : <span className="text-ink-subtle">—</span>}
      </dd>
    </div>
  )
}

/* ── Section card ─────────────────────────────────────────── */
function SectionCard({ number, title, colorClass = 'border-l-surface-border', children }) {
  return (
    <div className={`card border-l-4 ${colorClass}`}>
      <div className="card-header">
        {number && (
          <div className="w-6 h-6 rounded-full bg-qp-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mr-3">
            {number}
          </div>
        )}
        <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-5">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {children}
        </dl>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export default function TransactionDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { user }     = useStore()

  const [txn, setTxn]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [imgError, setImgError] = useState(false)

  // Upload slip (branch users only)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading]   = useState(false)

  // Bank credit details (RECONCILED transactions only)
  const [bankCredit, setBankCredit]           = useState(null)
  const [bankCreditLoading, setBankCreditLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const mock = MOCK_TRANSACTIONS.find(t => t.id === id)
      if (mock) {
        setTxn(mock)
        setLoading(false)
        return
      }
      try {
        const res = await apiGetTransaction(id)
        setTxn(res.data)
      } catch {
        toast.error('Failed to load transaction details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!txn || txn.status !== 'RECONCILED') return
    async function loadBankCredit() {
      setBankCreditLoading(true)
      try {
        const res = await apiGetTransactionBankCredit(txn.id)
        setBankCredit(res.data)
      } catch {
        // Non-critical — section is simply hidden if unavailable
      } finally {
        setBankCreditLoading(false)
      }
    }
    loadBankCredit()
  }, [txn])

  async function handleUploadSlip() {
    if (!uploadFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      await apiUploadSlip(txn.id, fd)
      toast.success('Slip uploaded successfully')
      setUploadFile(null)
      const res = await apiGetTransaction(id)
      setTxn(res.data)
    } catch {
      toast.error('Failed to upload slip')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card p-6">
            <div className="skeleton h-4 w-32 rounded mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(j => <div key={j} className="skeleton h-10 rounded-xl" />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!txn) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 text-ink-subtle mx-auto mb-3" />
        <p className="text-ink-muted text-sm">Transaction not found.</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">Go Back</button>
      </div>
    )
  }

  const hasPurchase   = txn.transaction_types?.includes('PURCHASE')
  const hasSwitch     = txn.transaction_types?.includes('SWITCH')
  const hasRedemption = txn.transaction_types?.includes('REDEMPTION')
  const isBranch      = user?.role === 'branch_user'

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Back */}
      <button type="button" onClick={() => navigate(-1)} className="btn-ghost -ml-1">
        <ChevronLeft className="h-4 w-4" />
        All Transactions
      </button>

      {/* Header card */}
      <div className="card p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <span className="font-mono text-lg font-bold text-ink">{txn.slip_no || `#${txn.id}`}</span>
              <Badge status={txn.status || 'SUBMITTED'} />
              {txn.is_duplicate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-qp-amber-50 text-qp-amber text-[11px] font-semibold">
                  <AlertTriangle className="h-3 w-3" />
                  Possible Duplicate
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted mt-1">
              {txn.branch_name      && <span>Branch: <strong className="text-ink-secondary">{txn.branch_name}</strong></span>}
              {txn.submitted_by_name && <span>By: <strong className="text-ink-secondary">{txn.submitted_by_name}</strong></span>}
              {txn.submitted_at     && <span>{format(parseISO(txn.submitted_at), 'dd MMM yyyy, HH:mm')}</span>}
              {txn.applicable_nav_date && <span>Applicable NAV Date: <strong className="text-ink-secondary">{format(parseISO(txn.applicable_nav_date), 'dd MMM yyyy')}</strong></span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {(txn.transaction_types || []).map(t => <Badge key={t} status={t} />)}
          </div>
        </div>
      </div>

      {/* Duplicate warning */}
      {txn.is_duplicate && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-qp-amber-50 border border-qp-amber">
          <AlertTriangle className="h-5 w-5 text-qp-amber flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Possible Duplicate Transaction</p>
            <p className="text-xs text-amber-700 mt-1">
              This transaction appears to be a duplicate of another submission. Please verify before processing.
              {txn.duplicate_of && ` Original: Slip No. ${txn.duplicate_of}`}
            </p>
          </div>
        </div>
      )}

      {/* Distributor / ARN */}
      <SectionCard title="Distributor / ARN Details" colorClass="border-l-surface-border">
        <Field label="Broker Code / ARN"         value={txn.broker_code_arn}    mono />
        <Field label="Sub-Broker ARN"             value={txn.sub_broker_arn} />
        <Field label="EUIN"                       value={txn.euin}               mono />
        <Field label="EUIN Declaration"           value={txn.euin_declaration ? 'Yes — Execution only' : 'No'} />
        <Field label="RIA Code / PMRN"            value={txn.ria_code_pmrn} />
        <Field label="Ref. No."                   value={txn.ref_no}             mono />
      </SectionCard>

      {/* Section 1 — Unitholder */}
      <SectionCard number="1" title="Unitholder Information" colorClass="border-l-qp-navy">
        <Field label="Unit Holder Name" value={`${txn.salutation || ''} ${txn.unitholder_name || ''}`.trim()} />
        <Field label="Folio No."        value={txn.folio_no}  mono />
        <Field label="PAN"              value={txn.pan}       mono />
      </SectionCard>

      {/* Section 2 — Scheme */}
      <SectionCard number="2" title="Scheme Details" colorClass="border-l-qp-navy">
        <Field label="Scheme Name" value={txn.scheme_name} span2 />
        <Field label="Plan"        value={txn.plan} />
        <Field label="Option"      value={txn.option} />
        <Field label="Facility"    value={txn.facility} />
        <Field label="Frequency"   value={txn.frequency} />
      </SectionCard>

      {/* Section 3 — Purchase */}
      {hasPurchase && (
        <SectionCard number="3" title="Purchase Details" colorClass="border-l-qp-navy">
          <Field label="Payment Mode"         value={txn.purchase_payment_mode} />
          <Field label="Amount (₹)"           value={INR(txn.purchase_amount)}        mono />
          <Field label="Amount (Words)"       value={txn.purchase_amount_words} />
          <Field label="Cheque / UTR No."     value={txn.purchase_cheque_utr_no}      mono />
          <Field label="Transaction Date"     value={txn.purchase_transaction_date ? format(parseISO(txn.purchase_transaction_date), 'dd MMM yyyy') : null} />
          <Field label="Source Bank A/C"      value={txn.purchase_source_bank_ac}     mono />
          <Field label="Source Bank Name"     value={txn.purchase_source_bank_name} />
          <Field label="Source Branch"        value={txn.purchase_source_branch} />
          <Field label="Account Type"         value={txn.purchase_account_type} />
          <Field label="Third Party Decl."    value={txn.purchase_third_party_declaration ? 'Declared' : 'Not declared'} />
          {txn.purchase_payment_mode === 'OTM' && (
            <Field label="UMRN"               value={txn.purchase_umrn}               mono />
          )}
        </SectionCard>
      )}

      {/* Section 4 — Switch */}
      {hasSwitch && (
        <SectionCard number="4" title="Switch Details" colorClass="border-l-qp-amber">
          <Field label="From Scheme"  value={txn.switch_from_scheme} />
          <Field label="To Scheme"    value={txn.switch_to_scheme} />
          <Field label="Amount (₹)"   value={INR(txn.switch_amount)}  mono />
          <Field label="All Units"    value={txn.switch_all_units ? 'Yes — Full Switch' : 'No'} />
          {!txn.switch_all_units && txn.switch_units && (
            <Field label="No. of Units" value={String(txn.switch_units)} mono />
          )}
        </SectionCard>
      )}

      {/* Section 5 — Redemption */}
      {hasRedemption && (
        <SectionCard number="5" title="Redemption Details" colorClass="border-l-qp-red">
          <Field label="Amount (₹)"        value={INR(txn.redemption_amount)}   mono />
          <Field label="All Units"         value={txn.redemption_all_units ? 'Yes — Full Redemption' : 'No'} />
          {!txn.redemption_all_units && txn.redemption_units && (
            <Field label="No. of Units"    value={String(txn.redemption_units)} mono />
          )}
          <Field label="Credit To"         value={txn.redemption_credit_to} />
          {txn.redemption_credit_to === 'REGISTERED' && (
            <>
              <Field label="Bank Name"     value={txn.redemption_bank_name} />
              <Field label="Bank Account"  value={txn.redemption_bank_ac}   mono />
            </>
          )}
        </SectionCard>
      )}

      {/* Slip Image */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-ink-muted" />
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">Transaction Slip</h3>
          </div>
        </div>
        <div className="p-5">
          {txn.slip_image_path ? (
            <div>
              {txn.slip_image_path.toLowerCase().endsWith('.pdf') ? (
                <a
                  href={txn.slip_image_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-qp-navy hover:text-qp-navy-dark font-medium text-sm"
                >
                  <FileText className="h-8 w-8" />
                  View PDF Slip
                </a>
              ) : imgError ? (
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                  <Image className="h-8 w-8 text-ink-subtle" />
                  <span>Image not available</span>
                </div>
              ) : (
                <img
                  src={txn.slip_image_path}
                  alt="Transaction slip"
                  className="max-w-lg rounded-xl border border-surface-border shadow-sm"
                  onError={() => setImgError(true)}
                />
              )}
            </div>
          ) : (
            <div>
              {isBranch ? (
                <div className="space-y-3">
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      uploadFile ? 'border-qp-green bg-qp-green-50' : 'border-surface-border hover:border-qp-navy hover:bg-qp-navy-50/30'
                    }`}
                    onClick={() => document.getElementById('detail-slip-upload').click()}
                  >
                    <input
                      id="detail-slip-upload"
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={e => setUploadFile(e.target.files[0])}
                    />
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-qp-green-dark" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-qp-green-dark">{uploadFile.name}</p>
                          <p className="text-xs text-ink-muted">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <CloudUpload className="h-8 w-8 text-ink-subtle mx-auto mb-2" />
                        <p className="text-sm text-ink-secondary">Click to upload slip image</p>
                      </div>
                    )}
                  </div>
                  {uploadFile && (
                    <button
                      type="button"
                      onClick={handleUploadSlip}
                      disabled={uploading}
                      className="btn-primary"
                    >
                      {uploading ? 'Uploading…' : <><CloudUpload className="h-4 w-4" /> Upload Slip</>}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                  <Image className="h-8 w-8 text-ink-subtle" />
                  <span>No slip uploaded</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bank Account Credit Details — RECONCILED transactions only */}
      {txn.status === 'RECONCILED' && (bankCredit || bankCreditLoading) && (
        <div className="card border-l-4 border-l-emerald-500">
          <div className="card-header">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mr-3">
              <Landmark className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">Bank Account Credit Details</h3>
          </div>

          {bankCreditLoading ? (
            <div className="p-5 space-y-3">
              <div className="skeleton h-16 rounded-xl" />
              <div className="skeleton h-10 rounded-xl" />
            </div>
          ) : (
            <div className="p-5 space-y-5">

              {/* Collection bank account */}
              {bankCredit?.bank_account && (
                <div className="rounded-xl bg-qp-green-50 border border-emerald-200 p-4">
                  <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-widest mb-3">
                    Collection Bank Account
                  </p>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3">
                    <Field label="Bank Name"     value={bankCredit.bank_account.bank_name} />
                    <Field label="Account No."   value={bankCredit.bank_account.account_no}   mono />
                    <Field label="IFSC"          value={bankCredit.bank_account.ifsc}          mono />
                    <Field label="Branch"        value={bankCredit.bank_account.branch} />
                    <Field label="Account Type"  value={bankCredit.bank_account.account_type} />
                  </dl>
                </div>
              )}

              {/* Credit entry table */}
              {bankCredit?.entries?.length > 0 ? (
                <div>
                  <p className="text-[10px] font-semibold text-ink-secondary uppercase tracking-widest mb-2">Credit Entry</p>
                  <div className="overflow-x-auto rounded-xl border border-surface-border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-surface-hover">
                        <tr>
                          {['Date', 'Description', 'Ref No.', 'Credit (₹)', 'Balance (₹)'].map(h => (
                            <th key={h} className={`py-2.5 px-4 text-[11px] font-semibold text-ink-muted uppercase tracking-wide whitespace-nowrap ${h.includes('₹') ? 'text-right' : 'text-left'}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bankCredit.entries.map((e, i) => (
                          <tr key={e.id} className={i % 2 === 0 ? '' : 'bg-surface-hover/40'}>
                            <td className="py-3 px-4 text-xs text-ink-secondary whitespace-nowrap">
                              {e.date ? format(parseISO(e.date), 'dd MMM yyyy') : '—'}
                            </td>
                            <td className="py-3 px-4 text-xs text-ink max-w-[200px] truncate" title={e.description}>
                              {e.description || '—'}
                            </td>
                            <td className="py-3 px-4 text-xs font-mono text-ink-secondary">{e.ref_no || '—'}</td>
                            <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-emerald-700">
                              {e.credit ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(e.credit) : '—'}
                            </td>
                            <td className="py-3 px-4 text-right text-xs font-mono text-ink-secondary">
                              {e.balance != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(e.balance) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-surface-hover p-3 text-xs text-ink-muted">
                  Detailed bank statement entry is not available for this statement period.
                </div>
              )}

              {/* Reconciliation metadata footer */}
              <div className="border-t border-surface-border pt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-muted">
                {bankCredit?.match_type && (
                  <span className="flex items-center gap-1.5">
                    Match type: <Badge status={bankCredit.match_type} />
                  </span>
                )}
                {bankCredit?.reconciled_by && (
                  <span>Reconciled by: <strong className="text-ink-secondary">{bankCredit.reconciled_by}</strong></span>
                )}
                {bankCredit?.reconciled_at && (
                  <span>At: <strong className="text-ink-secondary">{format(parseISO(bankCredit.reconciled_at), 'dd MMM yyyy, HH:mm')}</strong></span>
                )}
                {bankCredit?.maker_name && (
                  <span>Maker: <strong className="text-ink-secondary">{bankCredit.maker_name}</strong></span>
                )}
                {bankCredit?.period_from && (
                  <span>
                    Period:{' '}
                    <strong className="text-ink-secondary">
                      {format(parseISO(bankCredit.period_from), 'dd MMM yyyy')}
                      {' – '}
                      {format(parseISO(bankCredit.period_to), 'dd MMM yyyy')}
                    </strong>
                  </span>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* Audit Trail */}
      {txn.audit_trail && txn.audit_trail.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">Audit Trail</h3>
          </div>
          <div className="p-5">
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-surface-border" />
              <ul className="space-y-4 pl-8">
                {txn.audit_trail.map((event, idx) => (
                  <li key={idx} className="relative">
                    <div className="absolute -left-[1.35rem] top-1.5 w-3 h-3 rounded-full bg-qp-navy border-2 border-surface-paper shadow" />
                    <div className="bg-surface-hover rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium text-ink">{event.action || event.event}</span>
                        <span className="text-xs text-ink-muted">
                          {event.timestamp ? format(parseISO(event.timestamp), 'dd MMM yyyy HH:mm') : ''}
                        </span>
                      </div>
                      {event.user     && <p className="text-xs text-ink-muted mt-1">By: {event.user}</p>}
                      {event.remarks  && <p className="text-xs text-ink-secondary mt-1 italic">"{event.remarks}"</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
