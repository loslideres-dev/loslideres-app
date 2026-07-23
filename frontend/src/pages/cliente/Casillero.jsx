import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Copy, LogOut, ChevronRight, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useMiPerfil } from '../../hooks/usePerfiles'
import ClienteLayout from '../../components/layout/ClienteLayout'
import Toast from '../../components/ui/Toast'
import Tour from '../../components/ui/Tour'
import { BODEGA_INFO } from '../../constants/roles'

function buildDireccion(nombre, codigo) {
  return [
    `${nombre} · ${codigo}`,
    BODEGA_INFO.calle,
    BODEGA_INFO.ciudad,
    BODEGA_INFO.pais,
    BODEGA_INFO.telefono,
  ].join('\n')
}

export default function Casillero() {
  const navigate          = useNavigate()
  const [params]          = useSearchParams()
  const { user, clearAuth } = useAuthStore()
  const [toast, setToast] = useState(false)
  const [showTour, setShowTour] = useState(params.get('tour') === '1')

  const { data: perfil } = useMiPerfil(user?.id)

  const nombre = perfil?.nombre ?? user?.user_metadata?.nombre
    ?? user?.email?.split('@')[0] ?? 'Cliente'
  const initials = nombre.slice(0,2).toUpperCase()
  const codigo   = perfil?.codigo_casillero
    ?? user?.user_metadata?.codigo_casillero ?? '????'

  // Perfil incompleto = falta teléfono o dirección
  const perfilIncompleto = perfil && (!perfil.telefono || !perfil.direccion_entrega)

  const handleCopy = () => {
    navigator.clipboard.writeText(buildDireccion(BODEGA_INFO.contacto, codigo))
    setToast(true)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut(); clearAuth()
    navigate('/login', { replace: true })
  }

  const handleFinishTour = () => {
    setShowTour(false)
    // Si el perfil está incompleto, redirigir a perfil
    if (perfilIncompleto) navigate('/cliente/perfil?completar=1')
  }

  return (
    <ClienteLayout>
      {showTour && <Tour onFinish={handleFinishTour} />}

      <Toast message="¡Dirección copiada!" show={toast} onHide={() => setToast(false)} />

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-6" style={{ background: '#0D2B5E' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sky-300 text-xs mb-0.5">MAICAO · CO</p>
            <h1 className="text-white text-xl font-bold">Mi casillero</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center
              text-white text-sm font-bold overflow-hidden"
              style={{ background: '#1565C0' }}>
              {perfil?.avatar_url
                ? <img src={perfil.avatar_url} className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Badge código */}
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <p className="text-sky-300 text-xs font-medium tracking-widest mb-2">
            TU CÓDIGO DE CASILLERO
          </p>
          <p className="text-white font-black tracking-widest mb-1"
            style={{ fontSize: 38, letterSpacing: 6 }}>
            {codigo}
          </p>
          <p className="text-slate-400 text-xs">Este código identifica tus paquetes</p>
        </div>
      </div>

      {/* Alerta perfil incompleto */}
      {perfilIncompleto && (
        <div className="mx-5 mt-4">
          <button onClick={() => navigate('/cliente/perfil?completar=1')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
              border-2 text-left active:scale-95 transition"
            style={{ borderColor: '#F59E0B', background: '#FFFBEB' }}>
            <AlertCircle size={20} style={{ color: '#F59E0B' }} className="flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#92400E' }}>
                Completa tu perfil
              </p>
              <p className="text-xs" style={{ color: '#B45309' }}>
                Necesitamos tu teléfono y dirección para entregarte tus paquetes
              </p>
            </div>
            <ChevronRight size={16} style={{ color: '#F59E0B' }} />
          </button>
        </div>
      )}

      {/* Dirección */}
      <div className="mx-5 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs font-semibold text-slate-400 tracking-wider mb-3">DIRECCIÓN DE ENVÍO</p>
          <div className="space-y-1">
            {[
              `${BODEGA_INFO.contacto} · ${codigo}`,
              BODEGA_INFO.calle, BODEGA_INFO.ciudad, BODEGA_INFO.pais, BODEGA_INFO.telefono,
            ].map((line, i) => (
              <p key={i} className={`text-sm ${i === 0 ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                {line}
              </p>
            ))}
          </div>
        </div>
        <button onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-4
            border-t border-slate-100 text-sm font-semibold active:scale-95"
          style={{ color: '#1565C0' }}>
          <Copy size={16} /> Copiar dirección
        </button>
      </div>

      {/* Instrucciones */}
      <div className="mx-5 mt-4 bg-white rounded-2xl shadow-sm p-5">
        <p className="text-xs font-semibold text-slate-400 tracking-wider mb-4">CÓMO COMPRAR</p>
        {[
          { n:'1', title:'Copia la dirección', desc:'Pégala tal cual en la tienda (Amazon, Shein, Temu) al momento de pagar.' },
          { n:'2', title:`Deja tu código`, desc:`Sin el ${codigo} no sabemos de quién es el paquete cuando llega.` },
          { n:'3', title:'Te avisamos', desc:'Cuando llegue a la bodega recibirás una notificación con la foto y el precio.' },
        ].map(({ n, title, desc }) => (
          <div key={n} className="flex gap-4 mb-4 last:mb-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center
              flex-shrink-0 text-white text-xs font-bold mt-0.5"
              style={{ background: '#1565C0' }}>{n}</div>
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">{title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Acceso rápido */}
      <div className="mx-5 mt-4">
        <button onClick={() => navigate('/cliente/paquetes')}
          className="w-full bg-white rounded-2xl shadow-sm px-5 py-4
            flex items-center justify-between active:scale-95 transition">
          <div>
            <p className="text-sm font-semibold text-slate-800">Ver mis paquetes</p>
            <p className="text-xs text-slate-400 mt-0.5">Estado y seguimiento</p>
          </div>
          <ChevronRight size={20} className="text-slate-300" />
        </button>
      </div>
    </ClienteLayout>
  )
}