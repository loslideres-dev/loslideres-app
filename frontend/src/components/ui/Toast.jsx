import { useEffect } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

export default function Toast({ message, show, onHide, type = 'success' }) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onHide, 2500)
      return () => clearTimeout(t)
    }
  }, [show])

  const bg = type === 'error' ? '#991B1B' : '#1565C0'
  const Icon = type === 'error' ? XCircle : CheckCircle

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300
      flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-medium
      ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
      style={{ background: bg, maxWidth: '90vw' }}>
      <Icon size={17} />
      {message}
    </div>
  )
}
