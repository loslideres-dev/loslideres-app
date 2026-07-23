import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Package, User } from 'lucide-react'

const TABS = [
  { label: 'Casillero', icon: Home,    path: '/cliente/casillero' },
  { label: 'Paquetes',  icon: Package, path: '/cliente/paquetes'  },
  { label: 'Perfil',    icon: User,    path: '/cliente/perfil'    },
]

function BottomNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white
      border-t border-slate-100 flex z-50"
      style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
      {TABS.map(({ label, icon: Icon, path }) => {
        const active = pathname.startsWith(path.split('/').slice(0,3).join('/'))
        return (
          <button key={path} onClick={() => navigate(path)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative"
            style={{ color: active ? '#1565C0' : '#94a3b8' }}>
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-xs font-medium">{label}</span>
            {active && <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-blue-600" />}
          </button>
        )
      })}
    </nav>
  )
}

export default function ClienteLayout({ children }) {
  return (
    <div className="min-h-screen pb-20 max-w-lg mx-auto relative"
      style={{ background: '#F4F6FA' }}>
      {children}
      <BottomNav />
    </div>
  )
}
