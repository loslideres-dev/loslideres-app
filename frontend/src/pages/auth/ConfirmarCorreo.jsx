import { useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'

export default function ConfirmarCorreo() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center px-5"
      style={{ background: '#F4F6FA' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: '#EEF2F8' }}>
          <Mail size={32} style={{ color: '#1565C0' }} />
        </div>
        <h2 className="text-slate-800 text-xl font-bold mb-2">Revisa tu correo</h2>
        <p className="text-slate-500 text-sm mb-6">
          Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta y empezar a usar tu casillero.
        </p>
        <button onClick={() => navigate('/login')}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm"
          style={{ background: '#1565C0' }}>
          Volver al inicio
        </button>
      </div>
    </div>
  )
}