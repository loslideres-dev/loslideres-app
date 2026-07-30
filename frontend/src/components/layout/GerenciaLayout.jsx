import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Activity, Receipt, Wallet, PieChart,
  Users, Settings, ScrollText, LogOut, Smartphone, Handshake,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import logoMini from '../../assets/logo-mini.png'

// La navegación agrupada no es decoración: separa el gobierno del negocio
// (operación, dinero, propiedad, sistema) en los cuatro dominios que
// realmente se administran por separado.
const SECCIONES = [
  {
    titulo: null,
    items: [
      { label: 'Panel', icon: LayoutDashboard, path: '/gerencia' },
    ],
  },
  {
    titulo: 'Operación',
    items: [
      { label: 'Paquetes',      icon: Package,  path: '/gerencia/paquetes' },
      { label: 'SLA y atascos', icon: Activity, path: '/gerencia/sla' },
    ],
  },
  {
    titulo: 'Finanzas',
    items: [
      { label: 'Resultados', icon: PieChart, path: '/gerencia/resultados' },
      { label: 'Gastos',     icon: Receipt,  path: '/gerencia/gastos' },
      { label: 'Cierres',    icon: Wallet,   path: '/gerencia/cierres' },
    ],
  },
  {
    titulo: 'Socios',
    items: [
      { label: 'Reparto', icon: Handshake, path: '/gerencia/socios' },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      { label: 'Usuarios',  icon: Users,      path: '/gerencia/usuarios' },
      { label: 'Ajustes',   icon: Settings,   path: '/gerencia/ajustes' },
      { label: 'Auditoría', icon: ScrollText, path: '/gerencia/auditoria' },
    ],
  },
]

export default function GerenciaLayout({ children, titulo, descripcion, acciones }) {
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
    <>
      {/* ── Aviso en pantallas angostas ──
          Un estado de resultados de doce columnas en un teléfono no le sirve
          a nadie. Mejor decirlo que degradar la pantalla. */}
      <div className="lg:hidden h-[100dvh] flex flex-col items-center justify-center
        px-8 text-center" style={{ background: '#0D2B5E' }}>
        <img src={logoMini} alt="" className="w-16 h-16 rounded-2xl mb-6" />
        <Smartphone size={32} className="text-sky-300 mb-4" />
        <h1 className="text-white text-xl font-bold mb-2">
          Gerencia necesita una pantalla grande
        </h1>
        <p className="text-slate-300 text-sm leading-relaxed mb-8 max-w-xs">
          Este módulo trabaja con tablas anchas y comparativas lado a lado.
          Ábrelo desde un computador.
        </p>
        <button onClick={() => navigate('/admin/dashboard')}
          className="px-6 py-3 rounded-xl text-white font-semibold text-sm
            active:scale-95 transition"
          style={{ background: '#1565C0' }}>
          Ir a la app de administración
        </button>
      </div>

      {/* ── Consola de escritorio ── */}
      <div className="hidden lg:flex h-[100dvh] overflow-hidden"
        style={{ background: '#F4F6FA' }}>

        {/* Barra lateral */}
        <aside className="w-60 flex-shrink-0 flex flex-col"
          style={{ background: '#0D2B5E' }}>

          {/* Marca */}
          <div className="px-5 py-5 flex items-center gap-3 flex-shrink-0">
            <img src={logoMini} alt="Los Líderes" className="w-9 h-9 rounded-lg" />
            <div className="min-w-0">
              <p className="text-white text-sm font-bold leading-tight">Los Líderes</p>
              <p className="text-sky-300 text-[10px] tracking-wider font-medium">
                GERENCIA
              </p>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            {SECCIONES.map((seccion, i) => (
              <div key={i} className={seccion.titulo ? 'mt-5' : ''}>
                {seccion.titulo && (
                  <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {seccion.titulo.toUpperCase()}
                  </p>
                )}
                {seccion.items.map(({ label, icon: Icon, path }) => {
                  const activo = path === '/gerencia'
                    ? pathname === '/gerencia'
                    : pathname.startsWith(path)
                  return (
                    <button key={path} onClick={() => navigate(path)}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5
                        transition mb-0.5 group"
                      style={{
                        background: activo ? 'rgba(79,195,247,0.14)' : 'transparent',
                        color:      activo ? '#4FC3F7' : 'rgba(255,255,255,0.62)',
                      }}>
                      <Icon size={16} strokeWidth={activo ? 2.4 : 1.9}
                        className="flex-shrink-0" />
                      <span className="text-[13px] font-medium flex-1 text-left">
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Usuario */}
          <div className="px-3 py-3 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center
                text-white text-[11px] font-bold flex-shrink-0"
                style={{ background: '#1565C0' }}>
                {nombre.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-[13px] text-white/80 font-medium truncate flex-1">
                {nombre}
              </p>
              <button onClick={handleLogout} title="Cerrar sesión"
                className="text-white/40 hover:text-white transition p-1">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </aside>

        {/* Área de contenido */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Encabezado */}
          <header className="flex-shrink-0 bg-white px-8 py-5 flex items-center
            justify-between" style={{ borderBottom: '1px solid #E8EDF5' }}>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-800 leading-tight"
                style={{ fontFamily: 'Archivo, system-ui, sans-serif' }}>
                {titulo}
              </h1>
              {descripcion && (
                <p className="text-[13px] text-slate-400 mt-0.5">{descripcion}</p>
              )}
            </div>
            {acciones && (
              <div className="flex items-center gap-2 flex-shrink-0 ml-6">
                {acciones}
              </div>
            )}
          </header>

          {/* Contenido */}
          <main className="flex-1 overflow-y-auto px-8 py-6">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
