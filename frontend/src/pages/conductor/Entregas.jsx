import { useState } from 'react'
import {
  Package, Phone, MapPin, MessageCircle, Truck, Check, Loader2, RefreshCw, Navigation,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import {
  useEntregasConductor, useIniciarReparto, useMarcarEntregado,
} from '../../hooks/usePaquetes'
import { METODOS_PAGO } from '../../constants/roles'
import ConductorLayout from '../../components/layout/ConductorLayout'
import EstadoBadge from '../../components/ui/EstadoBadge'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'

function whatsappUrl(telefono, mensaje) {
  const num = (telefono ?? '').replace(/\D/g, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`
}

function mapsUrl(direccion) {
  // Abre Google Maps (o la app de mapas del teléfono) con la dirección en Maracaibo
  const query = encodeURIComponent(`${direccion}, Maracaibo, Venezuela`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function mapsEmbedUrl(direccion) {
  const query = encodeURIComponent(`${direccion}, Maracaibo, Venezuela`)
  return `https://maps.google.com/maps?q=${query}&z=14&output=embed`
}

export default function Entregas() {
  const { user } = useAuthStore()
  const [modal,    setModal]    = useState(null)
  const [receptor, setReceptor] = useState('')
  const [metodo,   setMetodo]   = useState('Efectivo')
  const [monto,    setMonto]    = useState('')
  const [toast,    setToast]    = useState({ show: false, msg: '', type: 'success' })

  const { data: entregas = [], isLoading, refetch } = useEntregasConductor(user?.id)
  const { mutateAsync: iniciarReparto, isPending: iniciando } = useIniciarReparto()
  const { mutateAsync: marcarEntregado, isPending: entregando } = useMarcarEntregado()

  const abrirEntrega = (p) => {
    setReceptor('')
    setMetodo('Efectivo')
    setMonto(p.precio_final?.toString() ?? '')
    setModal(p)
  }

  const handleIniciar = async (p) => {
    try {
      await iniciarReparto({ id: p.id })
      setToast({ show: true, msg: 'Reparto iniciado 🚚', type: 'success' })
    } catch {
      setToast({ show: true, msg: 'Error al iniciar reparto', type: 'error' })
    }
  }

  const handleEntregar = async () => {
    if (!modal || !receptor.trim()) return
    try {
      await marcarEntregado({
        id:              modal.id,
        nombre_receptor: receptor.trim(),
        metodo_pago:     metodo,
        monto_cobrado:   parseFloat(monto) || null,
        anteriorEstado:  modal.estado,
      })
      setToast({ show: true, msg: '¡Paquete entregado! ✓', type: 'success' })
      setModal(null)
    } catch {
      setToast({ show: true, msg: 'Error al marcar entregado', type: 'error' })
    }
  }

  return (
    <ConductorLayout>
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      <div className="px-5 py-4">

        {/* Contador */}
        <div className="rounded-2xl p-5 mb-4 flex items-center justify-between"
          style={{ background: '#1565C0' }}>
          <div>
            <p className="text-blue-200 text-xs mb-0.5">ENTREGAS PENDIENTES</p>
            <p className="text-white text-4xl font-black">{entregas.length}</p>
            <p className="text-blue-200 text-xs mt-0.5">
              {entregas.length === 1 ? 'paquete asignado' : 'paquetes asignados'}
            </p>
          </div>
          <button onClick={() => refetch()}
            className="text-blue-200 hover:text-white transition p-2 active:scale-95">
            <RefreshCw size={22} />
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && entregas.length === 0 && (
          <div className="text-center py-16">
            <Truck size={48} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              No tienes entregas asignadas
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Cuando Administración te asigne paquetes aparecerán aquí
            </p>
          </div>
        )}

        {/* Lista de entregas */}
        <div className="space-y-3">
          {entregas.map(p => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">

              {/* Cabecera con foto */}
              <div className="flex items-stretch">
                <div className="w-20 h-20 flex-shrink-0 bg-slate-100">
                  {p.foto_url
                    ? <img src={p.foto_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <Package size={24} className="text-slate-300" />
                      </div>}
                </div>
                <div className="flex-1 px-4 py-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-mono text-slate-400">{p.codigo}</p>
                    <EstadoBadge estado={p.estado} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {p.cliente_nombre ?? 'Cliente'}
                  </p>
                  <p className="text-xs font-bold" style={{ color: '#1565C0' }}>
                    Cobrar: ${p.precio_final} USD
                  </p>
                </div>
              </div>

              {/* Dirección y teléfono */}
              <div className="px-4 pb-3 space-y-2">
                {p.cliente_direccion && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                      <MapPin size={14} className="flex-shrink-0 mt-0.5"
                        style={{ color: '#B45309' }} />
                      <p className="text-xs text-slate-700 break-words">
                        {p.cliente_direccion}
                      </p>
                    </div>
                    {/* Mini mapa */}
                    <div className="rounded-xl overflow-hidden border border-slate-200"
                      style={{ height: 130 }}>
                      <iframe
                        title={`mapa-${p.codigo}`}
                        src={mapsEmbedUrl(p.cliente_direccion)}
                        width="100%" height="130" style={{ border: 0 }}
                        loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                    </div>
                    {/* Botón para navegar */}
                    <a href={mapsUrl(p.cliente_direccion)}
                      target="_blank" rel="noreferrer"
                      className="w-full py-3 rounded-xl text-white font-semibold text-sm
                        flex items-center justify-center gap-2 active:scale-95 transition"
                      style={{ background: '#0D2B5E' }}>
                      <Navigation size={16} /> Cómo llegar (Google Maps)
                    </a>
                  </div>
                )}
                <div className="flex gap-2">
                  {p.cliente_telefono && (
                    <>
                      <a href={`tel:${p.cliente_telefono}`}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200
                          text-slate-700 text-xs font-semibold flex items-center
                          justify-center gap-1.5 active:scale-95">
                        <Phone size={13} /> Llamar
                      </a>
                      <a href={whatsappUrl(p.cliente_telefono,
                          `Hola ${p.cliente_nombre}, soy de Los Líderes Encomiendas. Voy en camino con tu paquete ${p.codigo} 🚚`)}
                        target="_blank" rel="noreferrer"
                        className="flex-1 py-2.5 rounded-xl border border-green-500
                          text-green-600 text-xs font-semibold flex items-center
                          justify-center gap-1.5 active:scale-95">
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    </>
                  )}
                </div>

                {/* Acción principal según estado */}
                {p.estado === 'EN_TRANSITO' ? (
                  <button onClick={() => handleIniciar(p)} disabled={iniciando}
                    className="w-full py-3 rounded-xl border-2 font-semibold text-sm
                      flex items-center justify-center gap-2 active:scale-95 transition
                      disabled:opacity-50"
                    style={{ borderColor: '#1565C0', color: '#1565C0' }}>
                    {iniciando
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Truck size={16} />}
                    Iniciar reparto
                  </button>
                ) : (
                  <button onClick={() => abrirEntrega(p)}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm
                      flex items-center justify-center gap-2 active:scale-95 transition"
                    style={{ background: '#1B7A3E' }}>
                    <Check size={16} /> Marcar como entregado
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de entrega */}
      {modal && (
        <Modal open={!!modal} onClose={() => setModal(null)}
          title={`Entregar ${modal.codigo}`}>

          <div className="bg-white rounded-xl p-4 mb-4">
            <p className="text-xs text-slate-400">Cliente</p>
            <p className="text-sm font-semibold text-slate-800">
              {modal.cliente_nombre}
            </p>
            <p className="text-lg font-black mt-1" style={{ color: '#1565C0' }}>
              Cobrar ${modal.precio_final} USD
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">¿Quién recibió el paquete? *</p>
              <input type="text" value={receptor}
                onChange={e => setReceptor(e.target.value)}
                placeholder="Nombre de quien recibe"
                className="w-full px-4 py-3 rounded-xl border border-slate-200
                  text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="bg-white rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-2">Método de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {METODOS_PAGO.map(m => (
                  <button key={m} onClick={() => setMetodo(m)}
                    className={`py-2.5 rounded-xl text-xs font-semibold border-2
                      transition active:scale-95
                      ${metodo === m
                        ? 'text-white'
                        : 'border-slate-200 text-slate-600 bg-white'}`}
                    style={metodo === m
                      ? { background: '#1565C0', borderColor: '#1565C0' }
                      : {}}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Monto cobrado (USD)</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2
                  text-slate-400 text-sm font-bold">$</span>
                <input type="number" inputMode="decimal" value={monto}
                  onChange={e => setMonto(e.target.value)}
                  className="w-full pl-8 pr-16 py-3 rounded-xl border border-slate-200
                    text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2
                  text-slate-400 text-xs">USD</span>
              </div>
            </div>

            <button onClick={handleEntregar}
              disabled={!receptor.trim() || entregando}
              className="w-full py-4 rounded-2xl text-white font-semibold text-sm
                flex items-center justify-center gap-2 disabled:opacity-50
                active:scale-95 transition"
              style={{ background: '#1B7A3E' }}>
              {entregando
                ? <Loader2 size={18} className="animate-spin" />
                : <Check size={18} />}
              Confirmar entrega
            </button>
            <p className="text-xs text-center text-slate-400">
              La fecha y hora de entrega se registran automáticamente
            </p>
          </div>
        </Modal>
      )}
    </ConductorLayout>
  )
}
