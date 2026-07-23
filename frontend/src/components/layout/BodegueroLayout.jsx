import { useNavigate, useLocation } from 'react-router-dom'
import { ScanLine, List, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

const TABS = [
  { label: 'Registrar', icon: ScanLine, path: '/bodeguero/recepcion' },
  { label: 'Mis registros', icon: List, path: '/bodeguero/registros' },
]

export default function BodegueroLayout({ children }) {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const clearAuth    = useAuthStore(s => s.clearAuth)
  const nombre       = useAuthStore(s => s.getNombre())

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen pb-20 max-w-lg mx-auto relative"
      style={{ background: '#F4F6FA' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4"
        style={{ background: '#0D2B5E' }}>
        <div>
          <p className="text-sky-300 text-xs">BODEGA MAICAO</p>
          <h1 className="text-white text-lg font-bold">{nombre}</h1>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-white transition">
          <LogOut size={20} />
        </button>
      </div>

      {children}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white
        border-t border-slate-100 flex z-50"
        style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
        {TABS.map(({ label, icon: Icon, path }) => {
          const active = pathname === path
          return (
            <button key={path} onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative"
              style={{ color: active ? '#1565C0' : '#94a3b8' }}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{label}</span>
              {active && <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-blue-600" />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
