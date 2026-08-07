import { useState, useMemo } from 'react'
import {
  Search, X, PackagePlus, MessageCircle, Trash2, Clock, Check, Percent,
  AlertTriangle,
} from 'lucide-react'
import {
  usePrealertasGerencia, useDescartarPrealerta,
  ESTADO_PREALERTA, DIAS_SIN_LLEGAR,
} from '../../hooks/usePrealertas'
import { fechaCorta, tiempoRelativoCorto } from '../../lib/fechas'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'

const FILTROS = [
  { label: 'Sin llegar',  value: 'atrasadas' },
  { label: 'Pendientes',  value: 'PENDIENTE' },
  { label: 'Recibidas',   value: 'RECIBIDA' },
  { label: 'Cerradas',    value: 'cerradas' },
  { label: 'Todas',       value: null },
]

// Mensaje para preguntarle al cliente qué pasó con lo que avisó.
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
  const [filtro, setFiltro] = useState('atrasadas')
  const [busca,  setBusca]  = useState('')
  const [aviso,  setAviso]  = useState(null)

  const { data, isLoading } = usePrealertasGerencia()
  const descartar = useDescartarPrealerta()
  const m = data ?? {}

  const todas = useMemo(() => data?.filas ?? [], [data])

  const filas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    let lista = todas

    if (filtro === 'atrasadas')      lista = lista.filter(p => p.atrasada)
    else if (filtro === 'cerradas')  lista = lista.filter(p => p.estado !== 'PENDIENTE')
    else if (filtro)                 lista = lista.filter(p => p.estado === filtro)

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
      await descartar.mutateAsync({ id: aviso.id })
    } finally {
      setAviso(null)
    }
  }

  return (
    <GerenciaLayout
      titulo="Paquetes avisados"
      descripcion={`${filas.length} de ${todas.length} avisos`}
    >
      <div className="max-w-[1400px] space-y-5">

        {/* ── Métricas ── */}
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
            valor={isLoading || m.tasaLlegada == null
              ? '—' : `${Math.round(m.tasaLlegada)}%`}
            detalle="De lo avisado y ya cerrado" />
        </div>

        {/* ── Filtros ── */}
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
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
              text-slate-400" />
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

        {/* ── Tabla ── */}
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
              <p className="text-sm font-semibold text-slate-700">
                {filtro === 'atrasadas'
                  ? 'Nada lleva más de 30 días sin llegar'
                  : 'Sin resultados'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#FAFBFD' }}>
                  <Th>Cliente</Th>
                  <Th>Tienda</Th>
                  <Th>Qué avisó</Th>
                  <Th>Guía</Th>
                  <Th align="center">Avisado</Th>
                  <Th align="center">Estado</Th>
                  <Th align="right">Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filas.map(p => {
                  const est = ESTADO_PREALERTA[p.estado] ?? ESTADO_PREALERTA.PENDIENTE
                  const wa  = urlContacto(p)
                  return (
                    <tr key={p.id}
                      className="hover:bg-slate-50/60 transition"
                      style={p.atrasada ? { background: '#FFFBF5' } : {}}>
                      <Td>
                        <p className="text-[13px] font-semibold text-slate-700">
                          {p.cliente_nombre ?? '—'}
                        </p>
                        <p className="text-[11px] text-slate-400" style={{ fontFamily: MONO }}>
                          {p.cliente_codigo ?? '—'}
                        </p>
                      </Td>
                      <Td>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#EEF2F8', color: '#1565C0' }}>
                          {p.tienda}
                        </span>
                      </Td>
                      <Td>
                        <p className="text-[12px] text-slate-600 max-w-[240px] truncate"
                          title={p.descripcion}>
                          {p.descripcion}
                        </p>
                      </Td>
                      <Td>
                        <span className="text-[11px] text-slate-400" style={{ fontFamily: MONO }}>
                          {p.tracking ?? '—'}
                        </span>
                      </Td>
                      <Td align="center">
                        <span className="text-[12px] font-medium"
                          style={{ color: p.atrasada ? '#991B1B' : '#64748B' }}>
                          hace {tiempoRelativoCorto(p.created_at)}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {fechaCorta(p.created_at)}
                        </p>
                      </Td>
                      <Td align="center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: est.bg, color: est.color }}>
                          {est.label}
                        </span>
                      </Td>
                      <Td align="right">
                        {/* Solo se ofrecen acciones donde hay algo que hacer:
                            una pre-alerta reciente todavía puede llegar sola. */}
                        {p.atrasada ? (
                          <div className="flex items-center justify-end gap-1">
                            {wa ? (
                              <a href={wa} target="_blank" rel="noreferrer"
                                title="Preguntarle al cliente"
                                className="inline-flex items-center gap-1.5 text-[12px]
                                  font-semibold px-2.5 py-1.5 rounded-lg transition
                                  hover:bg-green-50"
                                style={{ color: '#1B7A3E' }}>
                                <MessageCircle size={13} /> Contactar
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-300 px-2">
                                Sin teléfono
                              </span>
                            )}
                            <button onClick={() => setAviso(p)}
                              title="Darla por perdida"
                              className="inline-flex items-center gap-1.5 text-[12px]
                                font-semibold px-2.5 py-1.5 rounded-lg transition
                                hover:bg-red-50"
                              style={{ color: '#991B1B' }}>
                              <Trash2 size={13} /> Descartar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        <p className="text-[11px] text-slate-400 leading-relaxed max-w-3xl">
          Un aviso se marca como atrasado a los {DIAS_SIN_LLEGAR} días sin llegar.
          Descartarlo no lo borra: queda como <strong>No llegó</strong> en el
          historial y el cliente lo ve así en su app, distinto de si él lo hubiera
          cancelado.
        </p>
      </div>

      {/* ── Confirmación ── */}
      {aviso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(13,43,94,0.45)' }} onClick={() => setAviso(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-800 mb-2">
              ¿Descartar este aviso?
            </h2>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-5">
              {aviso.cliente_nombre} avisó hace {aviso.dias} días un envío de{' '}
              {aviso.tienda} ({aviso.descripcion}). Quedará marcado como
              "No llegó" y el cliente lo verá así.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAviso(null)}
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

function Th({ children, align = 'left' }) {
  return (
    <th className="px-5 py-3 text-[11px] font-bold tracking-wider text-slate-400"
      style={{ textAlign: align }}>{children}</th>
  )
}
function Td({ children, align = 'left' }) {
  return <td className="px-5 py-3" style={{ textAlign: align }}>{children}</td>
}
