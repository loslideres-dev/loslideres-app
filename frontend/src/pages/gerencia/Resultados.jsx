import { useState } from 'react'
import {
  Lock, LockOpen, Loader2, Check, AlertTriangle,
  ChevronLeft, ChevronRight, Info,
} from 'lucide-react'
import {
  useResultadoMes, useCierres, useCerrarMes, useReabrirMes,
  useDistribuciones,
} from '../../hooks/useContabilidad'
import { useConfig } from '../../hooks/useConfig'
import { useTasasVigentes } from '../../hooks/usePagos'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const usd = n => `$${(Number(n) || 0).toLocaleString('en-US',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const cop = n => `$${(Number(n) || 0).toLocaleString('es-CO',
  { maximumFractionDigits: 0 })}`

export default function Resultados() {
  const hoy = new Date()
  // Arranca en el mes pasado: el mes en curso no se puede cerrar todavía
  const inicial = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  const [anio, setAnio] = useState(inicial.getFullYear())
  const [mes,  setMes]  = useState(inicial.getMonth() + 1)
  const [modalCierre, setModalCierre] = useState(false)
  const [toast, setToast] = useState(null)

  const { data: resultado, isLoading } = useResultadoMes(anio, mes)
  const { data: cierres = [] }         = useCierres()
  const { data: reservaPct }           = useConfig('fondo_reserva_pct')
  const { data: distribuciones = [] }  = useDistribuciones()

  const cierre = cierres.find(c => c.anio === anio && c.mes === mes) ?? null
  const cerrado = !!cierre && cierre.estado === 'cerrado'

  // Un mes solo se puede cerrar cuando ya terminó
  const finDelMes = new Date(anio, mes, 1)
  const mesTerminado = finDelMes <= hoy

  const mover = (delta) => {
    const d = new Date(anio, mes - 1 + delta, 1)
    setAnio(d.getFullYear())
    setMes(d.getMonth() + 1)
  }

  // Las cifras vienen del cierre si está cerrado, del cálculo si está abierto
  const r = cerrado
    ? {
        ingresos_usd:            cierre.ingresos_usd,
        costo_conductores_usd:   cierre.costo_conductores_usd,
        costo_bodegueros_cop:    cierre.costo_bodegueros_cop,
        costo_bodegueros_usd:    cierre.costo_bodegueros_usd,
        gastos_usd:              cierre.gastos_operativos_usd,
        gastos_informativos_usd: 0,
        utilidad_neta_usd:       cierre.utilidad_neta_usd,
        paquetes_entregados:     cierre.paquetes_entregados,
        paquetes_recibidos:      cierre.paquetes_recibidos,
        tasa_cop_usada:          cierre.tasa_cop,
      }
    : resultado

  const pct = cerrado
    ? Number(cierre.porcentaje_reserva)
    : Number(reservaPct ?? 0)
  const utilidad = Number(r?.utilidad_neta_usd ?? 0)
  const reserva  = cerrado ? Number(cierre.reserva_usd)
                           : Math.round(utilidad * pct) / 100
  const distribuible = cerrado ? Number(cierre.distribuible_usd)
                               : utilidad - reserva

  const margen = r && Number(r.ingresos_usd) > 0
    ? (utilidad / Number(r.ingresos_usd)) * 100
    : 0

  const distDelCierre = cierre
    ? distribuciones.filter(d => d.cierre_id === cierre.id)
    : []

  return (
    <GerenciaLayout
      titulo="Resultados"
      descripcion="Estado de resultados y cierre mensual"
      acciones={
        <div className="flex items-center gap-1">
          <button onClick={() => mover(-1)}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center
              justify-center text-slate-500 hover:bg-slate-50 transition">
            <ChevronLeft size={16} />
          </button>
          <div className="px-4 py-1.5 text-center min-w-[150px]">
            <p className="text-[13px] font-bold text-slate-700">
              {MESES[mes - 1]} {anio}
            </p>
            <p className="text-[10px] font-medium"
              style={{ color: cerrado ? '#1B7A3E' : '#B45309' }}>
              {cerrado ? 'Cerrado' : mesTerminado ? 'Abierto' : 'En curso'}
            </p>
          </div>
          <button onClick={() => mover(1)}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center
              justify-center text-slate-500 hover:bg-slate-50 transition">
            <ChevronRight size={16} />
          </button>
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

      {isLoading || !r ? (
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
            rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5 max-w-[1400px] items-start">

          {/* ══ ESTADO DE RESULTADOS ══ */}
          <section className="col-span-2 bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid #E8EDF5' }}>

            <div className="px-7 py-5 flex items-center justify-between"
              style={{ borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <h2 className="text-[13px] font-bold tracking-wider text-slate-400">
                  ESTADO DE RESULTADOS
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {r.paquetes_entregados} entregas · {r.paquetes_recibidos} recepciones
                </p>
              </div>
              {cerrado && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: '#E6F4EC' }}>
                  <Lock size={13} style={{ color: '#1B7A3E' }} />
                  <span className="text-[11px] font-bold" style={{ color: '#1B7A3E' }}>
                    CIFRAS CONGELADAS
                  </span>
                </div>
              )}
            </div>

            <div className="px-7 py-6">
              <Linea etiqueta="Ingresos" nota="cobrado a clientes"
                valor={usd(r.ingresos_usd)} color="#1B7A3E" fuerte />

              <div className="my-4 space-y-1">
                <p className="text-[11px] font-bold tracking-wider text-slate-400 mb-2">
                  COSTOS DIRECTOS
                </p>
                <Linea etiqueta="Traslados a conductores"
                  nota={`${r.paquetes_entregados} entregas`}
                  valor={`− ${usd(r.costo_conductores_usd)}`} color="#DC2626" />
                <Linea etiqueta="Comisiones a bodegueros"
                  nota={`${cop(r.costo_bodegueros_cop)} COP a ${Number(r.tasa_cop_usada || 0).toLocaleString('es-CO')}`}
                  valor={`− ${usd(r.costo_bodegueros_usd)}`} color="#DC2626" />
              </div>

              <div className="my-4">
                <p className="text-[11px] font-bold tracking-wider text-slate-400 mb-2">
                  GASTOS OPERATIVOS
                </p>
                <Linea etiqueta="Gastos del negocio"
                  nota="hosting, empaque, comisiones bancarias"
                  valor={`− ${usd(r.gastos_usd)}`} color="#DC2626" />
              </div>

              {/* Utilidad */}
              <div className="mt-6 pt-5 flex items-end justify-between"
                style={{ borderTop: '2px solid #E8EDF5' }}>
                <div>
                  <p className="text-base font-bold text-slate-800">Utilidad neta</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    margen {margen.toFixed(1)}%
                  </p>
                </div>
                <p className="text-[38px] font-black leading-none tracking-tight"
                  style={{
                    fontFamily: MONO,
                    color: utilidad >= 0 ? '#1B7A3E' : '#DC2626',
                  }}>
                  {usd(utilidad)}
                </p>
              </div>

              {/* Nota sobre lo que no entra */}
              <div className="mt-5 px-4 py-3 rounded-xl flex gap-3"
                style={{ background: '#F8FAFC' }}>
                <Info size={15} className="flex-shrink-0 mt-0.5"
                  style={{ color: '#94A3B8' }} />
                <p className="text-[12px] text-slate-500 leading-relaxed">
                  No entran aquí los vehículos ni su combustible, que absorbe
                  Administración con su participación, ni el desarrollo del
                  sistema, que absorbe José con la suya.
                  {Number(r.gastos_informativos_usd) > 0 && (
                    <> Este mes hay {usd(r.gastos_informativos_usd)} registrados
                    como gasto informativo, que no reducen el reparto.</>
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* ══ REPARTO ══ */}
          <div className="space-y-5">

            <section className="bg-white rounded-2xl p-6"
              style={{ border: '1px solid #E8EDF5' }}>
              <h2 className="text-[13px] font-bold tracking-wider text-slate-400 mb-5">
                REPARTO
              </h2>

              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[13px] text-slate-600">Fondo de reserva</p>
                    <p className="text-[11px] text-slate-400">
                      {pct > 0 ? `${pct}% de la utilidad` : 'desactivado'}
                    </p>
                  </div>
                  <p className="text-lg font-bold"
                    style={{ fontFamily: MONO, color: pct > 0 ? '#B45309' : '#CBD5E1' }}>
                    {usd(reserva)}
                  </p>
                </div>

                <div className="pt-4 flex items-baseline justify-between"
                  style={{ borderTop: '1px solid #F1F5F9' }}>
                  <p className="text-[13px] font-semibold text-slate-700">
                    A repartir
                  </p>
                  <p className="text-2xl font-black"
                    style={{ fontFamily: MONO, color: '#1565C0' }}>
                    {usd(distribuible)}
                  </p>
                </div>
              </div>

              {/* Distribución ya calculada */}
              {distDelCierre.length > 0 && (
                <div className="mt-5 pt-5 space-y-2.5"
                  style={{ borderTop: '1px solid #F1F5F9' }}>
                  {distDelCierre.map(d => (
                    <div key={d.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-slate-600">
                          {d.socios?.nombre}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: '#EEF2F8', color: '#1565C0' }}>
                          {Math.round(Number(d.participacion_aplicada) * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold"
                          style={{ fontFamily: MONO }}>
                          {usd(d.monto_usd)}
                        </span>
                        {d.estado === 'pagada' && (
                          <Check size={13} style={{ color: '#1B7A3E' }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Acción de cierre */}
            <section className="bg-white rounded-2xl p-6"
              style={{ border: '1px solid #E8EDF5' }}>
              {cerrado ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Lock size={15} style={{ color: '#1B7A3E' }} />
                    <p className="text-sm font-bold text-slate-800">Mes cerrado</p>
                  </div>
                  <p className="text-[12px] text-slate-500 leading-relaxed mb-4">
                    Cerrado el{' '}
                    {new Date(cierre.cerrado_en).toLocaleDateString('es-VE', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}. Las cifras no cambian aunque se registren gastos nuevos.
                  </p>
                  {cierre.notas && (
                    <p className="text-[12px] text-slate-600 px-3 py-2 rounded-lg mb-4"
                      style={{ background: '#F8FAFC' }}>
                      {cierre.notas}
                    </p>
                  )}
                  <BotonReabrir cierre={cierre} onToast={setToast} />
                </>
              ) : !mesTerminado ? (
                <>
                  <p className="text-sm font-bold text-slate-800 mb-1">Mes en curso</p>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Este mes todavía no termina. Las cifras se actualizan con cada
                    entrega y cada gasto que registres.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-800 mb-1">
                    Listo para cerrar
                  </p>
                  <p className="text-[12px] text-slate-500 leading-relaxed mb-4">
                    Al cerrar se congelan las cifras y se calcula el reparto entre
                    socios. Un gasto que aparezca después entra en el mes siguiente.
                  </p>
                  <button onClick={() => setModalCierre(true)}
                    className="w-full py-3 rounded-xl text-white text-[13px] font-semibold
                      flex items-center justify-center gap-2 transition active:scale-[0.98]"
                    style={{ background: '#0D2B5E' }}>
                    <Lock size={15} /> Cerrar {MESES[mes - 1]}
                  </button>
                </>
              )}
            </section>
          </div>
        </div>
      )}

      {modalCierre && (
        <ModalCerrar
          anio={anio} mes={mes} resultado={r} reservaPct={pct}
          onClose={() => setModalCierre(false)}
          onToast={setToast}
        />
      )}
    </GerenciaLayout>
  )
}

// ── Línea del estado de resultados ──
function Linea({ etiqueta, nota, valor, color, fuerte }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <div>
        <p className={`${fuerte ? 'text-sm font-semibold text-slate-700' : 'text-[13px] text-slate-600'}`}>
          {etiqueta}
        </p>
        {nota && <p className="text-[11px] text-slate-400 mt-0.5">{nota}</p>}
      </div>
      <p className={`${fuerte ? 'text-xl' : 'text-base'} font-bold`}
        style={{ fontFamily: MONO, color }}>
        {valor}
      </p>
    </div>
  )
}

// ── Modal de confirmación de cierre ──
function ModalCerrar({ anio, mes, resultado, reservaPct, onClose, onToast }) {
  const { data: tasas = {} } = useTasasVigentes()
  const { mutateAsync: cerrar, isPending } = useCerrarMes()

  const tasaSugerida = tasas.COP?.valor_por_usd ?? ''
  const [tasaCop, setTasaCop] = useState(String(tasaSugerida || ''))
  const [notas, setNotas]     = useState('')

  const utilidad = Number(resultado?.utilidad_neta_usd ?? 0)
  const reserva  = Math.round(utilidad * reservaPct) / 100

  const handleCerrar = async () => {
    const tasa = parseFloat(tasaCop)
    if (!tasa || tasa <= 0) {
      onToast({ tipo: 'error', msg: 'Hay que registrar la tasa COP/USD del cierre' })
      return
    }
    try {
      await cerrar({
        anio, mes,
        tasaCop: tasa,
        tasaVes: tasas.VES?.valor_por_usd ?? null,
        notas: notas.trim() || null,
      })
      onToast({ tipo: 'ok', msg: `${MESES[mes - 1]} ${anio} quedó cerrado` })
      onClose()
    } catch (e) {
      onToast({ tipo: 'error', msg: e.message ?? 'No se pudo cerrar el mes' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(13,43,94,0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}>

        <div className="px-7 py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <h2 className="text-lg font-bold text-slate-800">
            Cerrar {MESES[mes - 1]} {anio}
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Las cifras quedan congeladas y se calcula el reparto
          </p>
        </div>

        <div className="px-7 py-6 space-y-5">
          {/* Tasa */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Tasa COP/USD del cierre
            </label>
            <div className="relative">
              <input type="number" inputMode="decimal" autoFocus
                value={tasaCop} onChange={e => setTasaCop(e.target.value)}
                className="w-full px-4 py-3 pr-24 rounded-xl border border-slate-200
                  text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontFamily: MONO }} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2
                text-[11px] text-slate-400">COP = 1 USD</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Con esta tasa se convierten las comisiones de los bodegueros.
              Queda guardada en el cierre y no se recalcula después.
            </p>
          </div>

          {/* Resumen */}
          <div className="rounded-xl px-5 py-4 space-y-2"
            style={{ background: '#F8FAFC' }}>
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-500">Utilidad neta</span>
              <span className="font-bold" style={{ fontFamily: MONO }}>
                {usd(utilidad)}
              </span>
            </div>
            {reservaPct > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-500">
                  Al fondo de reserva ({reservaPct}%)
                </span>
                <span className="font-bold" style={{ fontFamily: MONO, color: '#B45309' }}>
                  − {usd(reserva)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 text-sm"
              style={{ borderTop: '1px solid #E8EDF5' }}>
              <span className="font-semibold text-slate-700">A repartir</span>
              <span className="font-black" style={{ fontFamily: MONO, color: '#1565C0' }}>
                {usd(utilidad - reserva)}
              </span>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Notas <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea rows={2} value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Algo que recordar sobre este mes"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px]
                outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={isPending}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600
                text-[13px] font-semibold hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button onClick={handleCerrar} disabled={isPending || !tasaCop}
              className="flex-[2] py-3 rounded-xl text-white text-[13px] font-semibold
                flex items-center justify-center gap-2 disabled:opacity-50
                transition active:scale-[0.98]"
              style={{ background: '#0D2B5E' }}>
              {isPending
                ? <Loader2 size={15} className="animate-spin" />
                : <Lock size={15} />}
              Cerrar el mes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reabrir un mes cerrado ──
function BotonReabrir({ cierre, onToast }) {
  const [confirmando, setConfirmando] = useState(false)
  const { mutateAsync: reabrir, isPending } = useReabrirMes()

  const handleReabrir = async () => {
    try {
      await reabrir(cierre.id)
      onToast({ tipo: 'ok', msg: 'El mes quedó abierto de nuevo' })
      setConfirmando(false)
    } catch (e) {
      onToast({ tipo: 'error', msg: e.message ?? 'No se pudo reabrir el mes' })
    }
  }

  if (!confirmando) {
    return (
      <button onClick={() => setConfirmando(true)}
        className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500
          text-[12px] font-semibold flex items-center justify-center gap-2
          hover:bg-slate-50 transition">
        <LockOpen size={14} /> Reabrir el mes
      </button>
    )
  }

  return (
    <div className="rounded-xl p-4" style={{ background: '#FFFBEB' }}>
      <div className="flex gap-2.5 mb-3">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5"
          style={{ color: '#B45309' }} />
        <p className="text-[12px] leading-relaxed" style={{ color: '#92400E' }}>
          Se borra el cierre y su reparto entre socios. Si ya pagaste según esas
          cifras, reabrir puede dejar el registro inconsistente.
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setConfirmando(false)} disabled={isPending}
          className="flex-1 py-2 rounded-lg bg-white border border-slate-200
            text-slate-600 text-[12px] font-semibold">
          Cancelar
        </button>
        <button onClick={handleReabrir} disabled={isPending}
          className="flex-1 py-2 rounded-lg text-white text-[12px] font-semibold
            flex items-center justify-center gap-1.5"
          style={{ background: '#B45309' }}>
          {isPending && <Loader2 size={13} className="animate-spin" />}
          Reabrir
        </button>
      </div>
    </div>
  )
}
