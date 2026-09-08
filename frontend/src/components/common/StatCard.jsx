import React from 'react'

const COLOR_MAP = {
  navy: {
    border:   'rgb(var(--qp-navy))',
    iconBg:   'bg-qp-navy-50',
    iconText: 'text-qp-navy',
  },
  green: {
    border:   'rgb(var(--qp-green))',
    iconBg:   'bg-qp-green-50',
    iconText: 'text-qp-green-dark',
  },
  amber: {
    border:   'rgb(var(--qp-amber))',
    iconBg:   'bg-qp-amber-50',
    iconText: 'text-qp-amber',
  },
  red: {
    border:   'rgb(var(--qp-red))',
    iconBg:   'bg-qp-red-50',
    iconText: 'text-qp-red',
  },
  indigo: {
    border:   'rgb(var(--qp-navy))',
    iconBg:   'bg-qp-navy-50',
    iconText: 'text-qp-navy',
  },
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = 'navy',
  trend,
  subtitle,
  onClick,
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.navy

  return (
    <div
      className={[
        'kpi-card h-full',
        // hover: lift + stronger shadow — always visible for visual richness
        'hover:-translate-y-1 hover:shadow-card-hover',
        onClick ? 'cursor-pointer' : '',
      ].join(' ')}
      style={{ borderLeft: `3px solid ${c.border}` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="kpi-label">{title}</div>
          <div className="kpi-value mt-1">
            {value !== undefined && value !== null
              ? typeof value === 'number'
                ? value.toLocaleString('en-IN')
                : value
              : '—'}
          </div>
          {(subtitle || trend) && (
            <div className="text-xs text-ink-muted mt-2 font-medium">
              {subtitle || trend}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={`flex-shrink-0 flex items-center justify-center rounded-xl ${c.iconBg} ${c.iconText}`}
            style={{ width: 36, height: 36 }}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
}
