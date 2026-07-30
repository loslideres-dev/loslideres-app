import { useState } from 'react'
import {
  Truck, Warehouse, Search, Wallet, Check, Loader2, AlertTriangle,
  History, ChevronDown, Package, Receipt, FileText, X,
} from 'lucide-react'
import {
  usePendientesLiquidacion, useLiquidaciones, useLiquidar,
  usePaquetesPendientes, usePaquetesDeLiquidacion,
} from '../../hooks/useLiquidaciones'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'
const usd = n => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const cop = n => `$${(Number(n) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`

const fecha = f => f
  ? new Date(f).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
  : '—'
const fechaLarga = f => f
  ? new Date(f).toLocaleDateString('es-VE', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  : '—'

const TIPOS = [
  { label: 'Bodegueros',  value: 'bodeguero', icon: Warehouse, color: '#B45309' },
  { label: 'Conductores', value: 'conductor', icon: Truck,     color: '#1565C0' },
]

export default function Cierres() {
  const [tipo,  setTipo]  = useState('bodeguero')
  const [busca, setBusca] = useState('')
  const [aLiquidar, setALiquidar] = useState(null)
  const [verLiq, setVerLiq] = useState(null)
  const [toast, setToast] = useState(null)
  const [verGuia, setVerGuia] = useState(null)

  const { data: pendientes = [], isLoading } = usePendientesLiquidacion(tipo)
  const { data: historial = [] }             = useLiquidaciones({ tipo })

  const esConductor = tipo === 'conductor'
  const conf = TIPOS.find(t => t.value === tipo)

  const q = busca.trim().toLowerCase()
  const pend = q ? pendientes.filter(p => p.nombre?.toLowerCase().includes(q)) : pendientes
  const hist = q ? historial.filter(h => h.perfiles?.nombre?.toLowerCase().includes(q)) : historial

  const total = esConductor
    ? pendientes.reduce((s, p) => s + (Number(p.monto_usd) || 0), 0)
    : pendientes.reduce((s, p) => s + (Number(p.monto_cop) || 0), 0)

  return (
    <GerenciaLayout
      titulo="Cierres"
      descripcion="Liquidaciones a bodegueros y conductores"
      acciones={
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F1F5F9' }}>
          {TIPOS.map(({ label, value, icon: Icon }) => (
            <button key={value} onClick={() => { setTipo(value); setBusca('') }}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold flex items-center
                gap-2 transition"
              style={{
                background: tipo === value ? '#FFFFFF' : 'transparent',
                color:      tipo === value ? '#0D2B5E' : '#94A3B8',
                boxShadow:  tipo === value ? '0 1px 3px rgba(13,43,94,0.08)' : 'none',
              }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      }
    >
      {toast && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: toast.tipo === 'error' ? '#FEE2E2' : '#E6F4EC',
            color:      toast.tipo === 'error' ? '#991B1B' : '#166534',
          }}>
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-3 gap-5 max-w-[1400px] items-start">

        {/* Pendientes */}
        <section className="col-span-2 bg-white rounded-2xl overflow-hidden"
          style={{ border: '1px solid #E8EDF5' }}>
          <div className="px-7 py-5 flex items-center justify-between"
            style={{ borderBottom: '1px solid #F1F5F9' }}>
            <div>
              <h2 className="text-[13px] font-bold tracking-wider text-slate-400">
                PENDIENTES DE PAGO
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Trabajo hecho que aún no se ha liquidado
              </p>
            </div>
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                text-slate-400" />
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar persona"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200
                  text-[13px] outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
                rounded-full animate-spin" />
            </div>
          ) : pend.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center
                mx-auto mb-3" style={{ background: '#E6F4EC' }}>
                <Check size={22} style={{ color: '#1B7A3E' }} />
              </div>
              <p className="text-sm font-semibold text-slate-700">Todo al día</p>
              <p className="text-[13px] text-slate-400 mt-1">
                Nadie tiene saldo pendiente
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#FAFBFD' }}>
                  <Th>Persona</Th>
                  <Th align="center">Paquetes</Th>
                  <Th>Periodo</Th>
                  {!esConductor && <Th align="right">Comisión</Th>}
                  {!esConductor && <Th align="right">Fletes</Th>}
                  <Th align="right">Total</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pend.map(p => (
                  <tr key={p.usuario_id} className="hover:bg-slate-50/60 transition">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center
                          text-white text-[11px] font-bold flex-shrink-0"
                          style={{ background: conf.color }}>
                          {(p.nombre ?? 'US').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-semibold text-slate-700">
                          {p.nombre}
                        </span>
                      </div>
                    </Td>
                    <Td align="center">
                      <span className="text-[13px] font-bold" style={{ fontFamily: MONO }}>
                        {p.cantidad_paquetes}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[12px] text-slate-500">
                        {fecha(p.desde)} — {fecha(p.hasta)}
                      </span>
                    </Td>
                    {!esConductor && (
                      <Td align="right">
                        <span className="text-[13px] text-slate-500"
                          style={{ fontFamily: MONO }}>
                          {cop(p.comision_cop)}
                        </span>
                      </Td>
                    )}
                    {!esConductor && (
                      <Td align="right">
                        {Number(p.reembolsos_cop) > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1
                            rounded-lg" style={{ background: '#FEF3C7' }}>
                            <Receipt size={11} style={{ color: '#B45309' }} />
                            <span className="text-[12px] font-bold"
                              style={{ fontFamily: MONO, color: '#B45309' }}>
                              {cop(p.reembolsos_cop)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-slate-300">—</span>
                        )}
                      </Td>
                    )}
                    <Td align="right">
                      <span className="text-[15px] font-black"
                        style={{ fontFamily: MONO, color: conf.color }}>
                        {esConductor ? usd(p.monto_usd) : cop(p.monto_cop)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        {esConductor ? 'USD' : 'COP'}
                      </span>
                    </Td>
                    <Td align="right">
                      <button onClick={() => setALiquidar(p)}
                        className="text-[12px] font-semibold px-3 py-1.5 rounded-lg
                          text-white transition active:scale-95"
                        style={{ background: '#0D2B5E' }}>
                        Liquidar
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Total + historial */}
        <div className="space-y-5">
          <section className="rounded-2xl p-6 text-white" style={{ background: conf.color }}>
            <Wallet size={20} className="mb-4 opacity-70" />
            <p className="text-[11px] font-semibold tracking-wider opacity-70 mb-1">
              POR PAGAR AHORA
            </p>
            <p className="text-[32px] font-black leading-none" style={{ fontFamily: MONO }}>
              {esConductor ? usd(total) : cop(total)}
            </p>
            <p className="text-[12px] opacity-70 mt-2">
              {esConductor ? 'USD' : 'COP'} · {pendientes.length}{' '}
              {pendientes.length === 1 ? 'persona' : 'personas'}
            </p>
          </section>

          <section className="bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid #E8EDF5' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
              <h2 className="text-[13px] font-bold tracking-wider text-slate-400">
                HISTORIAL
              </h2>
            </div>
            {hist.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <History size={30} className="text-slate-200 mx-auto mb-2" />
                <p className="text-[13px] text-slate-400">Sin pagos registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
                {hist.map(h => (
                  <button key={h.id} onClick={() => setVerLiq(h)}
                    className="w-full px-6 py-3 flex items-center justify-between
                      hover:bg-slate-50/60 transition text-left">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-700 truncate">
                        {h.perfiles?.nombre ?? 'Usuario'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {fecha(h.fecha_cierre)} · {h.cantidad_paquetes} paquetes
                      </p>
                    </div>
                    <span className="text-[13px] font-bold flex-shrink-0"
                      style={{ fontFamily: MONO, color: '#1B7A3E' }}>
                      {h.tipo === 'conductor' ? usd(h.total_usd) : cop(h.total_cop)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {aLiquidar && (
        <ModalLiquidar pendiente={aLiquidar} tipo={tipo}
          onClose={() => setALiquidar(null)} onToast={setToast}
          onVerGuia={setVerGuia} />
      )}
      {verLiq && (
        <ModalDetalle liquidacion={verLiq} onClose={() => setVerLiq(null)}
          onVerGuia={setVerGuia} />
      )}
      {verGuia && (
        <VisorGuia src={verGuia} onClose={() => setVerGuia(null)} />
      )}
    </GerenciaLayout>
  )
}

// ── Modal de liquidación ──
function ModalLiquidar({ pendiente, tipo, onClose, onToast, onVerGuia }) {
  const [notas, setNotas] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const { mutateAsync: liquidar, isPending } = useLiquidar()
  const { data: paquetes = [], isLoading } = usePaquetesPendientes(pendiente.usuario_id, tipo)

  const esConductor = tipo === 'conductor'
  const monto = esConductor ? pendiente.monto_usd : pendiente.monto_cop

  const handle = async () => {
    try {
      await liquidar({ usuarioId: pendiente.usuario_id, tipo, notas: notas.trim() || null })
      onToast({ tipo: 'ok', msg: `Liquidación de ${pendiente.nombre} registrada` })
      onClose()
    } catch (e) {
      onToast({ tipo: 'error', msg: e.message ?? 'No se pudo liquidar' })
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="px-7 py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <h2 className="text-lg font-bold text-slate-800">
          Liquidar a {pendiente.nombre}
        </h2>
        <p className="text-[13px] text-slate-500 mt-0.5">
          {fecha(pendiente.desde)} — {fecha(pendiente.hasta)}
        </p>
      </div>

      <div className="px-7 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
        {!confirmar ? (
          <>
            <div className="rounded-xl px-6 py-5 text-center"
              style={{ background: esConductor ? '#EEF2F8' : '#FEF3C7' }}>
              <p className="text-[11px] font-semibold tracking-wider mb-1"
                style={{ color: esConductor ? '#1565C0' : '#B45309' }}>
                TOTAL A PAGAR
              </p>
              <p className="text-4xl font-black"
                style={{ fontFamily: MONO, color: esConductor ? '#1565C0' : '#B45309' }}>
                {esConductor ? usd(monto) : cop(monto)}
              </p>
              <p className="text-[12px] text-slate-500 mt-1">
                {esConductor ? 'USD' : 'COP'} · {pendiente.cantidad_paquetes} paquetes
              </p>
            </div>

            {/* Desglose del bodeguero: trabajo vs devolución */}
            {!esConductor && Number(pendiente.reembolsos_cop) > 0 && (
              <div className="rounded-xl overflow-hidden"
                style={{ border: '1px solid #E8EDF5' }}>
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-700">Comisión</p>
                    <p className="text-[11px] text-slate-400">
                      {pendiente.cantidad_paquetes} paquetes recibidos
                    </p>
                  </div>
                  <span className="text-[14px] font-bold" style={{ fontFamily: MONO }}>
                    {cop(pendiente.comision_cop)}
                  </span>
                </div>
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ background: '#FFFBEB' }}>
                  <div className="flex items-center gap-2">
                    <Receipt size={14} style={{ color: '#B45309' }} />
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: '#92400E' }}>
                        Devolución de fletes
                      </p>
                      <p className="text-[11px]" style={{ color: '#B45309' }}>
                        {pendiente.paquetes_con_cobro} paquetes con cobro a destino
                      </p>
                    </div>
                  </div>
                  <span className="text-[14px] font-bold"
                    style={{ fontFamily: MONO, color: '#B45309' }}>
                    {cop(pendiente.reembolsos_cop)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Notas <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Cómo y cuándo se pagó"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px]
                  outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <Plegable paquetes={paquetes} isLoading={isLoading}
              esConductor={esConductor} onVerGuia={onVerGuia} />

            <button onClick={() => setConfirmar(true)}
              className="w-full py-3 rounded-xl text-white text-[13px] font-semibold
                flex items-center justify-center gap-2 transition active:scale-[0.98]"
              style={{ background: '#1B7A3E' }}>
              <Wallet size={15} /> Registrar pago
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center
              mx-auto mb-4" style={{ background: '#FEF3C7' }}>
              <AlertTriangle size={26} style={{ color: '#B45309' }} />
            </div>
            <p className="text-base font-bold text-slate-800 mb-1">¿Confirmar el pago?</p>
            <p className="text-[13px] text-slate-500 px-4 mb-6 leading-relaxed">
              Se registra el pago de{' '}
              <span className="font-bold">{esConductor ? usd(monto) : cop(monto)}</span> a{' '}
              {pendiente.nombre}. Su contador vuelve a cero y estos{' '}
              {pendiente.cantidad_paquetes} paquetes quedan marcados como pagados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmar(false)} disabled={isPending}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600
                  text-[13px] font-semibold hover:bg-slate-50 transition">
                Volver
              </button>
              <button onClick={handle} disabled={isPending}
                className="flex-[2] py-3 rounded-xl text-white text-[13px] font-semibold
                  flex items-center justify-center gap-2 disabled:opacity-50 transition"
                style={{ background: '#1B7A3E' }}>
                {isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Sí, registrar pago
              </button>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  )
}

// ── Detalle de una liquidación pasada ──
function ModalDetalle({ liquidacion, onClose, onVerGuia }) {
  const esConductor = liquidacion.tipo === 'conductor'
  const { data: paquetes = [], isLoading } =
    usePaquetesDeLiquidacion(liquidacion.id, liquidacion.tipo)

  return (
    <Overlay onClose={onClose}>
      <div className="px-7 py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <h2 className="text-lg font-bold text-slate-800">
          {liquidacion.perfiles?.nombre ?? 'Liquidación'}
        </h2>
        <p className="text-[13px] text-slate-500 mt-0.5">
          {fechaLarga(liquidacion.fecha_cierre)}
        </p>
      </div>
      <div className="px-7 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
        <div className="rounded-xl px-6 py-5 text-center" style={{ background: '#E6F4EC' }}>
          <p className="text-[11px] font-semibold tracking-wider mb-1"
            style={{ color: '#1B7A3E' }}>PAGADO</p>
          <p className="text-4xl font-black" style={{ fontFamily: MONO, color: '#1B7A3E' }}>
            {esConductor ? usd(liquidacion.total_usd) : cop(liquidacion.total_cop)}
          </p>
          <p className="text-[12px] text-slate-500 mt-1">
            {esConductor ? 'USD' : 'COP'} · {liquidacion.cantidad_paquetes} paquetes
          </p>
        </div>
        {!esConductor && Number(liquidacion.reembolsos_cop) > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8EDF5' }}>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid #F1F5F9' }}>
              <span className="text-[13px] text-slate-600">Comisión</span>
              <span className="text-[13px] font-bold" style={{ fontFamily: MONO }}>
                {cop(liquidacion.comision_cop)}
              </span>
            </div>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ background: '#FFFBEB' }}>
              <span className="text-[13px] flex items-center gap-2"
                style={{ color: '#92400E' }}>
                <Receipt size={13} /> Devolución de fletes
              </span>
              <span className="text-[13px] font-bold"
                style={{ fontFamily: MONO, color: '#B45309' }}>
                {cop(liquidacion.reembolsos_cop)}
              </span>
            </div>
          </div>
        )}

        {liquidacion.notas && (
          <div className="px-4 py-3 rounded-xl" style={{ background: '#F8FAFC' }}>
            <p className="text-[11px] text-slate-400 mb-1">Notas</p>
            <p className="text-[13px] text-slate-600">{liquidacion.notas}</p>
          </div>
        )}
        <Plegable paquetes={paquetes} isLoading={isLoading} esConductor={esConductor}
          onVerGuia={onVerGuia} />
      </div>
    </Overlay>
  )
}

// ── Lista plegable de paquetes ──
function Plegable({ paquetes, isLoading, esConductor, onVerGuia }) {
  const [abierto, setAbierto] = useState(false)
  const conFlete = paquetes.filter(p => p.cobro_destino).length
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8EDF5' }}>
      <button onClick={() => setAbierto(v => !v)}
        className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#EEF2F8' }}>
          <Package size={16} style={{ color: '#1565C0' }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[13px] font-semibold text-slate-700">
            {paquetes.length} {paquetes.length === 1 ? 'paquete' : 'paquetes'}
          </p>
          <p className="text-[11px] text-slate-400">
            {conFlete > 0
              ? `${conFlete} con cobro a destino · ver el detalle`
              : 'Ver el detalle'}
          </p>
        </div>
        <ChevronDown size={16}
          className={`text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        isLoading ? (
          <div className="py-6 flex justify-center">
            <Loader2 size={18} className="animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50"
            style={{ borderTop: '1px solid #F1F5F9' }}>
            {paquetes.map(p => (
              <div key={p.id}
                className="px-5 py-2.5 flex items-center gap-3"
                style={{ background: p.cobro_destino ? '#FFFBEB' : undefined }}>
                {p.cobro_destino && (
                  <span className="w-1 h-8 rounded-full flex-shrink-0"
                    style={{ background: '#B45309' }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-slate-600 truncate" style={{ fontFamily: MONO }}>
                    {p.tracking_externo ?? p.codigo}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {fecha(esConductor ? p.fecha_entrega : p.fecha_recepcion)}
                    {p.tamanio ? ` · ${p.tamanio}` : ''}
                  </p>
                </div>

                {p.cobro_destino && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[12px] font-bold"
                      style={{ fontFamily: MONO, color: '#B45309' }}>
                      +{cop(p.monto_cobro_destino)}
                    </span>
                    {p.comprobante_cobro_url && onVerGuia && (
                      <button onClick={() => onVerGuia(p.comprobante_cobro_url)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold
                          flex items-center gap-1 transition active:scale-95"
                        style={{ background: '#FEF3C7', color: '#92400E' }}>
                        <FileText size={11} /> Guía
                      </button>
                    )}
                  </div>
                )}

                {esConductor && (
                  <span className="text-[12px] font-bold flex-shrink-0"
                    style={{ fontFamily: MONO, color: '#1B7A3E' }}>
                    +{usd(p.monto_traslado)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// Visor de la guía del flete a pantalla completa
function VisorGuia({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-8"
      style={{ background: 'rgba(0,0,0,0.9)' }} onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center
          justify-center transition active:scale-90"
        style={{ background: 'rgba(255,255,255,0.15)' }}>
        <X size={20} className="text-white" />
      </button>
      <div className="text-center" onClick={e => e.stopPropagation()}>
        <p className="text-white/60 text-[12px] font-semibold tracking-wider mb-3">
          COMPROBANTE DEL FLETE
        </p>
        <img src={src} alt="Guía del flete"
          className="max-w-full max-h-[80vh] object-contain rounded-xl" />
      </div>
    </div>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(13,43,94,0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function Th({ children, align = 'left' }) {
  return (
    <th className="px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400"
      style={{ textAlign: align }}>{children}</th>
  )
}
function Td({ children, align = 'left' }) {
  return <td className="px-6 py-3.5" style={{ textAlign: align }}>{children}</td>
}
