import { useState, useRef } from 'react'
import {
  Package, Phone, MapPin, MessageCircle, Truck, Check, Loader2, RefreshCw, Navigation, Plane,
  Camera, Image as ImageIcon, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { comprimirImagen } from '../../lib/imageUtils'
import { useTasasVigentes, usdAMoneda } from '../../hooks/usePagos'
import { useAuthStore } from '../../store/authStore'
import {
  useEntregasConductor, usePonerEnTransito, useIniciarReparto, useMarcarEntregado,
} from '../../hooks/usePaquetes'
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
  const [fotoBlob,    setFotoBlob]    = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoKB,      setFotoKB]      = useState(null)
  const [procesando,  setProcesando]  = useState(false)
  const [subiendo,    setSubiendo]    = useState(false)
  const [montoCobrado, setMontoCobrado] = useState('')
  const camRef = useRef(null)
  const galRef = useRef(null)
  const [toast,    setToast]    = useState({ show: false, msg: '', type: 'success' })

  const { data: entregas = [], isLoading, refetch } = useEntregasConductor(user?.id)
  const { data: tasas = {} } = useTasasVigentes()
  const { mutateAsync: ponerEnTransito, isPending: enviando } = usePonerEnTransito()
  const { mutateAsync: iniciarReparto, isPending: iniciando } = useIniciarReparto()
  const { mutateAsync: marcarEntregado, isPending: entregando } = useMarcarEntregado()

  const limpiarFoto = () => {
    setFotoBlob(null); setFotoPreview(null); setFotoKB(null)
  }

  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProcesando(true)
    try {
      const { blob, sizeKB } = await comprimirImagen(file, { maxKB: 300 })
      setFotoBlob(blob)
      setFotoKB(sizeKB)
      setFotoPreview(URL.createObjectURL(blob))
    } catch {
      setToast({ show: true, msg: 'Error al procesar la foto', type: 'error' })
    } finally {
      setProcesando(false)
    }
  }

  const abrirEntrega = (p) => {
    setReceptor('')
    limpiarFoto()
    // Precargar el monto a cobrar. Si el método es en otra moneda se
    // convierte con la tasa vigente; si falta la tasa se deja vacío para
    // que el conductor lo escriba en vez de mostrar un número inventado.
    const moneda = p.moneda_cobro ?? 'USD'
    if (moneda === 'USD') {
      setMontoCobrado(p.precio_final != null ? String(p.precio_final) : '')
    } else {
      const tasa = tasas[moneda]?.valor_por_usd
      const convertido = usdAMoneda(p.precio_final, tasa)
      setMontoCobrado(convertido != null ? String(Math.round(convertido)) : '')
    }
    setModal(p)
  }

  const handlePonerTransito = async (p) => {
    try {
      await ponerEnTransito({ id: p.id })
      setToast({ show: true, msg: 'Paquete en tránsito ✈️', type: 'success' })
    } catch {
      setToast({ show: true, msg: 'Error al poner en tránsito', type: 'error' })
    }
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
    setSubiendo(true)
    try {
      // Si el conductor tomó foto, se sube primero. Si falla la subida se
      // avisa pero NO se bloquea la entrega: lo importante es registrar que
      // el paquete llegó, la foto es un extra.
      let foto_entrega_url = null
      if (fotoBlob) {
        try {
          const path = `entrega_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`
          const { error: errUp } = await supabase.storage
            .from('paquetes-fotos')
            .upload(path, fotoBlob, { contentType: 'image/jpeg', upsert: false })
          if (errUp) throw errUp
          const { data: { publicUrl } } = supabase.storage
            .from('paquetes-fotos').getPublicUrl(path)
          foto_entrega_url = publicUrl
        } catch {
          setToast({
            show: true,
            msg: 'No se pudo subir la foto, se registra la entrega igual',
            type: 'error',
          })
        }
      }

      // Congelar la conversión con la tasa de este momento
      const moneda = modal.moneda_cobro ?? 'USD'
      const tasa   = moneda === 'USD' ? 1 : (tasas[moneda]?.valor_por_usd ?? null)
      const monto  = parseFloat(montoCobrado) || modal.precio_final || 0
      const montoUsd = tasa ? monto / tasa : null

      await marcarEntregado({
        id:                modal.id,
        nombre_receptor:   receptor.trim(),
        metodo_pago:       modal.metodo_pago ?? null,
        monto_cobrado:     monto,
        moneda_cobro:      moneda,
        tasa_aplicada:     tasa,
        monto_cobrado_usd: montoUsd,
        anteriorEstado:    modal.estado,
        foto_entrega_url,
      })
      setToast({ show: true, msg: '¡Paquete entregado! ✓', type: 'success' })
      setModal(null)
      limpiarFoto()
    } catch {
      setToast({ show: true, msg: 'Error al marcar entregado', type: 'error' })
    } finally {
      setSubiendo(false)
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
                <div className="w-20 h-20 flex-shrink-0 bg-slate-50">
                  {p.foto_url
                    ? <img src={p.foto_url} alt="" className="w-full h-full object-contain" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <Package size={24} className="text-slate-300" />
                      </div>}
                </div>
                <div className="flex-1 px-4 py-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
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
                {p.estado === 'TARIFADO' && (
                  <button onClick={() => handlePonerTransito(p)} disabled={enviando}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm
                      flex items-center justify-center gap-2 active:scale-95 transition
                      disabled:opacity-50"
                    style={{ background: '#0D2B5E' }}>
                    {enviando
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Plane size={16} />}
                    Poner en tránsito
                  </button>
                )}
                {p.estado === 'EN_TRANSITO' && (
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
                )}
                {p.estado === 'EN_REPARTO' && (
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
      {modal && (() => {
        const monedaCobro = modal.moneda_cobro ?? 'USD'
        const tasaActual  = monedaCobro === 'USD' ? 1 : tasas[monedaCobro]?.valor_por_usd
        const sinTasa     = monedaCobro !== 'USD' && !tasaActual
        return (
        <Modal open={!!modal} onClose={() => setModal(null)}
          title={`Entregar ${modal.codigo}`}>

          <div className="bg-white rounded-xl p-4 mb-4">
            {modal.tracking_externo && (
              <div className="mb-2 pb-2 border-b border-slate-100">
                <p className="text-xs text-slate-400">Tracking</p>
                <p className="text-sm font-mono font-semibold text-slate-700">
                  {modal.tracking_externo}
                </p>
              </div>
            )}
            <p className="text-xs text-slate-400">Cliente</p>
            <p className="text-sm font-semibold text-slate-800">
              {modal.cliente_nombre}
            </p>
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-xs text-slate-400">Precio del envío</p>
                <p className="text-lg font-black" style={{ color: '#1565C0' }}>
                  ${modal.precio_final} USD
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Método de pago</p>
                <p className="text-sm font-semibold text-slate-700">
                  {modal.metodo_pago_nombre ?? modal.metodo_pago ?? '—'}
                </p>
                {monedaCobro !== 'USD' && (
                  <p className="text-[10px] font-bold" style={{ color: '#B45309' }}>
                    Se cobra en {monedaCobro}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Monto a cobrar — editable solo si no es dólar */}
            {monedaCobro !== 'USD' && (
              <div className="bg-white rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">
                  Monto a cobrar en {monedaCobro} *
                </p>
                <div className="relative">
                  <input type="number" inputMode="decimal" value={montoCobrado}
                    onChange={e => setMontoCobrado(e.target.value)}
                    placeholder={sinTasa ? 'Escribe el monto' : ''}
                    className="w-full px-4 py-3 pr-16 rounded-xl border border-slate-200
                      text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2
                    text-slate-400 text-xs">{monedaCobro}</span>
                </div>
                {sinTasa ? (
                  <p className="text-xs mt-1.5" style={{ color: '#B45309' }}>
                    No hay tasa de cambio cargada para {monedaCobro}. Escribe el monto
                    que cobraste; administración puede cargar la tasa después.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1.5">
                    Calculado con la tasa de hoy:{' '}
                    {Number(tasaActual).toLocaleString('es-CO')} {monedaCobro} = 1 USD
                  </p>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">¿Quién recibió el paquete? *</p>
              <input type="text" value={receptor}
                onChange={e => setReceptor(e.target.value)}
                placeholder="Nombre de quien recibe"
                className="w-full px-4 py-3 rounded-xl border border-slate-200
                  text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Foto de entrega (opcional) */}
            <input ref={camRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleFoto} />
            <input ref={galRef} type="file" accept="image/*"
              className="hidden" onChange={handleFoto} />

            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400">Foto de la entrega</p>
                <span className="text-[10px] text-slate-300">opcional</span>
              </div>

              {fotoPreview ? (
                <div className="relative">
                  <img src={fotoPreview} alt="Entrega"
                    className="w-full h-44 object-cover rounded-xl" />
                  <button onClick={limpiarFoto}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full
                      flex items-center justify-center active:scale-90 transition"
                    style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <X size={16} className="text-white" />
                  </button>
                  {fotoKB != null && (
                    <span className="absolute bottom-2 left-2 text-white text-[10px]
                      font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.5)' }}>
                      {fotoKB} KB ✓
                    </span>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => camRef.current?.click()} disabled={procesando}
                    className="py-3 rounded-xl border-2 border-dashed border-slate-200
                      bg-white flex items-center justify-center gap-2 text-slate-500
                      text-xs font-medium active:scale-95 disabled:opacity-50">
                    {procesando
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Camera size={16} />}
                    Tomar foto
                  </button>
                  <button onClick={() => galRef.current?.click()} disabled={procesando}
                    className="py-3 rounded-xl border-2 border-dashed border-slate-200
                      bg-white flex items-center justify-center gap-2 text-slate-500
                      text-xs font-medium active:scale-95 disabled:opacity-50">
                    <ImageIcon size={16} /> Galería
                  </button>
                </div>
              )}
            </div>

            <button onClick={handleEntregar}
              disabled={!receptor.trim() || entregando || subiendo || procesando}
              className="w-full py-4 rounded-2xl text-white font-semibold text-sm
                flex items-center justify-center gap-2 disabled:opacity-50
                active:scale-95 transition"
              style={{ background: '#1B7A3E' }}>
              {(entregando || subiendo)
                ? <Loader2 size={18} className="animate-spin" />
                : <Check size={18} />}
              {subiendo ? 'Subiendo foto...' : 'Confirmar entrega'}
            </button>
            <p className="text-xs text-center text-slate-400">
              El método de pago y monto los definió Administración.
              La fecha de entrega se registra automáticamente.
            </p>
          </div>
        </Modal>
        )
      })()}
    </ConductorLayout>
  )
}
