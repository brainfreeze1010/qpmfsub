import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  ChevronLeft, CloudUpload, X, Send, ShoppingCart,
  ArrowLeftRight, TrendingDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiCreateTransaction, apiUploadSlip } from '../../api/client'
import useStore from '../../store/useStore'
import { amountToWords } from '../../utils/amountToWords'

const SCHEMES = [
  { id: 's001', name: 'UNION Large Cap Fund',              plan: 'Regular', option: 'Growth' },
  { id: 's002', name: 'UNION Flexi Cap Fund',              plan: 'Direct',  option: 'Growth' },
  { id: 's003', name: 'UNION Balanced Advantage Fund',     plan: 'Regular', option: 'Growth' },
  { id: 's004', name: 'UNION Tax Saver Fund (ELSS)',       plan: 'Direct',  option: 'Growth' },
  { id: 's005', name: 'UNION Liquid Fund',                 plan: 'Regular', option: 'Growth' },
]

const PAYMENT_MODES  = ['Cheque', 'RTGS', 'NEFT', 'Fund Transfer', 'OTM']
const ACCOUNT_TYPES  = ['Savings', 'Current', 'NRE', 'NRO', 'FCNR']
const SALUTATIONS    = ['Mr.', 'Ms.', 'M/s.']
const FREQUENCIES    = ['One Time', 'Monthly', 'Quarterly', 'Annual']
const FACILITIES     = ['SIP', 'Lumpsum', 'STP', 'SWP']

const INR = (val) => {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
}

/* ── Section header ─────────────────────────────────── */
function SectionBadge({ number, title }) {
  return (
    <div className="card-header">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-qp-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {number}
        </div>
        <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">{title}</h3>
      </div>
    </div>
  )
}

/* ── Radio pill group ────────────────────────────────── */
function RadioPills({ name, options, value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            value === opt
              ? 'border-qp-navy bg-qp-navy-50 text-qp-navy'
              : 'border-surface-border text-ink-secondary hover:border-qp-navy hover:bg-surface-hover'
          } disabled:opacity-50`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/* ── File upload zone ────────────────────────────────── */
function FileUploadZone({ file, onChange, onRemove }) {
  const inputRef = useRef()

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) onChange(dropped)
  }, [onChange])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => !file && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
        file
          ? 'border-qp-green bg-qp-green-50'
          : 'border-surface-border hover:border-qp-navy hover:bg-qp-navy-50/30'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={e => e.target.files[0] && onChange(e.target.files[0])}
      />
      {file ? (
        <div className="flex items-center justify-center gap-4">
          {file.type.startsWith('image/') ? (
            <img
              src={URL.createObjectURL(file)}
              alt="Slip preview"
              className="h-20 w-auto rounded-lg border border-surface-border shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-qp-navy-50 flex items-center justify-center">
              <CloudUpload className="h-6 w-6 text-qp-navy" />
            </div>
          )}
          <div className="text-left">
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-xs text-ink-muted mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onRemove() }}
              className="mt-1 flex items-center gap-1 text-xs text-qp-red hover:text-red-700 font-medium"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div>
          <CloudUpload className="h-10 w-10 text-ink-subtle mx-auto mb-2" />
          <p className="text-sm font-medium text-ink-secondary">
            Drop transaction slip here or click to browse
          </p>
          <p className="text-xs text-ink-muted mt-1">Accepts images and PDF files</p>
        </div>
      )}
    </div>
  )
}

/* ── Field wrapper ───────────────────────────────────── */
function Field({ label, error, children, span2 }) {
  return (
    <div className={span2 ? 'md:col-span-2' : ''}>
      <label className="input-label">{label}</label>
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
export default function TransactionEntry() {
  const navigate     = useNavigate()
  const location     = useLocation()
  const { user }     = useStore()
  const editTxn      = location.state?.transaction ?? null
  const isEditing    = editTxn !== null

  const [slipFile, setSlipFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedType, setSelectedType] = useState(
    editTxn?.transaction_types?.[0] ?? null
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      salutation: 'Mr.',
      purchase_payment_mode: 'Cheque',
      purchase_account_type: 'Savings',
      frequency: 'One Time',
      redemption_credit_to: 'Default Bank Account',
    },
  })

  useEffect(() => {
    if (!editTxn) return
    reset({
      broker_code_arn:                  editTxn.broker_code_arn                  ?? '',
      sub_broker_arn:                   editTxn.sub_broker_arn                   ?? '',
      euin:                             editTxn.euin                             ?? '',
      euin_declaration:                 editTxn.euin_declaration                 ?? false,
      ria_code_pmrn:                    editTxn.ria_code_pmrn                    ?? '',
      ref_no:                           editTxn.ref_no                           ?? '',
      salutation:                       editTxn.salutation                       ?? 'Mr.',
      unitholder_name:                  editTxn.unitholder_name                  ?? '',
      folio_no:                         editTxn.folio_no                         ?? '',
      pan:                              editTxn.pan                              ?? '',
      scheme_id:                        editTxn.scheme_id                        ?? '',
      plan:                             editTxn.plan                             ?? '',
      option:                           editTxn.option                           ?? '',
      facility:                         editTxn.facility                         ?? '',
      frequency:                        editTxn.frequency                        ?? 'One Time',
      purchase_payment_mode:            editTxn.purchase_payment_mode            ?? 'Cheque',
      purchase_amount:                  editTxn.purchase_amount                  ?? '',
      purchase_amount_words:            editTxn.purchase_amount_words            ?? '',
      purchase_cheque_utr_no:           editTxn.purchase_cheque_utr_no           ?? '',
      purchase_transaction_date:        editTxn.purchase_transaction_date        ?? '',
      purchase_source_bank_ac:          editTxn.purchase_source_bank_ac          ?? '',
      purchase_source_bank_name:        editTxn.purchase_source_bank_name        ?? '',
      purchase_source_branch:           editTxn.purchase_source_branch           ?? '',
      purchase_account_type:            editTxn.purchase_account_type            ?? 'Savings',
      purchase_third_party_declaration: editTxn.purchase_third_party_declaration ?? false,
      purchase_umrn:                    editTxn.purchase_umrn                    ?? '',
      switch_from_scheme:               editTxn.switch_from_scheme               ?? '',
      switch_from_plan:                 editTxn.switch_from_plan                 ?? '',
      switch_from_option:               editTxn.switch_from_option               ?? '',
      switch_to_scheme:                 editTxn.switch_to_scheme                 ?? '',
      switch_to_plan:                   editTxn.switch_to_plan                   ?? '',
      switch_to_option:                 editTxn.switch_to_option                 ?? '',
      switch_amount:                    editTxn.switch_amount                    ?? '',
      switch_amount_words:              editTxn.switch_amount_words              ?? '',
      switch_all_units:                 editTxn.switch_all_units                 ?? false,
      switch_units:                     editTxn.switch_units                     ?? '',
      redemption_amount:                editTxn.redemption_amount                ?? '',
      redemption_amount_words:          editTxn.redemption_amount_words          ?? '',
      redemption_all_units:             editTxn.redemption_all_units             ?? false,
      redemption_units:                 editTxn.redemption_units                 ?? '',
      redemption_credit_to:             editTxn.redemption_credit_to             ?? 'Default Bank Account',
      redemption_bank_name:             editTxn.redemption_bank_name             ?? '',
      redemption_bank_ac:               editTxn.redemption_bank_ac               ?? '',
    })
  }, [])

  const watchPaymentMode    = watch('purchase_payment_mode')
  const watchPurchaseAmt    = watch('purchase_amount')
  const watchSwitchAmt      = watch('switch_amount')
  const watchRedemptionAmt  = watch('redemption_amount')
  const watchSwitchAllUnits = watch('switch_all_units')
  const watchRedmAllUnits   = watch('redemption_all_units')
  const watchCreditTo       = watch('redemption_credit_to')
  const watchSalutation     = watch('salutation')
  const watchPayMode        = watch('purchase_payment_mode')
  const watchAcctType       = watch('purchase_account_type')

  useEffect(() => {
    if (watchPurchaseAmt)   setValue('purchase_amount_words', amountToWords(watchPurchaseAmt))
  }, [watchPurchaseAmt, setValue])

  useEffect(() => {
    if (watchSwitchAmt)   setValue('switch_amount_words', amountToWords(watchSwitchAmt))
  }, [watchSwitchAmt, setValue])

  useEffect(() => {
    if (watchRedemptionAmt) setValue('redemption_amount_words', amountToWords(watchRedemptionAmt))
  }, [watchRedemptionAmt, setValue])

  function handleSchemeChange(e) {
    const scheme = SCHEMES.find(s => s.id === e.target.value)
    if (scheme) {
      setValue('plan', scheme.plan)
      setValue('option', scheme.option)
    }
  }

  async function onSubmit(data) {
    if (!selectedType) {
      toast.error('Please select a transaction type')
      return
    }
    setSubmitting(true)
    try {
      const scheme = SCHEMES.find(s => s.id === data.scheme_id)
      const payload = {
        broker_code_arn:           data.broker_code_arn || '',
        sub_broker_arn:            data.sub_broker_arn || '',
        euin:                      data.euin || '',
        euin_declaration:          data.euin_declaration || false,
        ria_code_pmrn:             data.ria_code_pmrn || '',
        ref_no:                    data.ref_no || '',
        salutation:                data.salutation || 'Mr.',
        unitholder_name:           data.unitholder_name || '',
        folio_no:                  data.folio_no || '',
        pan:                       data.pan ? data.pan.toUpperCase() : '',
        scheme_id:                 data.scheme_id || '',
        scheme_name:               scheme?.name || '',
        plan:                      data.plan || '',
        option:                    data.option || '',
        facility:                  data.facility || '',
        frequency:                 data.frequency || '',
        transaction_types:         [selectedType],
      }

      if (selectedType === 'PURCHASE') {
        Object.assign(payload, {
          purchase_payment_mode:            data.purchase_payment_mode || null,
          purchase_amount:                  data.purchase_amount ? parseFloat(data.purchase_amount) : null,
          purchase_amount_words:            data.purchase_amount_words || null,
          purchase_cheque_utr_no:           data.purchase_cheque_utr_no || null,
          purchase_transaction_date:        data.purchase_transaction_date || null,
          purchase_source_bank_ac:          data.purchase_source_bank_ac || null,
          purchase_source_bank_name:        data.purchase_source_bank_name || null,
          purchase_source_branch:           data.purchase_source_branch || null,
          purchase_account_type:            data.purchase_account_type || null,
          purchase_third_party_declaration: data.purchase_third_party_declaration || false,
          purchase_umrn:                    data.purchase_umrn || null,
        })
      }

      if (selectedType === 'SWITCH') {
        Object.assign(payload, {
          switch_from_scheme: data.switch_from_scheme || null,
          switch_from_plan:   data.switch_from_plan || null,
          switch_from_option: data.switch_from_option || null,
          switch_to_scheme:   data.switch_to_scheme || null,
          switch_to_plan:     data.switch_to_plan || null,
          switch_to_option:   data.switch_to_option || null,
          switch_amount:      data.switch_amount ? parseFloat(data.switch_amount) : null,
          switch_all_units:   data.switch_all_units || false,
          switch_units:       data.switch_units ? parseFloat(data.switch_units) : null,
        })
      }

      if (selectedType === 'REDEMPTION') {
        Object.assign(payload, {
          redemption_amount:    data.redemption_amount ? parseFloat(data.redemption_amount) : null,
          redemption_all_units: data.redemption_all_units || false,
          redemption_units:     data.redemption_units ? parseFloat(data.redemption_units) : null,
          redemption_credit_to: data.redemption_credit_to || null,
          redemption_bank_name: data.redemption_bank_name || null,
          redemption_bank_ac:   data.redemption_bank_ac || null,
        })
      }

      const res = await apiCreateTransaction(payload)
      const txn = res.data
      toast.success(`Slip ${txn.slip_no || txn.id} submitted successfully`)

      if (slipFile) {
        try {
          const fd = new FormData()
          fd.append('file', slipFile)
          await apiUploadSlip(txn.id, fd)
          toast.success('Slip image uploaded')
        } catch {
          toast.error('Transaction created but slip upload failed — upload from the list.')
        }
      }
      navigate('/branch/transactions')
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to submit'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const anyTypeSelected = selectedType !== null

  return (
    <div className="max-w-5xl mx-auto pb-32">
      {/* Page header */}
      <div className="mb-6 animate-fade-in">
        <button
          type="button"
          onClick={() => navigate('/branch/transactions')}
          className="btn-ghost mb-3 -ml-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="page-title">{isEditing ? 'Edit Transaction Slip' : 'New Transaction Slip'}</h1>
        <p className="page-subtitle">
          {isEditing
            ? `Editing ${editTxn.slip_no || 'slip'} · ${editTxn.unitholder_name}`
            : 'Submit a subscription, switch, or redemption request'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">

        {/* ── HEADER / DISTRIBUTOR ── */}
        <div className="card">
          <SectionBadge number="★" title="Distributor / ARN Details" />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Broker Code / ARN">
                <input {...register('broker_code_arn')} className="input" placeholder="ARN-XXXXX" />
              </Field>
              <Field label="Sub-Broker ARN / Branch Code">
                <input {...register('sub_broker_arn')} className="input" placeholder="Branch code" />
              </Field>
              <Field label="Internal Sub-Broker Code">
                <input {...register('internal_sub_broker_code')} className="input" />
              </Field>
              <Field label="EUIN">
                <input {...register('euin')} className="input" placeholder="E-XXXXXX" />
              </Field>
              <Field label="RIA Code / PMRN">
                <input {...register('ria_code_pmrn')} className="input" />
              </Field>
              <Field label="Ref. No.">
                <input
                  {...register('ref_no')}
                  className="input"
                  placeholder={`${user?.branch_code || 'BR'}-`}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-secondary">
                <input
                  {...register('euin_declaration')}
                  type="checkbox"
                  className="h-4 w-4 rounded accent-qp-navy"
                />
                EUIN Declaration (Execution-only)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-secondary">
                <input
                  {...register('ria_declaration')}
                  type="checkbox"
                  className="h-4 w-4 rounded accent-qp-navy"
                />
                RIA Code Declaration
              </label>
            </div>
          </div>
        </div>

        {/* ── SECTION 1: UNITHOLDER ── */}
        <div className="card">
          <SectionBadge number="1" title="Existing Unitholder Information" />
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Salutation</label>
                <RadioPills
                  name="salutation"
                  options={SALUTATIONS}
                  value={watchSalutation}
                  onChange={v => setValue('salutation', v)}
                />
              </div>
              <Field label="Name of Unit Holder *" error={errors.unitholder_name?.message} span2>
                <input
                  {...register('unitholder_name', { required: 'Unit holder name is required' })}
                  className="input"
                  placeholder="Full name as per records"
                />
              </Field>
              <Field label="Folio No.">
                <input {...register('folio_no')} className="input" placeholder="Existing folio (if any)" />
              </Field>
              <Field label="PAN *" error={errors.pan?.message}>
                <input
                  {...register('pan', {
                    required: 'PAN is required',
                    pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: 'Invalid PAN format (e.g. ABCDE1234F)' },
                    setValueAs: v => v.toUpperCase(),
                  })}
                  className="input uppercase"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  onBlur={e => setValue('pan', e.target.value.toUpperCase())}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: SCHEME ── */}
        <div className="card">
          <SectionBadge number="2" title="Scheme Details" />
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Scheme" span2>
                <select
                  {...register('scheme_id')}
                  className="input"
                  onChange={e => { register('scheme_id').onChange(e); handleSchemeChange(e) }}
                >
                  <option value="">— Select Scheme —</option>
                  {SCHEMES.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Frequency">
                <select {...register('frequency')} className="input">
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Plan">
                <select {...register('plan')} className="input">
                  <option value="">— Select Plan —</option>
                  <option value="Regular">Regular</option>
                  <option value="Direct">Direct</option>
                </select>
              </Field>
              <Field label="Option">
                <select {...register('option')} className="input">
                  <option value="">— Select Option —</option>
                  <option value="Growth">Growth</option>
                  <option value="Dividend">Dividend</option>
                  <option value="Growth (Reinvestment)">Growth (Reinvestment)</option>
                </select>
              </Field>
              <Field label="Facility">
                <select {...register('facility')} className="input">
                  <option value="">—</option>
                  {FACILITIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* ── TRANSACTION TYPE SELECTOR ── */}
        <div className="card p-5">
          <p className="input-label mb-3">Select Transaction Type</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'PURCHASE',   label: 'Additional Purchase', Icon: ShoppingCart },
              { key: 'SWITCH',     label: 'Switch',              Icon: ArrowLeftRight },
              { key: 'REDEMPTION', label: 'Redemption',          Icon: TrendingDown },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedType(key)}
                className={`flex items-center gap-3 border-2 rounded-2xl px-5 py-4 cursor-pointer transition-all text-left ${
                  selectedType === key
                    ? 'border-qp-navy bg-qp-navy-50'
                    : 'border-surface-border hover:border-qp-navy hover:bg-surface-hover'
                }`}
              >
                <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedType === key ? 'border-qp-navy' : 'border-surface-border'
                }`}>
                  {selectedType === key && <div className="w-2.5 h-2.5 rounded-full bg-qp-navy" />}
                </div>
                <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                  selectedType === key ? 'bg-qp-navy text-white' : 'bg-surface-hover text-ink-muted'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-sm font-semibold ${selectedType === key ? 'text-qp-navy' : 'text-ink-secondary'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── SECTION 3: PURCHASE ── */}
        {selectedType === 'PURCHASE' && (
          <div className="card border-l-4 border-l-qp-navy">
            <SectionBadge number="3" title="Additional Purchase Request" />
            <div className="p-5 space-y-5">
              <div>
                <label className="input-label">Payment Mode</label>
                <RadioPills
                  name="purchase_payment_mode"
                  options={PAYMENT_MODES}
                  value={watchPayMode}
                  onChange={v => setValue('purchase_payment_mode', v)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Amount in ₹ (Figures)" error={errors.purchase_amount?.message}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm pointer-events-none">₹</span>
                    <input
                      {...register('purchase_amount', {
                        required: 'Amount is required',
                        min: { value: 1, message: 'Must be positive' },
                      })}
                      type="number"
                      step="0.01"
                      className="input pl-7"
                      placeholder="0"
                    />
                  </div>
                </Field>
                <Field label="Amount in ₹ (Words)">
                  <input
                    {...register('purchase_amount_words')}
                    className="input text-xs"
                    placeholder="Auto-computed"
                    readOnly
                  />
                </Field>
              </div>

              {watchPaymentMode !== 'OTM' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label={watchPaymentMode === 'Cheque' ? 'Cheque No.' : 'UTR No.'}>
                    <input {...register('purchase_cheque_utr_no')} className="input font-mono" />
                  </Field>
                  <Field label={watchPaymentMode === 'Cheque' ? 'Cheque Date' : 'Transaction Date'}>
                    <input {...register('purchase_transaction_date')} type="date" className="input" />
                  </Field>
                </div>
              )}

              {watchPaymentMode === 'OTM' && (
                <Field label="UMRN">
                  <input {...register('purchase_umrn')} className="input font-mono" placeholder="Unique Mandate Reference Number" />
                </Field>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Source Bank A/C Number">
                  <input {...register('purchase_source_bank_ac')} className="input font-mono" />
                </Field>
                <Field label="Source Bank Name">
                  <input {...register('purchase_source_bank_name')} className="input" />
                </Field>
                <Field label="Source Branch">
                  <input {...register('purchase_source_branch')} className="input" />
                </Field>
              </div>

              <div>
                <label className="input-label">Account Type</label>
                <RadioPills
                  name="purchase_account_type"
                  options={ACCOUNT_TYPES}
                  value={watchAcctType}
                  onChange={v => setValue('purchase_account_type', v)}
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-qp-amber-50 border border-qp-amber">
                <input
                  {...register('purchase_third_party_declaration')}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded accent-qp-navy"
                />
                <span className="text-xs text-ink-secondary leading-relaxed">
                  <strong className="text-ink">Third Party Declaration:</strong> I/We declare the payment is from my/our own bank account and not from any third party account.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* ── SECTION 4: SWITCH ── */}
        {selectedType === 'SWITCH' && (
          <div className="card border-l-4 border-l-qp-amber">
            <SectionBadge number="4" title="Switch Request" />
            <div className="p-5 space-y-5">

              {/* FROM */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-3">From</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Scheme" span2>
                    <select {...register('switch_from_scheme')} className="input">
                      <option value="">— Select Scheme —</option>
                      {SCHEMES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Plan">
                    <select {...register('switch_from_plan')} className="input">
                      <option value="">— Select Plan —</option>
                      <option value="Regular">Regular</option>
                      <option value="Direct">Direct</option>
                    </select>
                  </Field>
                  <Field label="Option">
                    <select {...register('switch_from_option')} className="input">
                      <option value="">— Select Option —</option>
                      <option value="Growth">Growth</option>
                      <option value="Dividend">Dividend</option>
                      <option value="Growth (Reinvestment)">Growth (Reinvestment)</option>
                    </select>
                  </Field>
                </div>
              </div>

              <hr className="border-surface-border" />

              {/* TO */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-3">To</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Scheme" span2>
                    <select {...register('switch_to_scheme')} className="input">
                      <option value="">— Select Scheme —</option>
                      {SCHEMES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Plan">
                    <select {...register('switch_to_plan')} className="input">
                      <option value="">— Select Plan —</option>
                      <option value="Regular">Regular</option>
                      <option value="Direct">Direct</option>
                    </select>
                  </Field>
                  <Field label="Option">
                    <select {...register('switch_to_option')} className="input">
                      <option value="">— Select Option —</option>
                      <option value="Growth">Growth</option>
                      <option value="Dividend">Dividend</option>
                      <option value="Growth (Reinvestment)">Growth (Reinvestment)</option>
                    </select>
                  </Field>
                </div>
              </div>

              <hr className="border-surface-border" />

              {/* Amount / Units */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Amount in ₹ (Figures)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm pointer-events-none">₹</span>
                    <input
                      {...register('switch_amount')}
                      type="number"
                      step="0.01"
                      disabled={watchSwitchAllUnits}
                      className="input pl-7 disabled:opacity-50"
                      placeholder="0"
                    />
                  </div>
                </Field>
                <Field label="Amount in ₹ (Words)">
                  <input
                    {...register('switch_amount_words')}
                    className="input text-xs"
                    readOnly
                    disabled={watchSwitchAllUnits}
                    placeholder="Auto-computed"
                  />
                </Field>
                <Field label="No. of Units">
                  <input
                    {...register('switch_units')}
                    type="number"
                    step="0.001"
                    disabled={watchSwitchAllUnits}
                    className="input font-mono disabled:opacity-50"
                    placeholder="Number of units"
                  />
                </Field>
                <div className="flex items-center mt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-secondary">
                    <input
                      {...register('switch_all_units')}
                      type="checkbox"
                      className="h-4 w-4 rounded accent-qp-navy"
                    />
                    All Units (Full Switch)
                  </label>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── SECTION 5: REDEMPTION ── */}
        {selectedType === 'REDEMPTION' && (
          <div className="card border-l-4 border-l-qp-red">
            <SectionBadge number="5" title="Redemption Request" />
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Amount in ₹ (Figures)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm pointer-events-none">₹</span>
                    <input
                      {...register('redemption_amount')}
                      type="number"
                      step="0.01"
                      disabled={watchRedmAllUnits}
                      className="input pl-7 disabled:opacity-50"
                      placeholder="0"
                    />
                  </div>
                </Field>
                <Field label="Amount in ₹ (Words)">
                  <input
                    {...register('redemption_amount_words')}
                    className="input text-xs"
                    readOnly
                    disabled={watchRedmAllUnits}
                    placeholder="Auto-computed"
                  />
                </Field>
                <Field label="No. of Units">
                  <input
                    {...register('redemption_units')}
                    type="number"
                    step="0.001"
                    disabled={watchRedmAllUnits}
                    className="input font-mono disabled:opacity-50"
                    placeholder="Number of units"
                  />
                </Field>
                <div className="flex items-center mt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-secondary">
                    <input
                      {...register('redemption_all_units')}
                      type="checkbox"
                      className="h-4 w-4 rounded accent-qp-navy"
                    />
                    All Units (Full Redemption)
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="input-label">Credit Redemption Proceeds to</label>
                  <RadioPills
                    name="redemption_credit_to"
                    options={['Default Bank Account', 'Registered Bank Account']}
                    value={watchCreditTo}
                    onChange={v => setValue('redemption_credit_to', v)}
                  />
                </div>
                {watchCreditTo === 'Registered Bank Account' && (
                  <>
                    <Field label="Registered Bank Name">
                      <input {...register('redemption_bank_name')} className="input" />
                    </Field>
                    <Field label="Bank A/C Number">
                      <input {...register('redemption_bank_ac')} className="input font-mono" />
                    </Field>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SLIP UPLOAD ── */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <CloudUpload className="h-4 w-4 text-ink-muted" />
              <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">Transaction Slip Upload</h3>
              <span className="text-xs text-ink-subtle">(Optional — can be uploaded later)</span>
            </div>
          </div>
          <div className="p-5">
            <FileUploadZone
              file={slipFile}
              onChange={setSlipFile}
              onRemove={() => setSlipFile(null)}
            />
          </div>
        </div>

        {/* ── Submit bar — flows naturally at end of form ── */}
        <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-ink-muted">
            {selectedType
              ? `Selected: ${selectedType[0] + selectedType.slice(1).toLowerCase()}`
              : <span className="text-qp-amber font-medium">⚠ Select a transaction type above</span>}
          </p>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate('/branch/transactions')}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={submitting || !anyTypeSelected}
              className="btn-primary px-5"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isEditing ? 'Update Transaction' : 'Submit Transaction'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
