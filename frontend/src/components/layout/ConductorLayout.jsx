import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, ArrowLeft, Truck, BarChart3 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import logoMini from '../../assets/logo-mini.png'
import NotifBell from '../ui/NotifBell'

export default function ConductorLayout({ children }) {
  const navigate  = useNavigate()
  const clearAuth = useAuthStore(s => s.clearAuth)
  const nombre    = useAuthStore(s => s.getNombre())
  const roles     = useAuthStore(s => s.roles)
  const esAdmin   = roles.includes('admin')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto"
      style={{ background: '#F4F6FA' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4"
        style={{ background: '#0D2B5E' }}>
        <div className="flex items-center gap-3">
          {esAdmin && (
            <button onClick={() => navigate('/admin/dashboard')}
              className="w-9 h-9 rounded-full flex items-center justify-center
                text-slate-300 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <ArrowLeft size={18} />
            </button>
          )}
          <img src={logoMini} alt="Los Líderes" className="w-10 h-10 rounded-xl" />
          <div>
            <p className="text-sky-300 text-xs">ENTREGAS</p>
            <h1 className="text-white text-lg font-bold">{nombre}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotifBell />
          {!esAdmin && (
            <button onClick={handleLogout}
              className="text-slate-400 hover:text-white transition p-2 active:scale-95">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>

      {children}

      {/* Bottom nav — solo para conductores puros (el admin usa su propio nav) */}
      {!esAdmin && <ConductorNav />}
    </div>
  )
}

function ConductorNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const TABS = [
    { label: 'Entregas', icon: Truck,     path: '/conductor/entregas' },
    { label: 'Reporte',  icon: BarChart3, path: '/conductor/reporte'  },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white
      border-t border-slate-100 flex z-40"
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
  )
}
