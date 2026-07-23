import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, DollarSign, Users, Shield, Settings, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

const TABS = [
  { label: 'Dashboard',  icon: LayoutDashboard, path: '/admin/dashboard'  },
  { label: 'Paquetes',   icon: Package,         path: '/admin/paquetes'   },
  { label: 'Tarifas',    icon: DollarSign,      path: '/admin/tarifas'    },
  { label: 'Usuarios',   icon: Users,           path: '/admin/usuarios'   },
  { label: 'Auditoría',  icon: Shield,          path: '/admin/auditoria'  },
]

export default function AdminLayout({ children, title }) {
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
    <div className="min-h-screen pb-24 max-w-lg mx-auto"
      style={{ background: '#F4F6FA' }}>

      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ background: '#0D2B5E' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sky-300 text-xs font-medium">ADMINISTRACIÓN</p>
            <h1 className="text-white text-xl font-bold">{title ?? 'Dashboard'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center
              text-white text-xs font-bold" style={{ background: '#1565C0' }}>
              {nombre.slice(0,2).toUpperCase()}
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {children}

      {/* Bottom nav — scrollable */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white
        border-t border-slate-100 flex z-50 overflow-x-auto"
        style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
        {TABS.map(({ label, icon: Icon, path }) => {
          const active = pathname === path
          return (
            <button key={path} onClick={() => navigate(path)}
              className="flex-1 min-w-[64px] flex flex-col items-center justify-center
                gap-1 py-3 relative transition-colors"
              style={{ color: active ? '#1565C0' : '#94a3b8' }}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
              {active && <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-blue-600" />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
