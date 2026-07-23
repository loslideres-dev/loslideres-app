import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Loader2, MessageCircle, Send } from 'lucide-react'
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
  const num = (telefono ?? '').replace(/\D/g,'')
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`
}

export default function PaquetesAdmin() {
  const [params]           = useSearchParams()
  const estadoParam        = params.get('estado')
  const tarificarParam     = params.get('tarificar')

  const [filtro,    setFiltro]    = useState(estadoParam ?? 'RECIBIDO')
  const [modal,     setModal]     = useState(null)  // paquete seleccionado
  const [precio,    setPrecio]    = useState('')
  const [fechaEst,  setFechaEst]  = useState('')
  const [monto,     setMonto]     = useState('')
  const [toast,     setToast]     = useState({ show: false, msg: '', type: 'success' })

  const { data: paquetes = [], isLoading } = usePaquetesAdmin(filtro)
  const { data: tarifas  = [] }            = useTarifas()
  const { mutateAsync: tarifar, isPending: tarifando } = useTarifar()
  const { mutateAsync: despachar, isPending: despachando } = useDespachar()

  // Auto-abrir si viene ?tarificar=id
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

  const handleTarifar = async () => {
    if (!modal) return
    try {
      const sugerido = getPrecioSugerido(tarifas, modal.tamanio) ?? parseFloat(precio)
      await tarifar({
        id:             modal.id,
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
      await despachar({ id: modal.id, conductor_id: null, monto_traslado: parseFloat(monto) || 0 })
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

      {/* Filtros */}
      <div className="px-5 pt-4 pb-2 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {FILTROS.map(({ label, value }) => (
            <button key={label} onClick={() => setFiltro(value)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition whitespace-nowrap
                ${filtro === value ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200'}`}
              style={filtro === value ? { background: '#1565C0' } : {}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-3 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
            className="w-full bg-white rounded-2xl flex items-stretch overflow-hidden
              shadow-sm active:scale-95 transition text-left">
            <div className="w-20 h-20 flex-shrink-0 bg-slate-100">
              {p.foto_url
                ? <img src={p.foto_url} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <Package size={24} className="text-slate-300" />
                  </div>
              }
            </div>
            <div className="flex-1 px-4 py-3">
              <div className="flex items-start justify-between mb-1">
                <p className="text-xs font-mono text-slate-400">{p.codigo}</p>
                <EstadoBadge estado={p.estado} />
              </div>
              <p className="text-sm font-semibold text-slate-800">{p.perfiles?.nombre ?? 'Cliente'}</p>
              <p className="text-xs text-slate-400">
                {p.tamanio ?? '—'}
                {p.peso_kg ? ` · ${p.peso_kg}kg` : ''}
                {p.precio_final ? ` · $${p.precio_final} USD` : ''}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Modal acciones */}
      {modal && (
        <Modal open={!!modal} onClose={() => setModal(null)}
          title={`${modal.codigo} · ${modal.perfiles?.nombre ?? ''}`}>

          {/* Foto */}
          {modal.foto_url && (
            <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-slate-100">
              <img src={modal.foto_url} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Info */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">Tamaño</p>
              <p className="text-sm font-bold text-slate-800">{modal.tamanio ?? '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">Medidas</p>
              <p className="text-sm font-bold text-slate-800">
                {[modal.largo_cm, modal.ancho_cm, modal.alto_cm].filter(Boolean).join('×') || '—'} cm
              </p>
            </div>
          </div>

          {/* Tarifar */}
          {modal.estado === 'RECIBIDO' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 tracking-wider">
                  PRECIO (USD) — Sugerido: ${getPrecioSugerido(tarifas, modal.tamanio) ?? '—'}
                </label>
                <input type="number" value={precio}
                  onChange={e => setPrecio(e.target.value)}
                  placeholder="Precio final en USD"
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200
                    text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 tracking-wider">
                  FECHA ESTIMADA DE ENTREGA
                </label>
                <input type="date" value={fechaEst}
                  onChange={e => setFechaEst(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200
                    text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleTarifar} disabled={!precio || tarifando}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm
                  flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#1565C0' }}>
                {tarifando ? <Loader2 size={18} className="animate-spin" /> : null}
                Confirmar precio
              </button>
            </div>
          )}

          {/* Despachar */}
          {modal.estado === 'TARIFADO' && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Precio confirmado</p>
                <p className="text-lg font-black text-slate-800">${modal.precio_final} USD</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 tracking-wider">
                  MONTO DE TRASLADO AL CONDUCTOR (USD)
                </label>
                <input type="number" value={monto}
                  onChange={e => setMonto(e.target.value)}
                  placeholder="Ej. 5"
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200
                    text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2">
                <a href={whatsappUrl(
                    modal.perfiles?.telefono,
                    `Hola ${modal.perfiles?.nombre}, tu paquete ${modal.codigo} fue tarifado en $${modal.precio_final} USD. Entrega estimada: ${modal.fecha_estimada ?? 'por coordinar'}.`
                  )}
                  target="_blank" rel="noreferrer"
                  className="flex-1 py-3.5 rounded-xl border-2 border-green-500 text-green-600
                    font-semibold text-sm flex items-center justify-center gap-2">
                  <MessageCircle size={16} /> WhatsApp
                </a>
                <button onClick={handleDespachar} disabled={despachando}
                  className="flex-1 py-3.5 rounded-xl text-white font-semibold text-sm
                    flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: '#1565C0' }}>
                  {despachando ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                  Despachar
                </button>
              </div>
            </div>
          )}

          {/* Ver info si ya despachado */}
          {['EN_TRANSITO','EN_REPARTO','ENTREGADO'].includes(modal.estado) && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Precio</p>
                  <p className="text-base font-black text-slate-800">${modal.precio_final} USD</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Traslado</p>
                  <p className="text-base font-black text-slate-800">${modal.monto_traslado ?? 0} USD</p>
                </div>
              </div>
              {modal.nombre_receptor && (
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-green-600">Recibido por</p>
                  <p className="text-sm font-semibold text-green-800">{modal.nombre_receptor}</p>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </AdminLayout>
  )
}
