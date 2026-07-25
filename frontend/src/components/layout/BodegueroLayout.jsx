import { useNavigate, useLocation } from 'react-router-dom'
import { ScanLine, List, BarChart3, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import logoMini from '../../assets/logo-mini.png'
import NotifBell from '../ui/NotifBell'

const TABS = [
  { label: 'Registrar',     icon: ScanLine,  path: '/bodeguero/recepcion' },
  { label: 'Mis registros', icon: List,      path: '/bodeguero/registros' },
  { label: 'Reporte',       icon: BarChart3, path: '/bodeguero/reporte'   },
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
    <div className="h-[100dvh] flex flex-col max-w-lg mx-auto overflow-hidden"
      style={{ background: '#F4F6FA' }}>

      {/* Top bar (fijo) */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-12 pb-4"
        style={{ background: '#0D2B5E' }}>
        <div className="flex items-center gap-3">
          <img src={logoMini} alt="Los Líderes" className="w-10 h-10 rounded-xl" />
          <div>
            <p className="text-sky-300 text-xs">BODEGA MAICAO</p>
            <h1 className="text-white text-lg font-bold">{nombre}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotifBell />
          <button onClick={handleLogout}
            className="text-slate-400 hover:text-white transition p-2 active:scale-95">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Contenido scrolleable (único scroller) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>

      {/* Bottom nav (fijo) */}
      <nav className="flex-shrink-0 bg-white border-t border-slate-100 flex z-40"
        style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
        {TABS.map(({ label, icon: Icon, path }) => {
          const active = pathname === path
          return (
            <button key={path} onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative"
              style={{ color: active ? '#1565C0' : '#94a3b8' }}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{label}</span>
              {active &&
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-blue-600" />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
