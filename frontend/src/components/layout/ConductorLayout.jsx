import { useNavigate, useLocation } from 'react-router-dom'
import {
  LogOut, ArrowLeft, Truck, BarChart3,
  LayoutDashboard, Package, Wallet,
} from 'lucide-react'
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
    <div className="h-[100dvh] flex flex-col max-w-lg mx-auto overflow-hidden"
      style={{ background: '#F4F6FA' }}>

      {/* Header (fijo) */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-12 pb-4"
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

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* Bottom nav — admin ve su nav completo, conductor ve el suyo */}
      {esAdmin ? <AdminNav /> : <ConductorNav />}
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
  return <NavBar tabs={TABS} pathname={pathname} navigate={navigate} />
}

function AdminNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const TABS = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard'    },
    { label: 'Paquetes',  icon: Package,         path: '/admin/paquetes'     },
    { label: 'Entregas',  icon: Truck,           path: '/conductor/entregas' },
    { label: 'Cierres',   icon: Wallet,          path: '/admin/liquidaciones'},
    { label: 'Reportes',  icon: BarChart3,       path: '/admin/reportes'     },
  ]
  return <NavBar tabs={TABS} pathname={pathname} navigate={navigate} small />
}

function NavBar({ tabs, pathname, navigate, small }) {
  return (
    <nav className="flex-shrink-0 bg-white border-t border-slate-100 flex z-40"
      style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
      {tabs.map(({ label, icon: Icon, path }) => {
        const active = pathname === path
        return (
          <button key={path} onClick={() => navigate(path)}
            className="flex-1 min-w-[60px] flex flex-col items-center justify-center
              gap-1 py-3 relative"
            style={{ color: active ? '#1565C0' : '#94a3b8' }}>
            <Icon size={small ? 20 : 22} strokeWidth={active ? 2.5 : 1.8} />
            <span className={`${small ? 'text-[10px]' : 'text-xs'} font-medium whitespace-nowrap`}>
              {label}
            </span>
            {active &&
              <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-blue-600" />}
          </button>
        )
      })}
    </nav>
  )
}
