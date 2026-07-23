import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl
        shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4
        duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center
              bg-slate-100 hover:bg-slate-200 transition">
            <X size={16} className="text-slate-600" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
