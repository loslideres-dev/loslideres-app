import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Package, PackagePlus, User } from 'lucide-react'

const TABS = [
  { label: 'Casillero', icon: Home,        path: '/cliente/casillero'  },
  { label: 'Paquetes',  icon: Package,     path: '/cliente/paquetes'   },
  // "Avisar" y no "Pre-alertas": el cliente no sabe qué es una pre-alerta,
  // pero sí entiende que avisa que viene algo. Y como es un verbo, no se
  // confunde con la pestaña Paquetes.
  { label: 'Avisar',    icon: PackagePlus, path: '/cliente/avisar'     },
  { label: 'Perfil',    icon: User,        path: '/cliente/perfil'     },
]

function BottomNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  return (
    <nav className="flex-shrink-0 bg-white border-t border-slate-100 flex z-40"
      style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
      {TABS.map(({ label, icon: Icon, path }) => {
        const active = pathname.startsWith(path.split('/').slice(0,3).join('/'))
        return (
          <button key={path} onClick={() => navigate(path)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative"
            style={{ color: active ? '#1565C0' : '#94a3b8' }}>
            <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[11px] font-medium">{label}</span>
            {active && <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-blue-600" />}
          </button>
        )
      })}
    </nav>
  )
}

export default function ClienteLayout({ children }) {
  return (
    <div className="h-[100dvh] flex flex-col max-w-lg mx-auto overflow-hidden"
      style={{ background: '#F4F6FA' }}>
      {children}
      <BottomNav />
    </div>
  )
}
