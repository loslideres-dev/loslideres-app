import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'

export default function Toast({ message, show, onHide }) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onHide, 2500)
      return () => clearTimeout(t)
    }
  }, [show])

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300
      flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-medium
      ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
      style={{ background: '#1565C0', maxWidth: '90vw' }}>
      <CheckCircle size={17} />
      {message}
    </div>
  )
}