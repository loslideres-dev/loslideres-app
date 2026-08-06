import { useState, useMemo } from 'react'
import {
  Search, Download, Users, X, MessageCircle, TrendingUp, AlertTriangle,
  UserPlus, Percent,
} from 'lucide-react'
import {
  useClientesGerencia, ESTADO_CLIENTE, DIAS_ACTIVO, DIAS_EN_RIESGO,
} from '../../hooks/useGerencia'
import { fechaCorta, tiempoRelativoCorto } from '../../lib/fechas'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'
const usd = n => (n == null ? '—' : `$${Number(n).toFixed(2)}`)
const usd0 = n => (n == null ? '—' : `$${Math.round(Number(n))}`)

const FILTROS = [
  { label: 'Todos',       value: null },
  { label: 'Activos',     value: 'activo' },
  { label: 'En riesgo',   value: 'riesgo' },
  { label: 'Dormidos',    value: 'dormido' },
  { label: 'Sin envíos',  value: 'sinEnvios' },
]

const ORDENES = [
  { label: 'Facturación', value: 'facturado' },
  { label: 'Paquetes',    value: 'totalPaquetes' },
  { label: 'Último envío', value: 'ultimoEnvio' },
]

// Mensaje de reactivación. Se manda desde la misma tabla porque el objetivo
// de esta pantalla no es mirar números: es recuperar al cliente que se enfrió.
function urlReactivar(cliente) {
  const tel = (cliente.telefono ?? '').replace(/\D/g, '')
  if (!tel) return null
  const texto =
    `Hola ${cliente.nombre ?? ''}, te escribimos de Los Líderes Encomiendas. `
    + `Hace un tiempo que no recibimos paquetes en tu casillero `
    + `${cliente.codigo_casillero ?? ''}. `
    + `¿Necesitas enviar algo? Estamos a la orden.`
  return `https://wa.me/${tel}?text=${encodeURIComponent(texto.trim())}`
}

export default function Clientes() {
  const [filtro, setFiltro] = useState(null)
  const [busca,  setBusca]  = useState('')
  const [orden,  setOrden]  = useState('facturado')

  const { data, isLoading } = useClientesGerencia()
  const m = data ?? {}

  // `data.clientes ?? []` crearía un array nuevo en cada render y el useMemo
  // de abajo se recalcularía siempre. Memoizarlo lo ancla a la identidad real
  // de los datos.
  const clientes = useMemo(() => data?.clientes ?? [], [data])

  const filas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    let lista = clientes

    if (filtro) lista = lista.filter(c => c.estado === filtro)
    if (q) {
      lista = lista.filter(c =>
        c.nombre?.toLowerCase().includes(q) ||
        c.codigo_casillero?.toLowerCase().includes(q) ||
        c.telefono?.includes(q))
    }

    return [...lista].sort((a, b) => {
      if (orden === 'ultimoEnvio') {
        // Sin envíos al final: no compiten con quien sí envió
        if (!a.ultimoEnvio) return 1
        if (!b.ultimoEnvio) return -1
        return new Date(b.ultimoEnvio) - new Date(a.ultimoEnvio)
      }
      return (b[orden] ?? 0) - (a[orden] ?? 0)
    })
  }, [clientes, filtro, busca, orden])

  const exportarCSV = () => {
    const cab = ['Cliente', 'Casillero', 'Teléfono', 'Paquetes', 'Entregados',
      'Facturado USD', 'Ticket promedio', 'Primer envío', 'Último envío',
      'Días sin enviar', 'Estado']
    const filasCsv = filas.map(c => [
      c.nombre ?? '',
      c.codigo_casillero ?? '',
      c.telefono ?? '',
      c.totalPaquetes,
      c.entregados,
      c.facturado.toFixed(2),
      c.ticketPromedio.toFixed(2),
      c.primerEnvio ? fechaCorta(c.primerEnvio) : '',
      c.ultimoEnvio ? fechaCorta(c.ultimoEnvio) : '',
      c.diasDesdeUltimo ?? '',
      ESTADO_CLIENTE[c.estado].label,
    ])
    const csv = [cab, ...filasCsv]
      .map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <GerenciaLayout
      titulo="Clientes"
      descripcion={`${filas.length} de ${clientes.length} clientes`}
      acciones={
        <button onClick={exportarCSV} disabled={filas.length === 0}
          className="px-3 py-2 rounded-lg text-[13px] font-semibold flex items-center
            gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50
            disabled:opacity-40 transition">
          <Download size={15} /> Exportar CSV
        </button>
      }
    >
      <div className="max-w-[1400px] space-y-5">

        {/* ── Métricas de cartera ── */}
        <div className="grid grid-cols-4 gap-4">
          <Tarjeta icono={TrendingUp} etiqueta="Clientes activos"
            valor={isLoading ? '—' : m.activos ?? 0}
            detalle={`Enviaron en los últimos ${DIAS_ACTIVO} días`}
            color="#1B7A3E" />
          <Tarjeta icono={AlertTriangle} etiqueta="Por recuperar"
            valor={isLoading ? '—' : (m.enRiesgo ?? 0) + (m.dormidos ?? 0)}
            detalle={`${m.enRiesgo ?? 0} en riesgo · ${m.dormidos ?? 0} dormidos`}
            color="#B45309" />
          <Tarjeta icono={UserPlus} etiqueta="Nuevos este mes"
            valor={isLoading ? '—' : m.nuevosMes ?? 0}
            detalle={`${m.sinEnvios ?? 0} registrados sin enviar nunca`}
            color="#1565C0" />
          <Tarjeta icono={Percent} etiqueta="Concentración top 5"
            valor={isLoading ? '—' : `${Math.round(m.concentracionTop5 ?? 0)}%`}
            detalle={
              (m.concentracionTop5 ?? 0) > 50
                ? 'Riesgo: pocos clientes pesan mucho'
                : 'Facturación bien repartida'
            }
            color={(m.concentracionTop5 ?? 0) > 50 ? '#991B1B' : '#5B21B6'} />
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

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-slate-400">Ordenar por</span>
            <select value={orden} onChange={e => setOrden(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-[12px]
                font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500">
              {ORDENES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 max-w-sm ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
              text-slate-400" />
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nombre, casillero o teléfono"
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
              <Users size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Sin resultados</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#FAFBFD' }}>
                  <Th>Cliente</Th>
                  <Th align="center">Paquetes</Th>
                  <Th align="right">Facturado</Th>
                  <Th align="right">Ticket prom.</Th>
                  <Th align="center">Primer envío</Th>
                  <Th align="center">Último envío</Th>
                  <Th align="center">Estado</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filas.map(c => {
                  const est = ESTADO_CLIENTE[c.estado]
                  const wa  = urlReactivar(c)
                  const necesitaEmpujon = c.estado === 'riesgo' || c.estado === 'dormido'
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center
                            justify-center text-white text-[11px] font-bold flex-shrink-0"
                            style={{ background: '#1565C0' }}>
                            {(c.nombre ?? 'CL').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-700 truncate">
                              {c.nombre ?? '—'}
                            </p>
                            <p className="text-[11px] text-slate-400"
                              style={{ fontFamily: MONO }}>
                              {c.codigo_casillero ?? '—'}
                            </p>
                          </div>
                        </div>
                      </Td>

                      <Td align="center">
                        <span className="text-[13px] font-semibold text-slate-700"
                          style={{ fontFamily: MONO }}>
                          {c.totalPaquetes}
                        </span>
                        {c.enCurso > 0 && (
                          <p className="text-[10px]" style={{ color: '#1565C0' }}>
                            {c.enCurso} en curso
                          </p>
                        )}
                      </Td>

                      <Td align="right">
                        <span className="text-[13px] font-bold text-slate-700"
                          style={{ fontFamily: MONO }}>
                          {usd0(c.facturado)}
                        </span>
                      </Td>

                      <Td align="right">
                        <span className="text-[12px] text-slate-500"
                          style={{ fontFamily: MONO }}>
                          {c.entregados > 0 ? usd(c.ticketPromedio) : '—'}
                        </span>
                      </Td>

                      <Td align="center">
                        <span className="text-[12px] text-slate-400">
                          {c.primerEnvio ? fechaCorta(c.primerEnvio) : '—'}
                        </span>
                      </Td>

                      <Td align="center">
                        {c.ultimoEnvio ? (
                          <>
                            <span className="text-[12px] font-medium"
                              style={{ color: est.color }}>
                              {tiempoRelativoCorto(c.ultimoEnvio)}
                            </span>
                            <p className="text-[10px] text-slate-400">
                              {fechaCorta(c.ultimoEnvio)}
                            </p>
                          </>
                        ) : (
                          <span className="text-[12px] text-slate-300">Nunca</span>
                        )}
                      </Td>

                      <Td align="center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: est.bg, color: est.color }}>
                          {est.label}
                        </span>
                      </Td>

                      <Td align="right">
                        {/* Solo se ofrece escribir a quien hay que recuperar.
                            Un botón en cada fila sería ruido. */}
                        {necesitaEmpujon && wa && (
                          <a href={wa} target="_blank" rel="noreferrer"
                            title="Escribirle para reactivarlo"
                            className="inline-flex items-center gap-1.5 text-[12px]
                              font-semibold px-3 py-1.5 rounded-lg transition
                              hover:bg-green-50"
                            style={{ color: '#1B7A3E' }}>
                            <MessageCircle size={13} /> Escribir
                          </a>
                        )}
                        {necesitaEmpujon && !wa && (
                          <span className="text-[11px] text-slate-300">Sin teléfono</span>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* ── Nota de método ── */}
        <p className="text-[11px] text-slate-400 leading-relaxed max-w-3xl">
          Facturado cuenta solo el dinero efectivamente cobrado en paquetes
          entregados; lo que está en el corredor todavía no es ingreso.
          Un cliente es <strong>activo</strong> si envió en los últimos {DIAS_ACTIVO} días,
          <strong> en riesgo</strong> entre {DIAS_ACTIVO} y {DIAS_EN_RIESGO}, y
          <strong> dormido</strong> pasados los {DIAS_EN_RIESGO}.
        </p>

      </div>
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
