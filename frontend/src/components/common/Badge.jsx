import React from 'react'

const STATUS_MAP = {
  SUBMITTED:   { bg: 'bg-qp-navy-50',  text: 'text-qp-navy',       label: 'Submitted'  },
  RECONCILED:  { bg: 'bg-qp-green-50', text: 'text-qp-green-dark', label: 'Reconciled' },
  REJECTED:    { bg: 'bg-qp-red-50',   text: 'text-qp-red',        label: 'Rejected'   },
  PENDING:     { bg: 'bg-amber-50',    text: 'text-qp-amber',      label: 'Pending'    },
  EXACT:       { bg: 'bg-qp-green-50', text: 'text-qp-green-dark', label: 'Exact'      },
  APPROXIMATE: { bg: 'bg-qp-amber-50', text: 'text-qp-amber',      label: 'Approx'     },
  NIL:         { bg: 'bg-qp-red-50',   text: 'text-qp-red',        label: 'Nil'        },
  MANUAL:      { bg: 'bg-qp-navy-50',  text: 'text-qp-navy',       label: 'Manual'     },
  FLAGGED:     { bg: 'bg-amber-100',   text: 'text-amber-700',     label: 'Flagged'    },
  APPROVED:    { bg: 'bg-qp-green-50', text: 'text-qp-green-dark', label: 'Approved'   },
  PURCHASE:    { bg: 'bg-qp-navy-50',  text: 'text-qp-navy',       label: 'Purchase'   },
  SWITCH:      { bg: 'bg-amber-50',    text: 'text-amber-700',     label: 'Switch'     },
  REDEMPTION:  { bg: 'bg-qp-red-50',   text: 'text-qp-red',        label: 'Redemption' },
  ho_admin:    { bg: 'bg-slate-100',   text: 'text-slate-700',     label: 'Admin'      },
  ho_maker:    { bg: 'bg-qp-navy-50',  text: 'text-qp-navy',       label: 'Maker'      },
  ho_checker:  { bg: 'bg-purple-50',   text: 'text-purple-700',    label: 'Checker'    },
  branch_user: { bg: 'bg-sky-50',      text: 'text-sky-700',       label: 'Branch'     },
}

export default function Badge({ status, label: customLabel, className = '' }) {
  const config = STATUS_MAP[status] || {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    label: status || 'Unknown',
  }

  const displayLabel = customLabel || config.label

  return (
    <span className={`badge ${config.bg} ${config.text} ${className}`}>
      {displayLabel}
    </span>
  )
}
