import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Copy, ChevronRight, AlertCircle, MessageCircle, PackagePlus } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useMiPerfil } from '../../hooks/usePerfiles'
import { useMisPrealertas } from '../../hooks/usePrealertas'
import ClienteLayout from '../../components/layout/ClienteLayout'
import ClienteHeader from '../../components/layout/ClienteHeader'
import Toast from '../../components/ui/Toast'
import Tour from '../../components/ui/Tour'
import { BODEGA_INFO } from '../../constants/roles'

const WHATSAPP_ADMIN = '584246282123'

function buildDireccion(nombre, codigo) {
  return [
    `${nombre} · ${codigo}`,
    BODEGA_INFO.calle,
    BODEGA_INFO.barrio,
    BODEGA_INFO.ciudad,
    BODEGA_INFO.pais,
    BODEGA_INFO.telefono,
  ].join('\n')
}

export default function Casillero() {
  const navigate          = useNavigate()
  const [params]          = useSearchParams()
  const { user } = useAuthStore()
  const [toast, setToast] = useState(false)
  const [showTour, setShowTour] = useState(params.get('tour') === '1')

  const { data: perfil } = useMiPerfil(user?.id)
  const { data: prealertas = [] } = useMisPrealertas(user?.id)

  const pendientes = prealertas.filter(p => p.estado === 'PENDIENTE').length

  const nombre = perfil?.nombre ?? user?.user_metadata?.nombre
    ?? user?.email?.split('@')[0] ?? 'Cliente'
  const codigo   = perfil?.codigo_casillero
    ?? user?.user_metadata?.codigo_casillero ?? '????'

  const perfilIncompleto = perfil && (!perfil.telefono || !perfil.direccion_entrega)

  const handleCopy = () => {
    navigator.clipboard.writeText(buildDireccion(nombre, codigo))
    setToast(true)
  }

  const handleFinishTour = () => {
    setShowTour(false)
    if (perfilIncompleto) navigate('/cliente/perfil?completar=1')
  }

  const whatsappUrl = `https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(
    `Hola, soy ${nombre} (casillero ${codigo}). Necesito ayuda con mi envío.`
  )}`

  return (
    <ClienteLayout>
      {showTour && <Tour onFinish={handleFinishTour} />}

      <Toast message="¡Dirección copiada!" show={toast} onHide={() => setToast(false)} />

      <ClienteHeader subtitulo="MI CASILLERO" titulo={nombre}>
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
      </ClienteHeader>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto pb-6">

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
        <div className="mx-5 mt-4 rounded-2xl overflow-hidden"
          style={{ background: '#F0FAF4', border: '1.5px solid #6ECC97' }}>
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-semibold text-slate-400 tracking-wider mb-3">DIRECCIÓN DE ENVÍO</p>
            <div className="space-y-1">
              {[
                `${nombre} · ${codigo}`,
                BODEGA_INFO.calle, BODEGA_INFO.barrio, BODEGA_INFO.ciudad, BODEGA_INFO.pais, BODEGA_INFO.telefono,
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

        {/* Avisar — va justo después de la dirección porque ese es el momento:
            el cliente acaba de copiarla para comprar, y lo siguiente que
            debería hacer es contarnos qué viene. */}
        <div className="mx-5 mt-4">
          <button onClick={() => navigate('/cliente/avisar')}
            className="w-full rounded-2xl px-5 py-4 flex items-center gap-4
              active:scale-95 transition text-left"
            style={{
              background: 'linear-gradient(135deg, #1565C0 0%, #0D2B5E 100%)',
              boxShadow: '0 4px 14px rgba(21,101,192,0.25)',
            }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center
              flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <PackagePlus size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">
                {pendientes > 0
                  ? `${pendientes} ${pendientes === 1 ? 'paquete' : 'paquetes'} en camino`
                  : '¿Ya compraste algo?'}
              </p>
              <p className="text-xs leading-snug mt-0.5" style={{ color: '#9EC5F0' }}>
                {pendientes > 0
                  ? 'Toca para ver o avisar otro envío'
                  : 'Avísanos y lo reconocemos apenas llegue a la bodega'}
              </p>
            </div>
            <ChevronRight size={18} style={{ color: '#9EC5F0' }} className="flex-shrink-0" />
          </button>
        </div>

        {/* Instrucciones */}
        <div className="mx-5 mt-4 bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-400 tracking-wider mb-4">CÓMO COMPRAR</p>
          {[
            { n:'1', title:'Copia la dirección', desc:'Pégala tal cual en la tienda (Amazon, Shein, Temu) al momento de pagar.' },
            { n:'2', title:`Deja tu código`, desc:`Sin el ${codigo} no sabemos de quién es el paquete cuando llega.` },
            { n:'3', title:'Avísanos qué viene', desc:'Desde la pestaña Avisar cuéntanos qué compraste. Así lo reconocemos apenas llegue, aunque la caja venga sin tu código.', accion:'/cliente/avisar' },
            { n:'4', title:'Te avisamos', desc:'Cuando llegue a la bodega recibirás una notificación con la foto y el precio.' },
          ].map(({ n, title, desc, accion }) => (
            <div key={n} className="flex gap-4 mb-4 last:mb-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center
                flex-shrink-0 text-white text-xs font-bold mt-0.5"
                style={{ background: '#1565C0' }}>{n}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 mb-0.5">{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                {/* El paso que pide una acción la ofrece ahí mismo: leer
                    "ve a la pestaña Avisar" y tener que buscarla es fricción. */}
                {accion && (
                  <button onClick={() => navigate(accion)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold
                      active:scale-95 transition"
                    style={{ color: '#1565C0' }}>
                    Avisar un paquete <ChevronRight size={13} />
                  </button>
                )}
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

        {/* Botón WhatsApp de contacto */}
        <div className="mx-5 mt-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-4
              rounded-2xl text-white font-semibold text-sm active:scale-95 transition"
            style={{ background: '#25D366' }}
          >
            <MessageCircle size={18} />
            Contactar a Los Líderes
          </a>
        </div>

      </div>
    </ClienteLayout>
  )
}
