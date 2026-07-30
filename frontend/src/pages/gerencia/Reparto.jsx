import { useState } from 'react'
import {
  Handshake, Check, Loader2, Plus, AlertTriangle, Wallet, Calendar,
} from 'lucide-react'
import {
  useSocios, useGuardarSocio, useDistribuciones,
  useMarcarDistribucionPagada, useCierres,
} from '../../hooks/useContabilidad'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const usd = n => `$${(Number(n) || 0).toLocaleString('en-US',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Reparto() {
  const [toast, setToast]   = useState(null)
  const [pagando, setPagando] = useState(null)

  const { data: socios = [], isLoading }  = useSocios()
  const { data: distribuciones = [] }     = useDistribuciones()
  const { data: cierres = [] }            = useCierres()

  const sumaParticipacion = socios
    .filter(s => s.activo)
    .reduce((s, x) => s + Number(x.participacion), 0)

  // Acumulado histórico por socio
  const acumulado = {}
  for (const d of distribuciones) {
    const k = d.socio_id
    acumulado[k] = acumulado[k] ?? { calculado: 0, pagado: 0, pendiente: 0 }
    const monto = Number(d.monto_usd) || 0
    acumulado[k].calculado += monto
    if (d.estado === 'pagada') acumulado[k].pagado += monto
    else                       acumulado[k].pendiente += monto
  }

  const totalPendiente = distribuciones
    .filter(d => d.estado !== 'pagada')
    .reduce((s, d) => s + (Number(d.monto_usd) || 0), 0)

  return (
    <GerenciaLayout
      titulo="Reparto entre socios"
      descripcion="Participación, utilidad distribuida y retiros"
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

      {isLoading ? (
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
            rounded-full animate-spin" />
        </div>
      ) : socios.length === 0 ? (
        <SinSocios onToast={setToast} />
      ) : (
        <div className="space-y-5 max-w-[1400px]">

          {/* ══ SOCIOS ══ */}
          <section className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(socios.length + 1, 4)}, minmax(0, 1fr))` }}>
            {socios.map(s => {
              const a = acumulado[s.id] ?? { calculado: 0, pagado: 0, pendiente: 0 }
              return (
                <div key={s.id} className="bg-white rounded-2xl p-6"
                  style={{ border: '1px solid #E8EDF5' }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center
                      text-white text-sm font-black flex-shrink-0"
                      style={{ background: '#1565C0' }}>
                      {s.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {s.nombre}
                      </p>
                      <p className="text-[28px] font-black leading-none mt-0.5"
                        style={{ fontFamily: MONO, color: '#1565C0' }}>
                        {Math.round(Number(s.participacion) * 100)}
                        <span className="text-sm">%</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-4" style={{ borderTop: '1px solid #F1F5F9' }}>
                    <Fila etiqueta="Le corresponde" valor={usd(a.calculado)} />
                    <Fila etiqueta="Ya retiró" valor={usd(a.pagado)} color="#1B7A3E" />
                    <Fila etiqueta="Por retirar" valor={usd(a.pendiente)}
                      color={a.pendiente > 0 ? '#B45309' : '#CBD5E1'} fuerte />
                  </div>
                </div>
              )
            })}

            {/* Resumen */}
            <div className="rounded-2xl p-6 text-white" style={{ background: '#0D2B5E' }}>
              <Wallet size={20} className="mb-4 opacity-70" />
              <p className="text-[11px] font-semibold tracking-wider opacity-70 mb-1">
                POR REPARTIR
              </p>
              <p className="text-[32px] font-black leading-none"
                style={{ fontFamily: MONO }}>
                {usd(totalPendiente)}
              </p>
              <p className="text-[12px] opacity-60 mt-3">
                {cierres.filter(c => c.estado === 'cerrado').length} meses cerrados
              </p>
              {Math.abs(sumaParticipacion - 1) > 0.001 && (
                <div className="mt-4 px-3 py-2 rounded-lg flex gap-2"
                  style={{ background: 'rgba(180,83,9,0.25)' }}>
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-snug">
                    Las participaciones suman{' '}
                    {(sumaParticipacion * 100).toFixed(1)}%, no 100%
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ══ DISTRIBUCIONES POR MES ══ */}
          <section className="bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid #E8EDF5' }}>
            <div className="px-7 py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
              <h2 className="text-[13px] font-bold tracking-wider text-slate-400">
                REPARTOS POR MES
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Se calculan solos al cerrar cada mes
              </p>
            </div>

            {distribuciones.length === 0 ? (
              <div className="px-7 py-16 text-center">
                <Calendar size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">
                  Todavía no hay repartos
                </p>
                <p className="text-[13px] text-slate-400 mt-1">
                  Cierra un mes en Resultados y el reparto aparece aquí
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#FAFBFD' }}>
                    <Th>Periodo</Th>
                    <Th>Socio</Th>
                    <Th align="center">Participación</Th>
                    <Th align="right">Monto</Th>
                    <Th align="center">Estado</Th>
                    <Th align="right"></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {distribuciones.map(d => {
                    const c = d.cierres_mensuales
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/60 transition">
                        <Td>
                          <span className="text-[13px] font-medium text-slate-700">
                            {c ? `${MESES[c.mes - 1]} ${c.anio}` : '—'}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-[13px] text-slate-600">
                            {d.socios?.nombre ?? '—'}
                          </span>
                        </Td>
                        <Td align="center">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#EEF2F8', color: '#1565C0' }}>
                            {Math.round(Number(d.participacion_aplicada) * 100)}%
                          </span>
                        </Td>
                        <Td align="right">
                          <span className="text-[14px] font-bold"
                            style={{ fontFamily: MONO }}>
                            {usd(d.monto_usd)}
                          </span>
                        </Td>
                        <Td align="center">
                          {d.estado === 'pagada' ? (
                            <span className="inline-flex items-center gap-1 text-[11px]
                              font-bold px-2 py-1 rounded-full"
                              style={{ background: '#E6F4EC', color: '#1B7A3E' }}>
                              <Check size={11} /> Retirado
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2 py-1 rounded-full"
                              style={{ background: '#FEF3C7', color: '#B45309' }}>
                              Pendiente
                            </span>
                          )}
                        </Td>
                        <Td align="right">
                          {d.estado !== 'pagada' && (
                            <button onClick={() => setPagando(d)}
                              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg
                                transition hover:bg-slate-100"
                              style={{ color: '#1565C0' }}>
                              Marcar retirado
                            </button>
                          )}
                          {d.estado === 'pagada' && d.fecha_pago && (
                            <span className="text-[11px] text-slate-400">
                              {new Date(d.fecha_pago).toLocaleDateString('es-VE', {
                                day: 'numeric', month: 'short',
                              })}
                            </span>
                          )}
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {pagando && (
        <ModalPagar distribucion={pagando}
          onClose={() => setPagando(null)} onToast={setToast} />
      )}
    </GerenciaLayout>
  )
}

// ── Configuración inicial de socios ──
function SinSocios({ onToast }) {
  const { mutateAsync: guardar, isPending } = useGuardarSocio()
  const [filas, setFilas] = useState([
    { nombre: 'Iván', pct: '70' },
    { nombre: 'José', pct: '30' },
  ])

  const suma = filas.reduce((s, f) => s + (parseFloat(f.pct) || 0), 0)

  const handleGuardar = async () => {
    if (Math.abs(suma - 100) > 0.01) {
      onToast({ tipo: 'error', msg: 'Las participaciones deben sumar 100%' })
      return
    }
    try {
      for (const f of filas) {
        if (!f.nombre.trim()) continue
        await guardar({
          nombre: f.nombre.trim(),
          participacion: parseFloat(f.pct) / 100,
          vigente_desde: new Date().toISOString().slice(0, 10),
          activo: true,
        })
      }
      onToast({ tipo: 'ok', msg: 'Socios configurados' })
    } catch {
      onToast({ tipo: 'error', msg: 'No se pudieron guardar los socios' })
    }
  }

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-2xl p-8" style={{ border: '1px solid #E8EDF5' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
          style={{ background: '#EEF2F8' }}>
          <Handshake size={22} style={{ color: '#1565C0' }} />
        </div>

        <h2 className="text-lg font-bold text-slate-800 mb-1">
          Configura la participación
        </h2>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
          Cómo se reparte la utilidad distribuible de cada mes cerrado. Queda
          con fecha de vigencia: si algún día se renegocia, los meses anteriores
          conservan el porcentaje con que se calcularon.
        </p>

        <div className="space-y-3 mb-5">
          {filas.map((f, i) => (
            <div key={i} className="flex gap-3">
              <input type="text" value={f.nombre}
                onChange={e => setFilas(fs =>
                  fs.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                placeholder="Nombre del socio"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200
                  text-[13px] outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="relative w-28">
                <input type="number" value={f.pct}
                  onChange={e => setFilas(fs =>
                    fs.map((x, j) => j === i ? { ...x, pct: e.target.value } : x))}
                  className="w-full px-4 py-2.5 pr-8 rounded-xl border border-slate-200
                    text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontFamily: MONO }} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2
                  text-slate-400 text-[13px]">%</span>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setFilas(fs => [...fs, { nombre: '', pct: '' }])}
          className="text-[12px] font-semibold flex items-center gap-1.5 mb-5
            transition hover:opacity-70" style={{ color: '#1565C0' }}>
          <Plus size={14} /> Agregar otro socio
        </button>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-5"
          style={{ background: Math.abs(suma - 100) < 0.01 ? '#E6F4EC' : '#FEF3C7' }}>
          <span className="text-[13px] font-medium"
            style={{ color: Math.abs(suma - 100) < 0.01 ? '#166534' : '#92400E' }}>
            Suma de participaciones
          </span>
          <span className="text-base font-black"
            style={{
              fontFamily: MONO,
              color: Math.abs(suma - 100) < 0.01 ? '#1B7A3E' : '#B45309',
            }}>
            {suma.toFixed(1)}%
          </span>
        </div>

        <button onClick={handleGuardar} disabled={isPending}
          className="w-full py-3 rounded-xl text-white text-[13px] font-semibold
            flex items-center justify-center gap-2 disabled:opacity-50 transition"
          style={{ background: '#0D2B5E' }}>
          {isPending
            ? <Loader2 size={15} className="animate-spin" />
            : <Check size={15} />}
          Guardar participaciones
        </button>
      </div>
    </div>
  )
}

// ── Modal de retiro ──
function ModalPagar({ distribucion, onClose, onToast }) {
  const [metodo, setMetodo] = useState('')
  const [notas, setNotas]   = useState('')
  const { mutateAsync: marcar, isPending } = useMarcarDistribucionPagada()

  const c = distribucion.cierres_mensuales

  const handleMarcar = async () => {
    try {
      await marcar({
        id: distribucion.id,
        metodo_pago: metodo.trim() || null,
        notas: notas.trim() || null,
      })
      onToast({ tipo: 'ok', msg: 'Retiro registrado' })
      onClose()
    } catch {
      onToast({ tipo: 'error', msg: 'No se pudo registrar el retiro' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(13,43,94,0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}>

        <div className="px-7 py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <h2 className="text-lg font-bold text-slate-800">Registrar retiro</h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {distribucion.socios?.nombre}
            {c ? ` · ${MESES[c.mes - 1]} ${c.anio}` : ''}
          </p>
        </div>

        <div className="px-7 py-6 space-y-5">
          <div className="rounded-xl px-5 py-4 text-center" style={{ background: '#F8FAFC' }}>
            <p className="text-[11px] text-slate-400 mb-1">MONTO</p>
            <p className="text-3xl font-black"
              style={{ fontFamily: MONO, color: '#1565C0' }}>
              {usd(distribucion.monto_usd)}
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Cómo se pagó <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input type="text" value={metodo} autoFocus
              onChange={e => setMetodo(e.target.value)}
              placeholder="Efectivo, Zelle, transferencia..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px]
                outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Notas <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea rows={2} value={notas}
              onChange={e => setNotas(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px]
                outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} disabled={isPending}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600
                text-[13px] font-semibold hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button onClick={handleMarcar} disabled={isPending}
              className="flex-[2] py-3 rounded-xl text-white text-[13px] font-semibold
                flex items-center justify-center gap-2 disabled:opacity-50 transition"
              style={{ background: '#1B7A3E' }}>
              {isPending
                ? <Loader2 size={15} className="animate-spin" />
                : <Check size={15} />}
              Confirmar retiro
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Auxiliares de tabla ──
function Th({ children, align = 'left' }) {
  return (
    <th className="px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400"
      style={{ textAlign: align }}>
      {children}
    </th>
  )
}
function Td({ children, align = 'left' }) {
  return <td className="px-6 py-3.5" style={{ textAlign: align }}>{children}</td>
}
function Fila({ etiqueta, valor, color, fuerte }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[12px] text-slate-500">{etiqueta}</span>
      <span className={`${fuerte ? 'text-base' : 'text-[13px]'} font-bold`}
        style={{ fontFamily: MONO, color: color ?? '#334155' }}>
        {valor}
      </span>
    </div>
  )
}
