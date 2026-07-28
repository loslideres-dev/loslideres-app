// src/components/ui/ImageViewer.jsx
// Overlay de imagen a pantalla completa — tap fuera o X para cerrar

import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function ImageViewer({ src, alt = 'Imagen', onClose }) {
  // Cerrar con Escape en desktop
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      {/* Botón cerrar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full
          flex items-center justify-center transition active:scale-90"
        style={{ background: 'rgba(255,255,255,0.15)' }}
      >
        <X size={20} className="text-white" />
      </button>

      {/* Imagen — tap en ella NO cierra para poder ver bien */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-xl"
        style={{ maxWidth: '95vw', maxHeight: '90vh' }}
      />
    </div>
  )
}
