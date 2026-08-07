import { useState, useMemo } from 'react'
import {
  Search, X, PackagePlus, MessageCircle, Trash2, Clock, Check, Percent,
  AlertTriangle, Package, Calendar, Store,
} from 'lucide-react'
import {
  usePrealertasGerencia, useDescartarPrealerta,
  ESTADO_PREALERTA, DIAS_SIN_LLEGAR,
} from '../../hooks/usePrealertas'
import { fechaCorta, fechaHora, tiempoRelativoCorto } from '../../lib/fechas'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'

/**
 * Días que suele tardar un paquete desde que el cliente avisa hasta que
 * se entrega en Maracaibo.
 *
 * ⚠️ ESTE NÚMERO ES UNA ESTIMACIÓN, NO UN DATO MEDIDO.
 * No hay historial suficiente para calcularlo: hacen falta pre-alertas
 * cerradas para sacar una mediana real. Cuando las haya, esto debe salir
 * de los datos y no de aquí.
 */
const DIAS_ESTIMADOS_LLEGADA = 15

const FILTROS = [
  { label: 'Pendientes', value: 'PENDIENTE' },
  { label: 'Recibidas',  value: 'RECIBIDA' },
  { label: 'Cerradas',   value: 'cerradas' },
  { label: 'Todas',      value: null },
]

// El cliente pega las guías como le llegan: separadas por coma, por espacio
// o por salto de línea. Se normalizan para poder contarlas y listarlas.
function separarGuias(tracking) {
  if (!tracking) return []
  return tracking
    .split(/[\s,;]+/)
    .map(g => g.trim())
    .filter(Boolean)
}

function sumarDias(iso, dias) {
  if (!iso) return null
  const d = new Date(iso)
  d.setDate(d.getDate() + dias)
  return d.toISOString()
}

function urlContacto(p) {
  const tel = (p.cliente_telefono ?? '').replace(/\D/g, '')
  if (!tel) return null
  const texto =
    `Hola ${p.cliente_nombre ?? ''}, te escribimos de Los Líderes Encomiendas. `
    + `Hace ${p.dias} días nos avisaste de un envío de ${p.tienda} `
    + `(${p.descripcion}) y todavía no ha llegado a nuestra bodega. `
    + `¿Sigue en camino o lo enviaste por otra vía?`
  return `https://wa.me/${tel}?text=${encodeURIComponent(texto.trim())}`
}

export default function PreAlertasGer() {
  const [filtro,  setFiltro]  = useState('PENDIENTE')
  const [busca,   setBusca]   = useState('')
  const [detalle, setDetalle] = useState(null)
  const [porDescartar, setPorDescartar] = useState(null)

  const { data, isLoading } = usePrealertasGerencia()
  const descartar = useDescartarPrealerta()
  const m = data ?? {}

  const todas = useMemo(() => data?.filas ?? [], [data])

  const filas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    let lista = todas
    if (filtro === 'cerradas')  lista = lista.filter(p => p.estado !== 'PENDIENTE')
    else if (filtro)            lista = lista.filter(p => p.estado === filtro)
    if (q) {
      lista = lista.filter(p =>
        p.cliente_nombre?.toLowerCase().includes(q) ||
        p.cliente_codigo?.toLowerCase().includes(q) ||
        p.tienda?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q) ||
        p.tracking?.toLowerCase().includes(q))
    }
    return lista
  }, [todas, filtro, busca])

  const confirmarDescarte = async () => {
    try {
      await descartar.mutateAsync({ id: porDescartar.id })
      setDetalle(null)
    } finally {
      setPorDescartar(null)
    }
  }

  return (
    <GerenciaLayout
      titulo="Paquetes avisados"
      descripcion={`${filas.length} de ${todas.length} avisos`}
    >
      <div className="max-w-[1400px] space-y-5">

        <div className="grid grid-cols-4 gap-4">
          <Tarjeta icono={Clock} etiqueta="Esperando" color="#B45309"
            valor={isLoading ? '—' : m.totalPendientes ?? 0}
            detalle="Avisados y todavía sin llegar" />
          <Tarjeta icono={AlertTriangle} etiqueta={`Más de ${DIAS_SIN_LLEGAR} días`}
            color={(m.atrasadas ?? 0) > 0 ? '#991B1B' : '#64748B'}
            valor={isLoading ? '—' : m.atrasadas ?? 0}
            detalle="Requieren contactar o descartar" />
          <Tarjeta icono={Check} etiqueta="Recibidos" color="#1B7A3E"
            valor={isLoading ? '—' : m.recibidas ?? 0}
            detalle="Avisados que sí llegaron" />
          <Tarjeta icono={Percent} etiqueta="Tasa de llegada" color="#1565C0"
            valor={isLoading || m.tasaLlegada == null ? '—' : `${Math.round(m.tasaLlegada)}%`}
            detalle="De lo avisado y ya cerrado" />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F1F5F9' }}>
            {FILTROS.map(f => (
              <button key={f.label} onClick={() => setFiltro(f.value)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition"
                style={{
                  background: filtro === f.value ? '#FFFFFF' : 'transparent',
                  color:      filtro === f.value ? '#0D2B5E' : '#94A3B8',
                  boxShadow:  filtro === f.value ? '0 1px 3px rgba(13,43,94,0.08)' : 'none',
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por cliente, casillero, tienda o guía"
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-200
                text-[13px] outline-none focus:ring-2 focus:ring-blue-500" />
            {busca && (
              <button onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── Tabla: solo resumen. El detalle completo va en el modal, porque
            el cliente pega guías de largo impredecible y reventaba la vista. ── */}
        <section className="bg-white rounded-2xl overflow-hidden"
          style={{ border: '1px solid #E8EDF5' }}>
          {isLoading ? (
            <div className="py-24 flex justify-center">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
                rounded-full animate-spin" />
            </div>
          ) : filas.length === 0 ? (
            <div className="py-24 text-center">
              <PackagePlus size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Sin avisos aquí</p>
            </div>
          ) : (
            <table className="w-full table-fixed">
              <thead>
                <tr style={{ background: '#FAFBFD' }}>
                  <Th ancho="24%">Cliente</Th>
                  <Th ancho="26%">Qué avisó</Th>
                  <Th ancho="11%" align="center">Guías</Th>
                  <Th ancho="13%" align="center">Avisado</Th>
                  <Th ancho="13%" align="center">Llegada</Th>
                  <Th ancho="13%" align="center">Estado</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filas.map(p => {
                  const est    = ESTADO_PREALERTA[p.estado] ?? ESTADO_PREALERTA.PENDIENTE
                  const guias  = separarGuias(p.tracking)
                  const estimada = sumarDias(p.created_at, DIAS_ESTIMADOS_LLEGADA)
                  return (
                    <tr key={p.id} onClick={() => setDetalle(p)}
                      className="hover:bg-slate-50 transition cursor-pointer"
                      style={p.atrasada ? { background: '#FFFBF5' } : {}}>

                      <Td>
                        <p className="text-[13px] font-semibold text-slate-700 truncate">
                          {p.cliente_nombre ?? '—'}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400" style={{ fontFamily: MONO }}>
                            {p.cliente_codigo ?? '—'}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: '#EEF2F8', color: '#1565C0' }}>
                            {p.tienda}
                          </span>
                        </div>
                      </Td>

                      <Td>
                        <p className="text-[12px] text-slate-600 truncate" title={p.descripcion}>
                          {p.descripcion}
                        </p>
                      </Td>

                      <Td align="center">
                        {guias.length === 0 ? (
                          <span className="text-[11px] text-slate-300">Sin guía</span>
                        ) : guias.length === 1 ? (
                          <span className="text-[11px] text-slate-500 truncate block"
                            style={{ fontFamily: MONO }}>
                            {guias[0]}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#EEF2F8', color: '#1565C0' }}>
                            {guias.length} guías
                          </span>
                        )}
                      </Td>

                      <Td align="center">
                        <span className="text-[12px] text-slate-600">
                          {fechaCorta(p.created_at)}
                        </span>
                        <p className="text-[10px]"
                          style={{ color: p.atrasada ? '#991B1B' : '#94A3B8' }}>
                          hace {tiempoRelativoCorto(p.created_at)}
                        </p>
                      </Td>

                      <Td align="center">
                        {p.estado === 'RECIBIDA' ? (
                          <>
                            <span className="text-[12px] font-medium" style={{ color: '#1B7A3E' }}>
                              {fechaCorta(p.updated_at)}
                            </span>
                            <p className="text-[10px] text-slate-400">llegó</p>
                          </>
                        ) : p.estado === 'PENDIENTE' ? (
                          <>
                            <span className="text-[12px] text-slate-500">
                              ~{fechaCorta(estimada)}
                            </span>
                            <p className="text-[10px] text-slate-400">estimado</p>
                          </>
                        ) : (
                          <span className="text-[12px] text-slate-300">—</span>
                        )}
                      </Td>

                      <Td align="center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: est.bg, color: est.color }}>
                          {est.label}
                        </span>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        <p className="text-[11px] text-slate-400 leading-relaxed max-w-3xl">
          Toca una fila para ver el detalle completo. Un aviso se marca como
          atrasado a los {DIAS_SIN_LLEGAR} días sin llegar. La fecha de llegada
          es una estimación de {DIAS_ESTIMADOS_LLEGADA} días desde el aviso, no
          un compromiso. Descartar no borra: queda como <strong>No llegó</strong>,
          distinto de si el cliente lo hubiera cancelado.
        </p>
      </div>

      {/* ════════ DETALLE ════════ */}
      {detalle && (
        <ModalDetalle
          p={detalle}
          onCerrar={() => setDetalle(null)}
          onDescartar={() => setPorDescartar(detalle)}
        />
      )}

      {/* ════════ CONFIRMAR DESCARTE ════════ */}
      {porDescartar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: 'rgba(13,43,94,0.45)' }}
          onClick={() => setPorDescartar(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-800 mb-2">
              ¿Descartar este aviso?
            </h2>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-5">
              {porDescartar.cliente_nombre} avisó hace {porDescartar.dias} días un
              envío de {porDescartar.tienda}. Quedará marcado como "No llegó" y el
              cliente lo verá así.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPorDescartar(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600
                  text-[13px] font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={confirmarDescarte} disabled={descartar.isPending}
                className="flex-1 py-3 rounded-xl text-white text-[13px] font-semibold
                  transition disabled:opacity-50"
                style={{ background: '#991B1B' }}>
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </GerenciaLayout>
  )
}

// ── Modal de detalle ────────────────────────────────────────────────────────
function ModalDetalle({ p, onCerrar, onDescartar }) {
  const est      = ESTADO_PREALERTA[p.estado] ?? ESTADO_PREALERTA.PENDIENTE
  const guias    = separarGuias(p.tracking)
  const estimada = sumarDias(p.created_at, DIAS_ESTIMADOS_LLEGADA)
  const wa       = urlContacto(p)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(13,43,94,0.45)' }} onClick={onCerrar}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: est.bg, color: est.color }}>
                {est.label}
              </span>
              {p.atrasada && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#FEE2E2', color: '#991B1B' }}>
                  {p.dias} días sin llegar
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-800 truncate">
              {p.cliente_nombre}
            </h2>
            <p className="text-[12px] text-slate-400" style={{ fontFamily: MONO }}>
              {p.cliente_codigo}
              {p.cliente_telefono && <span className="ml-2">{p.cliente_telefono}</span>}
            </p>
          </div>
          <button onClick={onCerrar}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center
              text-slate-500 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">

          <Campo icono={Store} label="Tienda" valor={p.tienda} />

          <Campo icono={Package} label="Qué avisó">
            <p className="text-[13px] text-slate-700 leading-relaxed break-words">
              {p.descripcion}
            </p>
          </Campo>

          {/* Una guía por línea: el bodeguero las coteja de a una contra
              las cajas, y en una sola línea corrida es imposible. */}
          <Campo icono={Package}
            label={guias.length === 1 ? 'Guía' : `Guías (${guias.length})`}>
            {guias.length === 0 ? (
              <p className="text-[13px] text-slate-400">Sin número de guía</p>
            ) : (
              <div className="space-y-1">
                {guias.map((g, i) => (
                  <div key={i} className="rounded-lg px-3 py-2 flex items-center gap-2"
                    style={{ background: '#F1F5F9' }}>
                    <span className="text-[10px] text-slate-400 w-4 flex-shrink-0"
                      style={{ fontFamily: MONO }}>
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-bold break-all"
                      style={{ fontFamily: MONO, color: '#0D2B5E', letterSpacing: 0.5 }}>
                      {g}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo icono={Calendar} label="Avisado">
              <p className="text-[13px] font-semibold text-slate-700">
                {fechaCorta(p.created_at)}
              </p>
              <p className="text-[11px] text-slate-400">{fechaHora(p.created_at)}</p>
            </Campo>

            <Campo icono={Calendar}
              label={p.estado === 'RECIBIDA' ? 'Llegó a bodega' : 'Llegada estimada'}>
              {p.estado === 'RECIBIDA' ? (
                <>
                  <p className="text-[13px] font-semibold" style={{ color: '#1B7A3E' }}>
                    {fechaCorta(p.updated_at)}
                  </p>
                  <p className="text-[11px] text-slate-400">{fechaHora(p.updated_at)}</p>
                </>
              ) : p.estado === 'PENDIENTE' ? (
                <>
                  <p className="text-[13px] font-semibold text-slate-700">
                    ~{fechaCorta(estimada)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {DIAS_ESTIMADOS_LLEGADA} días desde el aviso
                  </p>
                </>
              ) : (
                <p className="text-[13px] text-slate-400">—</p>
              )}
            </Campo>
          </div>

          {/* Acciones solo donde hay algo que hacer: un aviso reciente
              todavía puede llegar solo. */}
          {p.atrasada && (
            <div className="flex gap-3 pt-2">
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer"
                  className="flex-1 py-3 rounded-xl text-white text-[13px] font-semibold
                    flex items-center justify-center gap-2 transition"
                  style={{ background: '#1B7A3E' }}>
                  <MessageCircle size={15} /> Contactar
                </a>
              ) : (
                <span className="flex-1 py-3 rounded-xl border border-slate-200
                  text-[13px] text-slate-400 text-center">
                  Sin teléfono
                </span>
              )}
              <button onClick={onDescartar}
                className="flex-1 py-3 rounded-xl border text-[13px] font-semibold
                  flex items-center justify-center gap-2 transition hover:bg-red-50"
                style={{ borderColor: '#FECACA', color: '#991B1B' }}>
                <Trash2 size={15} /> Descartar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Campo({ icono: Icono, label, valor, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icono size={13} className="text-slate-400" />
        <p className="text-[11px] font-semibold tracking-wide text-slate-400">
          {label.toUpperCase()}
        </p>
      </div>
      {children ?? (
        <p className="text-[13px] font-semibold text-slate-700">{valor}</p>
      )}
    </div>
  )
}

function Tarjeta({ icono: Icono, etiqueta, valor, detalle, color }) {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #E8EDF5' }}>
      <div className="flex items-center gap-2 mb-3">
        <Icono size={15} style={{ color }} />
        <p className="text-[11px] font-semibold tracking-wide text-slate-400">
          {etiqueta.toUpperCase()}
        </p>
      </div>
      <p className="text-[30px] font-black leading-none tracking-tight"
        style={{ fontFamily: MONO, color }}>{valor}</p>
      <p className="text-[12px] text-slate-400 mt-2">{detalle}</p>
    </div>
  )
}

function Th({ children, align = 'left', ancho }) {
  return (
    <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-400"
      style={{ textAlign: align, width: ancho }}>{children}</th>
  )
}
function Td({ children, align = 'left' }) {
  return <td className="px-4 py-3 overflow-hidden" style={{ textAlign: align }}>{children}</td>
}
