import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Loader2, MessageCircle, Send, Phone, MapPin, User } from 'lucide-react'
import { usePaquetesAdmin, useTarifar, useDespachar } from '../../hooks/usePaquetes'
import { useTarifas, getPrecioSugerido } from '../../hooks/useTarifas'
import AdminLayout from '../../components/layout/AdminLayout'
import EstadoBadge from '../../components/ui/EstadoBadge'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'

const FILTROS = [
  { label: 'Pendientes', value: 'RECIBIDO'    },
  { label: 'Tarifados',  value: 'TARIFADO'    },
  { label: 'Tránsito',   value: 'EN_TRANSITO' },
  { label: 'Reparto',    value: 'EN_REPARTO'  },
  { label: 'Todos',      value: null           },
]

function whatsappUrl(telefono, mensaje) {
  const num = (telefono ?? '').replace(/\D/g, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`
}

function InfoCard({ icon: Icon, label, value, color }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 bg-white rounded-xl px-4 py-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: color ? color + '20' : '#EEF2F8' }}>
        <Icon size={15} style={{ color: color ?? '#1565C0' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
      </div>
    </div>
  )
}

export default function PaquetesAdmin() {
  const [params]       = useSearchParams()
  const estadoParam    = params.get('estado')
  const tarificarParam = params.get('tarificar')

  const [filtro,   setFiltro]   = useState(estadoParam ?? 'RECIBIDO')
  const [modal,    setModal]    = useState(null)
  const [precio,   setPrecio]   = useState('')
  const [fechaEst, setFechaEst] = useState('')
  const [monto,    setMonto]    = useState('')
  const [toast,    setToast]    = useState({ show: false, msg: '', type: 'success' })

  const { data: paquetes = [], isLoading } = usePaquetesAdmin(filtro)
  const { data: tarifas  = [] }            = useTarifas()
  const { mutateAsync: tarifar,   isPending: tarifando   } = useTarifar()
  const { mutateAsync: despachar, isPending: despachando } = useDespachar()

  useEffect(() => {
    if (tarificarParam && paquetes.length > 0) {
      const p = paquetes.find(x => x.id === tarificarParam)
      if (p) openModal(p)
    }
  }, [tarificarParam, paquetes])

  const openModal = (p) => {
    const sugerido = getPrecioSugerido(tarifas, p.tamanio)
    setPrecio(sugerido?.toString() ?? '')
    setFechaEst('')
    setMonto('')
    setModal(p)
  }

  // Datos del cliente — siempre disponibles desde la vista
  const clienteNombre   = modal?.cliente_nombre    ?? modal?.perfiles?.nombre            ?? '—'
  const clienteTelefono = modal?.cliente_telefono  ?? modal?.perfiles?.telefono          ?? ''
  const clienteCodigo   = modal?.cliente_codigo    ?? modal?.perfiles?.codigo_casillero  ?? '—'
  const clienteDireccion = modal?.cliente_direccion ?? ''

  const handleTarifar = async () => {
    if (!modal) return
    try {
      const sugerido = getPrecioSugerido(tarifas, modal.tamanio) ?? parseFloat(precio)
      await tarifar({
        id:              modal.id,
        precio_sugerido: sugerido,
        precio_final:    parseFloat(precio),
        fecha_estimada:  fechaEst || null,
        anteriorEstado:  modal.estado,
      })
      setToast({ show: true, msg: '¡Precio asignado!', type: 'success' })
      setModal(null)
    } catch {
      setToast({ show: true, msg: 'Error al tarifar', type: 'error' })
    }
  }

  const handleDespachar = async () => {
    if (!modal) return
    try {
      await despachar({
        id:             modal.id,
        conductor_id:   null,
        monto_traslado: parseFloat(monto) || 0,
      })
      setToast({ show: true, msg: '¡Paquete despachado!', type: 'success' })
      setModal(null)
    } catch {
      setToast({ show: true, msg: 'Error al despachar', type: 'error' })
    }
  }

  return (
    <AdminLayout title="Paquetes">
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      {/* ── Filtros ── */}
      <div className="px-5 pt-4 pb-2 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {FILTROS.map(({ label, value }) => (
            <button key={label} onClick={() => setFiltro(value)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border
                transition whitespace-nowrap
                ${filtro === value
                  ? 'text-white border-transparent'
                  : 'bg-white text-slate-500 border-slate-200'}`}
              style={filtro === value ? { background: '#1565C0' } : {}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista ── */}
      <div className="px-5 py-3 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && paquetes.length === 0 && (
          <div className="text-center py-14">
            <Package size={44} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No hay paquetes en este estado</p>
          </div>
        )}

        {paquetes.map(p => (
          <button key={p.id} onClick={() => openModal(p)}
            className="w-full bg-white rounded-2xl flex items-stretch
              overflow-hidden shadow-sm active:scale-95 transition text-left">
            <div className="w-20 h-20 flex-shrink-0 bg-slate-100">
              {p.foto_url
                ? <img src={p.foto_url} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <Package size={24} className="text-slate-300" />
                  </div>
              }
            </div>
            <div className="flex-1 px-4 py-3 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <p className="text-xs font-mono text-slate-400">{p.codigo}</p>
                <EstadoBadge estado={p.estado} />
              </div>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {p.cliente_nombre ?? p.perfiles?.nombre ?? 'Cliente'}
              </p>
              <p className="text-xs text-slate-400">
                {p.tamanio ?? '—'}
                {p.peso_kg     ? ` · ${p.peso_kg}kg`        : ''}
                {p.precio_final ? ` · $${p.precio_final} USD` : ''}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Modal pantalla completa ── */}
      {modal && (
        <Modal open={!!modal} onClose={() => setModal(null)}
          title={modal.codigo}>

          {/* Foto */}
          {modal.foto_url && (
            <div className="w-full h-44 rounded-2xl overflow-hidden mb-4 bg-slate-100">
              <img src={modal.foto_url} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Estado */}
          <div className="mb-4">
            <EstadoBadge estado={modal.estado} size="md" />
          </div>

          {/* ── CLIENTE — siempre visible ── */}
          <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
            CLIENTE
          </p>
          <div className="space-y-2 mb-5">
            <InfoCard icon={User}    label="Nombre"    value={clienteNombre} />
            <InfoCard icon={Package} label="Casillero" value={clienteCodigo} />

            {/* Teléfono clickeable para llamar */}
            {clienteTelefono && (
              <a href={`tel:${clienteTelefono}`}
                className="flex items-start gap-3 bg-white rounded-xl px-4 py-3
                  active:scale-95 transition">
                <div className="w-8 h-8 rounded-full flex items-center justify-center
                  flex-shrink-0" style={{ background: '#E6F4EC' }}>
                  <Phone size={15} style={{ color: '#1B7A3E' }} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Teléfono (toca para llamar)</p>
                  <p className="text-sm font-semibold" style={{ color: '#1B7A3E' }}>
                    {clienteTelefono}
                  </p>
                </div>
              </a>
            )}

            {/* Dirección de entrega */}
            {clienteDireccion && (
              <div className="flex items-start gap-3 bg-white rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center
                  flex-shrink-0" style={{ background: '#FEF3C7' }}>
                  <MapPin size={15} style={{ color: '#B45309' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 mb-0.5">Dirección de entrega</p>
                  <p className="text-sm font-medium text-slate-800 break-words">
                    {clienteDireccion}
                  </p>
                </div>
              </div>
            )}

            {/* Botón WhatsApp del cliente */}
            {clienteTelefono && (
              <a href={whatsappUrl(clienteTelefono,
                  `Hola ${clienteNombre}, te escribimos de Los Líderes Encomiendas sobre tu paquete ${modal.codigo}. 📦`
                )}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3
                  rounded-xl border-2 border-green-500 text-green-600
                  font-semibold text-sm active:scale-95 transition">
                <MessageCircle size={16} /> WhatsApp al cliente
              </a>
            )}
          </div>

          {/* ── DATOS DEL PAQUETE — siempre visible ── */}
          <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
            PAQUETE
          </p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-slate-400">Tamaño</p>
              <p className="text-sm font-bold text-slate-800">{modal.tamanio ?? '—'}</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-slate-400">Medidas</p>
              <p className="text-sm font-bold text-slate-800">
                {[modal.largo_cm, modal.ancho_cm, modal.alto_cm]
                  .filter(Boolean).join('×') || '—'} cm
              </p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-slate-400">Peso</p>
              <p className="text-sm font-bold text-slate-800">
                {modal.peso_kg ? `${modal.peso_kg} kg` : '—'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-slate-400">Recibido</p>
              <p className="text-sm font-bold text-slate-800">
                {modal.fecha_recepcion
                  ? new Date(modal.fecha_recepcion).toLocaleDateString('es-VE', {
                      day: 'numeric', month: 'short'
                    })
                  : '—'}
              </p>
            </div>
          </div>

          {/* ── TARIFAR (estado RECIBIDO) ── */}
          {modal.estado === 'RECIBIDO' && (
            <>
              <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
                ASIGNAR PRECIO
              </p>
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-2">
                    Precio sugerido según tabla:{' '}
                    <span className="font-bold text-slate-700">
                      ${getPrecioSugerido(tarifas, modal.tamanio) ?? '—'} USD
                    </span>
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2
                      text-slate-400 text-sm font-bold">$</span>
                    <input type="number" value={precio}
                      onChange={e => setPrecio(e.target.value)}
                      placeholder="Precio final"
                      className="w-full pl-8 pr-16 py-3 rounded-xl border border-slate-200
                        text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2
                      text-slate-400 text-xs">USD</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Fecha estimada de entrega</p>
                  <input type="date" value={fechaEst}
                    onChange={e => setFechaEst(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200
                      text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <button onClick={handleTarifar}
                  disabled={!precio || tarifando}
                  className="w-full py-4 rounded-2xl text-white font-semibold text-sm
                    flex items-center justify-center gap-2 disabled:opacity-50
                    active:scale-95 transition"
                  style={{ background: '#1565C0' }}>
                  {tarifando && <Loader2 size={18} className="animate-spin" />}
                  Confirmar precio
                </button>

                {clienteTelefono && precio && (
                  <a href={whatsappUrl(clienteTelefono,
                      `Hola ${clienteNombre}, tu paquete ${modal.codigo} llegó a la bodega 📦\nPrecio: $${precio} USD\nFecha estimada: ${fechaEst || 'por coordinar'}\n¡Te avisamos cuando esté en camino!`
                    )}
                    target="_blank" rel="noreferrer"
                    className="w-full py-4 rounded-2xl border-2 border-green-500
                      text-green-600 font-semibold text-sm flex items-center
                      justify-center gap-2 active:scale-95 transition">
                    <MessageCircle size={18} /> Notificar precio por WhatsApp
                  </a>
                )}
              </div>
            </>
          )}

          {/* ── DESPACHAR (estado TARIFADO) ── */}
          {modal.estado === 'TARIFADO' && (
            <>
              <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
                DESPACHAR
              </p>
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500">Precio confirmado</p>
                  <p className="text-xl font-black" style={{ color: '#1565C0' }}>
                    ${modal.precio_final} USD
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">
                    Monto de traslado al conductor (USD)
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2
                      text-slate-400 text-sm font-bold">$</span>
                    <input type="number" value={monto}
                      onChange={e => setMonto(e.target.value)}
                      placeholder="Ej. 5"
                      className="w-full pl-8 pr-16 py-3 rounded-xl border border-slate-200
                        text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2
                      text-slate-400 text-xs">USD</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {clienteTelefono && (
                    <a href={whatsappUrl(clienteTelefono,
                        `Hola ${clienteNombre}, tu paquete ${modal.codigo} está en camino a Maracaibo 🚚\nTe avisamos cuando llegue a tu dirección.`
                      )}
                      target="_blank" rel="noreferrer"
                      className="flex-1 py-4 rounded-2xl border-2 border-green-500
                        text-green-600 font-semibold text-sm flex items-center
                        justify-center gap-2 active:scale-95 transition">
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  )}
                  <button onClick={handleDespachar} disabled={despachando}
                    className="flex-1 py-4 rounded-2xl text-white font-semibold text-sm
                      flex items-center justify-center gap-2 disabled:opacity-50
                      active:scale-95 transition"
                    style={{ background: '#1565C0' }}>
                    {despachando
                      ? <Loader2 size={18} className="animate-spin" />
                      : <Send size={16} />}
                    Despachar
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── INFO (EN_TRANSITO / EN_REPARTO / ENTREGADO) ── */}
          {['EN_TRANSITO','EN_REPARTO','ENTREGADO'].includes(modal.estado) && (
            <>
              <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
                ESTADO DEL ENVÍO
              </p>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-xl p-3">
                    <p className="text-xs text-slate-400">Precio</p>
                    <p className="text-base font-black" style={{ color: '#1565C0' }}>
                      ${modal.precio_final} USD
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3">
                    <p className="text-xs text-slate-400">Traslado</p>
                    <p className="text-base font-black text-slate-800">
                      ${modal.monto_traslado ?? 0} USD
                    </p>
                  </div>
                </div>

                {modal.fecha_estimada && (
                  <div className="bg-white rounded-xl p-3">
                    <p className="text-xs text-slate-400">Fecha estimada</p>
                    <p className="text-sm font-bold text-slate-800">
                      {new Date(modal.fecha_estimada).toLocaleDateString('es-VE', {
                        weekday: 'long', day: 'numeric', month: 'long'
                      })}
                    </p>
                  </div>
                )}

                {modal.nombre_receptor && (
                  <div className="rounded-xl p-3" style={{ background: '#E6F4EC' }}>
                    <p className="text-xs" style={{ color: '#1B7A3E' }}>Recibido por</p>
                    <p className="text-sm font-semibold" style={{ color: '#1B7A3E' }}>
                      {modal.nombre_receptor}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

        </Modal>
      )}
    </AdminLayout>
  )
}
