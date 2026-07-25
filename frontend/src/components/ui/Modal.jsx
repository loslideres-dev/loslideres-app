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
    <div className="fixed inset-0 z-[60] flex justify-center"
      style={{ background: 'rgba(13,43,94,0.4)' }}>

      {/* Contenedor tipo móvil — máximo ancho como el resto de la app */}
      <div className="w-full max-w-lg flex flex-col"
        style={{ background: '#F4F6FA' }}>

        {/* Header con X roja para cerrar */}
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

        {/* Contenido scrolleable — padding inferior generoso para no cortar nada */}
        <div className="flex-1 overflow-y-auto px-5 py-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 48px)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
