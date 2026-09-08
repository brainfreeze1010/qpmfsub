import React, { useEffect } from 'react'
import { X } from 'lucide-react'

const sizeClasses = {
  sm:   'max-w-md',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  '2xl': 'max-w-6xl',
}

export default function Modal({ isOpen, title, onClose, size = 'md', children, footer }) {
  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        className={`relative bg-surface-paper rounded-2xl shadow-panel w-full ${
          sizeClasses[size] || sizeClasses.md
        } flex flex-col`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between flex-shrink-0">
          <h2 id="modal-title" className="font-semibold text-ink">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn-ghost p-1.5"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-surface-border flex justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
