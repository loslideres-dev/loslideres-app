import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Loader2, MessageCircle, Phone, MapPin, User, Navigation, Search, X } from 'lucide-react'
import { usePaquetesAdmin, useTarifar, useMarcarEntregado } from '../../hooks/usePaquetes'
import { useConductores } from '../../hooks/usePerfiles'
import { useAuthStore } from '../../store/authStore'
import { METODOS_PAGO } from '../../constants/roles'
import { useTarifas, getPrecioSugerido } from '../../hooks/useTarifas'
import AdminLayout from '../../components/layout/AdminLayout'
import EstadoBadge from '../../components/ui/EstadoBadge'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import ImageViewer from '../../components/ui/ImageViewer'

const FILTROS = [
  { label: 'Todos',      value: null           },
  { label: 'Pendientes', value: 'RECIBIDO'    },
  { label: 'Tarifados',  value: 'TARIFADO'    },
  { label: 'Tránsito',   value: 'EN_TRANSITO' },
  { label: 'Reparto',    value: 'EN_REPARTO'  },
]

function whatsappUrl(telefono, mensaje) {
  const num = (telefono ?? '').replace(/\D/g, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`
}

function mapsUrl(direccion) {
  const query = encodeURIComponent(`${direccion}, Maracaibo, Venezuela`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
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

  const [filtro,   setFiltro]   = useState(estadoParam ?? null)
  const [busqueda, setBusqueda] = useState('')
  const [modal,    setModal]    = useState(null)
  const [precio,   setPrecio]   = useState('')
  const [fechaEst, setFechaEst] = useState('')
  const [monto,    setMonto]    = useState('')
  const [conductorSel, setConductorSel] = useState('')
  const [montoTraslado, setMontoTraslado] = useState('')
  const [metodoTarifa, setMetodoTarifa] = useState('')
  const [receptor, setReceptor] = useState('')
  const [metodoPago, setMetodoPago] = useState('Efectivo')
  const [montoCobrado, setMontoCobrado] = useState('')
  const [toast,    setToast]    = useState({ show: false, msg: '', type: 'success' })
  const [visorSrc, setVisorSrc] = useState(null)  // ← visor imagen

  const { data: paquetes = [], isLoading } = usePaquetesAdmin(filtro)

  const q = busqueda.trim().toLowerCase()
  const paquetesFiltrados = q
    ? paquetes.filter(p =>
        p.codigo?.toLowerCase().includes(q) ||
        p.tracking_externo?.toLowerCase().includes(q) ||
        p.cliente_nombre?.toLowerCase().includes(q))
    : paquetes
  const { data: tarifas  = [] }            = useTarifas()
  const { mutateAsync: tarifar,   isPending: tarifando   } = useTarifar()
  const { mutateAsync: marcarEntregado, isPending: entregando } = useMarcarEntregado()
  const { data: conductores = [] } = useConductores()
  const { user } = useAuthStore()

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
    setConductorSel(p.conductor_id ?? '')
    setMontoTraslado(p.monto_traslado ? String(p.monto_traslado) : '')
    setMetodoTarifa(p.metodo_pago ?? '')
    setReceptor('')
    setMetodoPago(p.metodo_pago ?? 'Efectivo')
    setMontoCobrado(p.precio_final ? String(p.precio_final) : '')
    setMetodoPago('Efectivo')
    setMontoCobrado(p.precio_final?.toString() ?? '')
    setModal(p)
  }

  const clienteNombre   = modal?.cliente_nombre    ?? modal?.perfiles?.nombre            ?? '—'
  const clienteTelefono = modal?.cliente_telefono  ?? modal?.perfiles?.telefono          ?? ''
  const clienteCodigo   = modal?.cliente_codigo    ?? modal?.perfiles?.codigo_casillero  ?? '—'
  const clienteDireccion = modal?.cliente_direccion ?? ''

  const esOtroConductor = conductorSel && conductorSel !== user.id

  const handleTarifar = async () => {
    if (!modal) return
    if (!metodoTarifa) {
      setToast({ show: true, msg: 'Selecciona el método de pago', type: 'error' })
      return
    }
    if (esOtroConductor && !montoTraslado) {
      setToast({ show: true, msg: 'Indica el monto de traslado del conductor', type: 'error' })
      return
    }
    try {
      const sugerido = getPrecioSugerido(tarifas, modal.tamanio) ?? parseFloat(precio)
      await tarifar({
        id:              modal.id,
        precio_sugerido: sugerido,
        precio_final:    parseFloat(precio),
        fecha_estimada:  fechaEst || null,
        conductor_id:    conductorSel || user.id,
        monto_traslado:  esOtroConductor ? (parseFloat(montoTraslado) || 0) : 0,
        metodo_pago:     metodoTarifa,
        anteriorEstado:  modal.estado,
      })
      setToast({ show: true, msg: '¡Paquete tarifado y asignado!', type: 'success' })
      setModal(null)
    } catch {
      setToast({ show: true, msg: 'Error al tarifar', type: 'error' })
    }
  }

  const handleMarcarEntregado = async () => {
    if (!modal || !receptor.trim()) return
    try {
      await marcarEntregado({
        id:              modal.id,
        nombre_receptor: receptor.trim(),
        metodo_pago:     metodoPago,
        monto_cobrado:   parseFloat(montoCobrado) || null,
        anteriorEstado:  modal.estado,
      })
      setToast({ show: true, msg: '¡Paquete entregado! ✓', type: 'success' })
      setModal(null)
    } catch {
      setToast({ show: true, msg: 'Error al marcar entregado', type: 'error' })
    }
  }

  return (
    <AdminLayout title="Paquetes">
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      {/* Visor de imagen a pantalla completa */}
      {visorSrc && (
        <ImageViewer src={visorSrc} onClose={() => setVisorSrc(null)} />
      )}

      {/* ── Buscador ── */}
      <div className="px-5 pt-4 pb-1">
        <div className="relative">
          <Search size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por tracking, ENC o cliente"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200
              bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          {busqueda && (
            <button onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="px-5 pt-2 pb-2 overflow-x-auto">
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

        {!isLoading && paquetesFiltrados.length === 0 && (
          <div className="text-center py-14">
            <Package size={44} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No hay paquetes en este estado</p>
          </div>
        )}

        {paquetesFiltrados.map(p => (
          <button key={p.id} onClick={() => openModal(p)}
            className="w-full bg-white rounded-2xl flex items-stretch
              overflow-hidden shadow-sm active:scale-95 transition text-left">
            <div className="w-20 h-20 flex-shrink-0 bg-slate-50">
              {p.foto_url
                ? <img src={p.foto_url} className="w-full h-full object-contain" />
                : <div className="w-full h-full flex items-center justify-center">
                    <Package size={24} className="text-slate-300" />
                  </div>
              }
            </div>
            <div className="flex-1 px-4 py-3 min-w-0">
              <div className="flex items-start justify-between mb-1 gap-2">
                <div className="min-w-0">
                  {p.tracking_externo && (
                    <p className="text-xs font-mono font-semibold text-slate-700 truncate">
                      {p.tracking_externo}
                    </p>
                  )}
                  <p className="text-xs font-mono text-slate-400">{p.codigo}</p>
                </div>
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

      {/* ── Modal ── */}
      {modal && (
        <Modal open={!!modal} onClose={() => setModal(null)}
          title={modal.codigo}>

          {/* Foto — clickeable para expandir */}
          {modal.foto_url && (
            <button
              onClick={() => setVisorSrc(modal.foto_url)}
              className="w-full h-44 rounded-2xl overflow-hidden mb-4 bg-slate-100
                active:opacity-90 transition relative group"
            >
              <img src={modal.foto_url} className="w-full h-full object-cover" />
              {/* Hint visual */}
              <div className="absolute inset-0 flex items-center justify-center
                opacity-0 group-active:opacity-100 transition"
                style={{ background: 'rgba(0,0,0,0.25)' }}>
                <span className="text-white text-xs font-semibold bg-black/50
                  px-3 py-1 rounded-full">Ver imagen</span>
              </div>
            </button>
          )}

          {/* Estado */}
          <div className="mb-4">
            <EstadoBadge estado={modal.estado} size="md" />
          </div>

          {/* Códigos */}
          <div className="bg-white rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">
                {modal.tracking_externo ? 'Tracking del courier' : 'Código interno'}
              </p>
              <p className="text-sm font-mono font-semibold text-slate-800 truncate">
                {modal.tracking_externo ?? modal.codigo}
              </p>
            </div>
            {modal.tracking_externo && (
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-xs text-slate-400">Interno</p>
                <p className="text-xs font-mono text-slate-500">{modal.codigo}</p>
              </div>
            )}
          </div>

          {/* ── CLIENTE ── */}
          <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
            CLIENTE
          </p>
          <div className="space-y-2 mb-5">
            <InfoCard icon={User}    label="Nombre"    value={clienteNombre} />
            <InfoCard icon={Package} label="Casillero" value={clienteCodigo} />

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

            {clienteDireccion && (
              <div className="bg-white rounded-xl overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-3">
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
                <a href={mapsUrl(clienteDireccion)}
                  target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3
                    border-t border-slate-100 text-sm font-semibold active:scale-95 transition"
                  style={{ color: '#0D2B5E' }}>
                  <Navigation size={16} /> Ver en el mapa
                </a>
              </div>
            )}

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

          {/* ── DATOS DEL PAQUETE ── */}
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

          {/* ── TARIFAR (RECIBIDO) ── */}
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
                  <p className="text-xs text-slate-400 mb-2">Método de pago del cliente *</p>
                  <div className="grid grid-cols-2 gap-2">
                    {METODOS_PAGO.map(m => (
                      <button key={m} onClick={() => setMetodoTarifa(m)}
                        className={`py-2.5 rounded-xl text-xs font-semibold border-2
                          transition active:scale-95
                          ${metodoTarifa === m
                            ? 'text-white'
                            : 'border-slate-200 text-slate-600 bg-white'}`}
                        style={metodoTarifa === m
                          ? { background: '#1565C0', borderColor: '#1565C0' }
                          : {}}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Fecha estimada de entrega</p>
                  <input type="date" value={fechaEst}
                    onChange={e => setFechaEst(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200
                      text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="bg-white rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Asignar conductor</p>
                  <select value={conductorSel}
                    onChange={e => setConductorSel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200
                      text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Yo mismo (Administración)</option>
                    {conductores.filter(c => c.id !== user.id).map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Si no eliges a nadie, el paquete queda asignado a ti
                  </p>
                </div>

                {esOtroConductor && (
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-1">
                      Monto de traslado al conductor (USD) *
                    </p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2
                        text-slate-400 text-sm font-bold">$</span>
                      <input type="number" inputMode="decimal" value={montoTraslado}
                        onChange={e => setMontoTraslado(e.target.value)}
                        placeholder="Ej. 5"
                        className="w-full pl-8 pr-16 py-3 rounded-xl border border-slate-200
                          text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2
                        text-slate-400 text-xs">USD</span>
                    </div>
                  </div>
                )}

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

                {['EN_TRANSITO','EN_REPARTO'].includes(modal.estado) && (
                  <div className="pt-2 space-y-3">
                    <p className="text-xs font-semibold text-slate-400 tracking-wider">
                      MARCAR COMO ENTREGADO
                    </p>
                    <div className="bg-white rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1">¿Quién recibió? *</p>
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
                          <button key={m} onClick={() => setMetodoPago(m)}
                            className={`py-2.5 rounded-xl text-xs font-semibold border-2
                              transition active:scale-95
                              ${metodoPago === m
                                ? 'text-white'
                                : 'border-slate-200 text-slate-600 bg-white'}`}
                            style={metodoPago === m
                              ? { background: '#1565C0', borderColor: '#1565C0' }
                              : {}}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1">Monto cobrado (USD)</p>
                      <input type="number" inputMode="decimal" value={montoCobrado}
                        onChange={e => setMontoCobrado(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200
                          text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button onClick={handleMarcarEntregado}
                      disabled={!receptor.trim() || entregando}
                      className="w-full py-4 rounded-2xl text-white font-semibold text-sm
                        flex items-center justify-center gap-2 disabled:opacity-50
                        active:scale-95 transition"
                      style={{ background: '#1B7A3E' }}>
                      {entregando
                        ? <Loader2 size={18} className="animate-spin" />
                        : null}
                      Confirmar entrega
                    </button>
                    <p className="text-xs text-center text-slate-400">
                      La fecha de entrega se registra automáticamente
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
