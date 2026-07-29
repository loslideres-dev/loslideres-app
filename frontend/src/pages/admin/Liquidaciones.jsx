import { useState } from 'react'
import {
  Truck, Warehouse, Search, X, Loader2, Check, Wallet,
  Calendar, History, ChevronRight, ChevronDown, Package, AlertTriangle,
} from 'lucide-react'
import {
  usePendientesLiquidacion, useLiquidaciones, useLiquidar,
  usePaquetesPendientes, usePaquetesDeLiquidacion,
} from '../../hooks/useLiquidaciones'
import AdminLayout from '../../components/layout/AdminLayout'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'

const fmtUSD = n => `$${(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const fmtCOP = n => `$${(Number(n) || 0).toLocaleString('es-CO')}`

function fechaCorta(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
}
function fechaLarga(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-VE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const TIPOS = [
  { label: 'Bodegueros',  value: 'bodeguero', icon: Warehouse },
  { label: 'Conductores', value: 'conductor', icon: Truck     },
]

export default function Liquidaciones() {
  const [tipo,     setTipo]     = useState('bodeguero')
  const [vista,    setVista]    = useState('pendientes')  // 'pendientes' | 'historial'
  const [busqueda, setBusqueda] = useState('')
  const [aLiquidar, setALiquidar] = useState(null)   // fila de pendientes
  const [verLiq,    setVerLiq]    = useState(null)   // liquidación del historial
  const [toast,     setToast]     = useState({ show: false, msg: '', type: 'success' })

  const { data: pendientes = [], isLoading: loadPend } = usePendientesLiquidacion(tipo)
  const { data: historial  = [], isLoading: loadHist } = useLiquidaciones({ tipo })

  const q = busqueda.trim().toLowerCase()
  const pendFiltrados = q
    ? pendientes.filter(p => p.nombre?.toLowerCase().includes(q))
    : pendientes
  const histFiltrado = q
    ? historial.filter(h => h.perfiles?.nombre?.toLowerCase().includes(q))
    : historial

  const esConductor = tipo === 'conductor'

  // Totales del tab actual
  const totalPendiente = esConductor
    ? pendientes.reduce((s, p) => s + (Number(p.monto_usd) || 0), 0)
    : pendientes.reduce((s, p) => s + (Number(p.monto_cop) || 0), 0)

  return (
    <AdminLayout title="Liquidaciones">
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      <div className="px-5 py-4">

        {/* ── Selector de tipo ── */}
        <div className="flex gap-2 mb-4">
          {TIPOS.map(({ label, value, icon: Icon }) => (
            <button key={value}
              onClick={() => { setTipo(value); setBusqueda('') }}
              className={`flex-1 py-3 rounded-xl text-xs font-semibold flex items-center
                justify-center gap-2 transition active:scale-95
                ${tipo === value
                  ? 'text-white'
                  : 'bg-white text-slate-500 border border-slate-200'}`}
              style={tipo === value ? { background: '#1565C0' } : {}}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* ── Total pendiente ── */}
        <div className="rounded-2xl p-5 mb-4 text-white"
          style={{ background: esConductor ? '#1565C0' : '#B45309' }}>
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <Wallet size={18} />
            <p className="text-xs font-medium">POR PAGAR AHORA</p>
          </div>
          <p className="text-3xl font-black">
            {esConductor ? fmtUSD(totalPendiente) : fmtCOP(totalPendiente)}
            <span className="text-sm font-normal opacity-70 ml-1.5">
              {esConductor ? 'USD' : 'COP'}
            </span>
          </p>
          <p className="text-xs opacity-70 mt-0.5">
            {pendientes.length} {pendientes.length === 1 ? 'persona' : 'personas'} con saldo
          </p>
        </div>

        {/* ── Pendientes / Historial ── */}
        <div className="flex gap-2 mb-3">
          {[
            { label: 'Pendientes', value: 'pendientes' },
            { label: 'Historial',  value: 'historial'  },
          ].map(v => (
            <button key={v.value} onClick={() => setVista(v.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border
                transition active:scale-95
                ${vista === v.value
                  ? 'text-white border-transparent'
                  : 'bg-white text-slate-500 border-slate-200'}`}
              style={vista === v.value ? { background: '#0D2B5E' } : {}}>
              {v.label}
            </button>
          ))}
        </div>

        {/* ── Buscador ── */}
        <div className="relative mb-4">
          <Search size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder={`Buscar ${esConductor ? 'conductor' : 'bodeguero'}`}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200
              bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          {busqueda && (
            <button onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X size={16} />
            </button>
          )}
        </div>

        {/* ══ PENDIENTES ══ */}
        {vista === 'pendientes' && (
          loadPend ? <Spinner /> : (
            <div className="space-y-2">
              {pendFiltrados.length === 0 && (
                <Vacio icon={Check}
                  titulo="Todo al día"
                  desc={`No hay ${esConductor ? 'conductores' : 'bodegueros'} con saldo pendiente`} />
              )}
              {pendFiltrados.map(p => (
                <button key={p.usuario_id} onClick={() => setALiquidar(p)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center
                    gap-3 active:scale-95 transition text-left">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center
                    text-white text-sm font-bold flex-shrink-0"
                    style={{ background: esConductor ? '#1565C0' : '#B45309' }}>
                    {(p.nombre ?? 'US').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {p.nombre}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.cantidad_paquetes} {p.cantidad_paquetes === 1 ? 'paquete' : 'paquetes'}
                      {' · desde '}{fechaCorta(p.desde)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-black"
                      style={{ color: esConductor ? '#1565C0' : '#B45309' }}>
                      {esConductor ? fmtUSD(p.monto_usd) : fmtCOP(p.monto_cop)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {esConductor ? 'USD' : 'COP'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )
        )}

        {/* ══ HISTORIAL ══ */}
        {vista === 'historial' && (
          loadHist ? <Spinner /> : (
            <div className="space-y-2">
              {histFiltrado.length === 0 && (
                <Vacio icon={History}
                  titulo="Sin liquidaciones"
                  desc="Los cierres que registres aparecerán aquí" />
              )}
              {histFiltrado.map(h => (
                <button key={h.id} onClick={() => setVerLiq(h)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center
                    gap-3 active:scale-95 transition text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center
                    flex-shrink-0" style={{ background: '#E6F4EC' }}>
                    <Check size={18} style={{ color: '#1B7A3E' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {h.perfiles?.nombre ?? 'Usuario'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {fechaCorta(h.fecha_cierre)} · {h.cantidad_paquetes} paquetes
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: '#1B7A3E' }}>
                      {h.tipo === 'conductor'
                        ? fmtUSD(h.total_usd)
                        : fmtCOP(h.total_cop)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {h.tipo === 'conductor' ? 'USD' : 'COP'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Modal: confirmar liquidación ── */}
      {aLiquidar && (
        <ModalLiquidar
          pendiente={aLiquidar}
          tipo={tipo}
          onClose={() => setALiquidar(null)}
          onToast={(msg, type = 'success') => setToast({ show: true, msg, type })}
        />
      )}

      {/* ── Modal: detalle de una liquidación pasada ── */}
      {verLiq && (
        <ModalDetalleLiquidacion
          liquidacion={verLiq}
          onClose={() => setVerLiq(null)}
        />
      )}
    </AdminLayout>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal de confirmación de pago
// ═══════════════════════════════════════════════════════════════════════════
function ModalLiquidar({ pendiente, tipo, onClose, onToast }) {
  const [notas, setNotas] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const { mutateAsync: liquidar, isPending } = useLiquidar()
  const { data: paquetes = [], isLoading } =
    usePaquetesPendientes(pendiente.usuario_id, tipo)

  const esConductor = tipo === 'conductor'
  const monto = esConductor ? pendiente.monto_usd : pendiente.monto_cop

  const handleConfirmar = async () => {
    try {
      await liquidar({
        usuarioId: pendiente.usuario_id,
        tipo,
        notas: notas.trim() || null,
      })
      onToast(`Liquidación de ${pendiente.nombre} registrada ✓`)
      onClose()
    } catch (e) {
      onToast(e.message ?? 'Error al registrar la liquidación', 'error')
    }
  }

  return (
    <Modal open onClose={onClose} title={`Liquidar a ${pendiente.nombre}`}>

      {!confirmando ? (
        <div className="space-y-4">
          {/* Monto */}
          <div className="rounded-2xl p-5 text-center text-white"
            style={{ background: esConductor ? '#1565C0' : '#B45309' }}>
            <p className="text-xs opacity-80 mb-1">TOTAL A PAGAR</p>
            <p className="text-4xl font-black">
              {esConductor ? fmtUSD(monto) : fmtCOP(monto)}
            </p>
            <p className="text-xs opacity-70 mt-1">
              {esConductor ? 'USD' : 'COP'} · {pendiente.cantidad_paquetes}{' '}
              {pendiente.cantidad_paquetes === 1 ? 'paquete' : 'paquetes'}
            </p>
          </div>

          {/* Periodo */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-slate-400">Desde</p>
              <p className="text-sm font-bold text-slate-800">
                {fechaCorta(pendiente.desde)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-slate-400">Hasta</p>
              <p className="text-sm font-bold text-slate-800">
                {fechaCorta(pendiente.hasta)}
              </p>
            </div>
          </div>

          {/* Notas */}
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-2">Notas (opcional)</p>
            <textarea rows={2} value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej. Pagado en efectivo el 28/07"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm
                outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Detalle de paquetes (plegable) */}
          <PaquetesPlegable
            paquetes={paquetes}
            isLoading={isLoading}
            esConductor={esConductor}
            desde={pendiente.desde}
            hasta={pendiente.hasta}
          />

          <button onClick={() => setConfirmando(true)}
            className="w-full py-4 rounded-2xl text-white font-semibold text-sm
              flex items-center justify-center gap-2 active:scale-95 transition"
            style={{ background: '#1B7A3E' }}>
            <Wallet size={18} /> Registrar pago
          </button>
        </div>
      ) : (
        /* ── Confirmación final ── */
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center
            mx-auto mb-4" style={{ background: '#FEF3C7' }}>
            <AlertTriangle size={30} style={{ color: '#B45309' }} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            ¿Confirmar el pago?
          </h3>
          <p className="text-sm text-slate-500 mb-2 px-4">
            Se registrará el pago de{' '}
            <span className="font-bold text-slate-700">
              {esConductor ? fmtUSD(monto) : fmtCOP(monto)}
            </span>{' '}
            a {pendiente.nombre}.
          </p>
          <p className="text-xs text-slate-400 mb-6 px-4">
            Su contador vuelve a cero y estos {pendiente.cantidad_paquetes} paquetes
            quedan marcados como pagados. El historial se conserva.
          </p>
          <div className="space-y-2">
            <button onClick={handleConfirmar} disabled={isPending}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm
                flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              style={{ background: '#1B7A3E' }}>
              {isPending
                ? <Loader2 size={18} className="animate-spin" />
                : <Check size={18} />}
              Sí, registrar pago
            </button>
            <button onClick={() => setConfirmando(false)} disabled={isPending}
              className="w-full py-3.5 rounded-xl font-semibold text-sm
                border border-slate-200 text-slate-600 active:scale-95">
              Volver
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal de detalle de una liquidación ya registrada
// ═══════════════════════════════════════════════════════════════════════════
function ModalDetalleLiquidacion({ liquidacion, onClose }) {
  const esConductor = liquidacion.tipo === 'conductor'
  const { data: paquetes = [], isLoading } =
    usePaquetesDeLiquidacion(liquidacion.id, liquidacion.tipo)

  return (
    <Modal open onClose={onClose}
      title={liquidacion.perfiles?.nombre ?? 'Liquidación'}>
      <div className="space-y-4">

        <div className="rounded-2xl p-5 text-center text-white"
          style={{ background: '#1B7A3E' }}>
          <p className="text-xs opacity-80 mb-1">PAGADO</p>
          <p className="text-4xl font-black">
            {esConductor
              ? fmtUSD(liquidacion.total_usd)
              : fmtCOP(liquidacion.total_cop)}
          </p>
          <p className="text-xs opacity-70 mt-1">
            {esConductor ? 'USD' : 'COP'} · {liquidacion.cantidad_paquetes} paquetes
          </p>
        </div>

        <div className="bg-white rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Calendar size={15} style={{ color: '#1565C0' }} />
            <div>
              <p className="text-xs text-slate-400">Fecha del cierre</p>
              <p className="text-sm font-semibold text-slate-800">
                {fechaLarga(liquidacion.fecha_cierre)}
              </p>
            </div>
          </div>
        </div>

        {liquidacion.tarifa_aplicada && (
          <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">Tarifa aplicada</p>
            <p className="text-sm font-bold text-slate-800">
              {fmtCOP(liquidacion.tarifa_aplicada)} COP
            </p>
          </div>
        )}

        {liquidacion.notas && (
          <div className="bg-white rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-1">Notas</p>
            <p className="text-sm text-slate-700">{liquidacion.notas}</p>
          </div>
        )}

        <PaquetesPlegable
          paquetes={paquetes}
          isLoading={isLoading}
          esConductor={esConductor}
          desde={liquidacion.fecha_inicio}
          hasta={liquidacion.fecha_cierre}
        />
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Tarjeta plegable con el detalle de paquetes
//
// Cerrada muestra solo el resumen (cantidad + rango de fechas). Al tocarla
// despliega la lista completa. Mantiene el modal corto y el botón de pago
// visible sin tener que hacer scroll.
// ═══════════════════════════════════════════════════════════════════════════
function PaquetesPlegable({ paquetes, isLoading, esConductor, desde, hasta }) {
  const [abierto, setAbierto] = useState(false)
  const cantidad = paquetes.length

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* Cabecera clickeable */}
      <button
        onClick={() => setAbierto(v => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-slate-50 transition"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center
          flex-shrink-0" style={{ background: '#EEF2F8' }}>
          <Package size={18} style={{ color: '#1565C0' }} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-slate-800">
            {cantidad} {cantidad === 1 ? 'paquete' : 'paquetes'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {desde && hasta
              ? `Del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`
              : 'Ver el detalle'}
          </p>
        </div>
        <ChevronDown size={18}
          className={`text-slate-400 flex-shrink-0 transition-transform duration-200
            ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {/* Lista desplegada */}
      {abierto && (
        <div className="border-t border-slate-100">
          {isLoading ? <Spinner /> : (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {paquetes.map(p => (
                <div key={p.id}
                  className="px-4 py-2.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-slate-600 truncate">
                      {p.tracking_externo ?? p.codigo}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {fechaCorta(esConductor ? p.fecha_entrega : p.fecha_recepcion)}
                      {p.tamanio ? ` · ${p.tamanio}` : ''}
                    </p>
                  </div>
                  {esConductor && (
                    <p className="text-xs font-bold flex-shrink-0"
                      style={{ color: '#1B7A3E' }}>
                      +{fmtUSD(p.monto_traslado)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Auxiliares ──
function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
        rounded-full animate-spin" />
    </div>
  )
}

function Vacio({ icon: Icon, titulo, desc }) {
  return (
    <div className="text-center py-14">
      <Icon size={44} className="text-slate-200 mx-auto mb-3" />
      <p className="text-slate-600 text-sm font-medium">{titulo}</p>
      <p className="text-slate-400 text-xs mt-1">{desc}</p>
    </div>
  )
}
