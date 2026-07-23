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
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#F4F6FA' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-white
        border-b border-slate-100 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center
            flex-shrink-0 transition active:scale-95"
          style={{ background: '#FEE2E2' }}>
          <X size={18} style={{ color: '#DC2626' }} />
        </button>
        <h3 className="text-base font-semibold text-slate-800 truncate">{title}</h3>
      </div>

      {/* Contenido scrolleable — deja espacio para el botón de abajo */}
      <div className="flex-1 overflow-y-auto px-5 py-5" style={{ paddingBottom: 100 }}>
        {children}
      </div>

      {/* Botón cerrar grande — por encima del navbar */}
      <div className="absolute bottom-20 left-0 right-0 px-5">
        <button onClick={onClose}
          className="w-full py-4 rounded-2xl font-semibold text-sm
            flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
          style={{ background: '#DC2626', color: 'white' }}>
          <X size={18} />
          Cerrar
        </button>
      </div>
    </div>
  )
}
