import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Copy, ChevronRight, AlertCircle, MessageCircle, PackagePlus, HelpCircle, X,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useMiPerfil } from '../../hooks/usePerfiles'
import { useMisPrealertas } from '../../hooks/usePrealertas'
import { usePaquetes } from '../../hooks/usePaquetes'
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
  const [comoComprar, setComoComprar] = useState(false)
  const [sinImagen,   setSinImagen]   = useState(false)

  const { data: perfil } = useMiPerfil(user?.id)
  const { data: prealertas = [] } = useMisPrealertas(user?.id)

  const pendientes = prealertas.filter(p => p.estado === 'PENDIENTE').length

  // Activos = todo lo que todavía se mueve. El cliente no distingue entre
  // RECIBIDO, TARIFADO, EN_TRANSITO y EN_REPARTO: para él son "los que
  // están en camino". Lo único cerrado es ENTREGADO.
  const { data: paquetes = [] } = usePaquetes()
  const activos = paquetes.filter(p => p.estado !== 'ENTREGADO').length

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
          <p className="text-slate-300 text-xs">Este código identifica tus paquetes</p>
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
            {/* La imagen va flotada, no dentro de un flex: en un flex ocupaba
                una fila propia y empujaba toda la dirección hacia abajo.
                Flotada, el texto la rodea y la tarjeta no crece. */}
              {/* La explicación vive aquí y no más abajo porque este es el
                  momento de la duda: el cliente está mirando una dirección
                  ajena y se pregunta qué hace con ella.

                  La imagen se sirve desde public/ y no se importa desde
                  assets/ a propósito: si el archivo todavía no está, un import
                  rompería el build, mientras que así solo falla la carga y
                  entra el respaldo de texto. */}
              <button onClick={() => setComoComprar(true)}
                aria-label="Ver cómo usar esta dirección"
                className="float-right ml-3 flex flex-col items-center gap-1
                  active:scale-95 transition">
                {sinImagen ? (
                  <span className="flex items-center gap-1 text-xs font-semibold
                    px-2.5 py-1 rounded-full"
                    style={{ background: '#DCF2E5', color: '#14532D' }}>
                    <HelpCircle size={13} /> ¿Cómo la uso?
                  </span>
                ) : (
                  <>
                    <img
                      src="/como-usar.png"
                      alt=""
                      onError={() => setSinImagen(true)}
                      className="w-[72px] h-[72px] object-contain rounded-xl"
                      style={{ background: '#DCF2E5' }}
                    />
                    <span className="text-[10px] font-bold leading-none"
                      style={{ color: '#14532D' }}>
                      ¿Cómo la uso?
                    </span>
                  </>
                )}
              </button>

              <p className="text-xs font-semibold text-slate-500 tracking-wider mb-3">
                DIRECCIÓN DE ENVÍO
              </p>
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
            <div className="clear-both" />
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

        {/* Mis paquetes — sube aquí, pegado a Avisar: juntos responden las dos
            preguntas con las que el cliente abre la app, "¿qué viene?" y
            "¿dónde está lo mío?". */}
        <div className="mx-5 mt-3">
          <button onClick={() => navigate('/cliente/paquetes')}
            className="w-full bg-white rounded-2xl shadow-sm px-5 py-4
              flex items-center justify-between gap-3 active:scale-95 transition">
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold text-slate-800">Ver mis paquetes</p>
              <p className="text-sm text-slate-600 mt-0.5">
                {activos > 0
                  ? `${activos} ${activos === 1 ? 'activo' : 'activos'} · toca para seguirlos`
                  : 'Estado y seguimiento'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {activos > 0 && (
                <span className="min-w-[26px] h-[26px] px-2 rounded-full flex items-center
                  justify-center text-white text-xs font-bold font-mono"
                  style={{ background: '#1565C0' }}>
                  {activos}
                </span>
              )}
              <ChevronRight size={20} className="text-slate-300" />
            </div>
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

      {/* ════════ CÓMO COMPRAR ════════ */}
      {comoComprar && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(13,43,94,0.6)' }}
          onClick={() => setComoComprar(false)}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-6 pt-5 pb-8
            max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5" />

            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Cómo comprar</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cuatro pasos y tu compra llega a Maracaibo
                </p>
              </div>
              <button onClick={() => setComoComprar(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center
                  justify-center text-slate-500 flex-shrink-0 active:scale-95">
                <X size={16} />
              </button>
            </div>

            {[
              { n:'1', title:'Copia la dirección', desc:'Pégala tal cual en la tienda (Amazon, Shein, Temu) al momento de pagar.' },
              { n:'2', title:'Deja tu código', desc:`Sin el ${codigo} no sabemos de quién es el paquete cuando llega.` },
              { n:'3', title:'Avísanos qué viene', desc:'Desde la pestaña Avisar cuéntanos qué compraste. Así lo reconocemos apenas llegue, aunque la caja venga sin tu código.', accion:'/cliente/avisar' },
              { n:'4', title:'Te avisamos', desc:'Cuando llegue a la bodega recibirás una notificación con la foto y el precio.' },
            ].map(({ n, title, desc, accion }) => (
              <div key={n} className="flex gap-4 mb-5 last:mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center
                  flex-shrink-0 text-white text-xs font-bold mt-0.5"
                  style={{ background: '#1565C0' }}>{n}</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">{title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  {accion && (
                    <button onClick={() => { setComoComprar(false); navigate(accion) }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold
                        active:scale-95 transition"
                      style={{ color: '#1565C0' }}>
                      Avisar un paquete <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button onClick={() => setComoComprar(false)}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm
                active:scale-95 transition mt-2"
              style={{ background: '#1565C0' }}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </ClienteLayout>
  )
}
