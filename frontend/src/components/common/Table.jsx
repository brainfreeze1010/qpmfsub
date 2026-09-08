import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DEFAULT_PAGE_SIZE = 20

export default function Table({
  columns,
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowClassName,
  pageSize = DEFAULT_PAGE_SIZE,
}) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const safeCurrentPage = Math.min(page, totalPages)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const pageData = data.slice(startIndex, startIndex + pageSize)

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.align ? { textAlign: col.align } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-surface-border">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="skeleton h-4 rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...(col.width ? { width: col.width } : {}),
                    ...(col.align ? { textAlign: col.align } : {}),
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-ink-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row, rowIndex) => (
                <tr
                  key={row.id ?? rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={rowClassName ? rowClassName(row) : ''}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={col.align ? { textAlign: col.align } : undefined}
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-surface-paper rounded-b-2xl">
          <div className="text-sm text-ink-muted">
            Showing {startIndex + 1}–{Math.min(startIndex + pageSize, data.length)} of{' '}
            {data.length} records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="btn-secondary p-1.5 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-ink-muted font-medium">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="btn-secondary p-1.5 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
