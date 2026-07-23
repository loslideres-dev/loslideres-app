import { useNavigate, useLocation } from 'react-router-dom'
import { Package, Home, User } from 'lucide-react'

const tabs = [
  { label: 'Casillero', icon: Home,    path: '/cliente/casillero' },
  { label: 'Paquetes',  icon: Package, path: '/cliente/paquetes'  },
  { label: 'Perfil',    icon: User,    path: '/cliente/perfil'    },
]

export default function BottomNav() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100
      flex items-stretch z-50 max-w-lg mx-auto"
      style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
      {tabs.map(({ label, icon: Icon, path }) => {
        const active = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3
              transition-colors"
            style={{ color: active ? '#1565C0' : '#94a3b8' }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-xs font-medium">{label}</span>
            {active && (
              <span className="absolute bottom-0 w-8 h-0.5 rounded-full"
                style={{ background: '#1565C0' }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}