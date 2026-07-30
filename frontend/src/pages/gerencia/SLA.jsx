import { useMemo } from 'react'
import { Activity, AlertTriangle, Clock, TrendingUp, Package } from 'lucide-react'
import { usePaquetesAdmin } from '../../hooks/usePaquetes'
import { OBJETIVO_HORAS, CORREDOR } from '../../hooks/useGerencia'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'

// Transiciones medibles: de qué estado a cuál, y cuánto debería tardar.
const TRANSICIONES = CORREDOR
  .filter(c => OBJETIVO_HORAS[c.estado])
  .map(c => ({
    estado:   c.estado,
    etiqueta: c.etiqueta,
    lugar:    c.lugar,
    objetivo: OBJETIVO_HORAS[c.estado],
  }))

function dur(h) {
  if (h == null) return '—'
  if (h < 1)  return '<1 h'
  if (h < 48) return `${Math.round(h)} h`
  return `${(h / 24).toFixed(1)} d`
}

function horasEn(p) {
  const base = p.estado === 'RECIBIDO'
    ? (p.fecha_recepcion ?? p.updated_at)
    : (p.updated_at ?? p.fecha_recepcion)
  if (!base) return null
  return (Date.now() - new Date(base).getTime()) / 36e5
}

export default function SLA() {
  const { data: paquetes = [], isLoading } = usePaquetesAdmin(null)

  const analisis = useMemo(() => {
    const enCirculacion = paquetes.filter(p => p.estado !== 'ENTREGADO')
    const entregados    = paquetes.filter(p => p.estado === 'ENTREGADO')

    // Por etapa: cuántos hay, cuántos pasados de tiempo, cuánto llevan
    const etapas = TRANSICIONES.map(t => {
      const enEtapa = enCirculacion
        .filter(p => p.estado === t.estado)
        .map(p => ({ ...p, horas: horasEn(p) }))
        .filter(p => p.horas != null)

      const demorados = enEtapa.filter(p => p.horas > t.objetivo)
      const promedio = enEtapa.length
        ? enEtapa.reduce((s, p) => s + p.horas, 0) / enEtapa.length
        : null
      const cumplimiento = enEtapa.length
        ? ((enEtapa.length - demorados.length) / enEtapa.length) * 100
        : null

      return { ...t, cantidad: enEtapa.length, demorados: demorados.length,
               promedio, cumplimiento, paquetes: enEtapa }
    })

    // Ciclo completo de los entregados
    const ciclos = entregados
      .filter(p => p.fecha_recepcion && p.fecha_entrega)
      .map(p => (new Date(p.fecha_entrega) - new Date(p.fecha_recepcion)) / 36e5)
    const cicloPromedio = ciclos.length
      ? ciclos.reduce((a, b) => a + b, 0) / ciclos.length
      : null
    const cicloMin = ciclos.length ? Math.min(...ciclos) : null
    const cicloMax = ciclos.length ? Math.max(...ciclos) : null

    // Objetivo total de la ruta
    const objetivoTotal = TRANSICIONES.reduce((s, t) => s + t.objetivo, 0)

    const todosDemorados = etapas
      .flatMap(e => e.paquetes
        .filter(p => p.horas > e.objetivo)
        .map(p => ({ ...p, etapa: e.etiqueta, objetivo: e.objetivo,
                     exceso: p.horas - e.objetivo,
                     critico: p.horas > e.objetivo * 3 })))
      .sort((a, b) => b.exceso - a.exceso)

    return { etapas, cicloPromedio, cicloMin, cicloMax, objetivoTotal,
             todosDemorados, entregados: entregados.length }
  }, [paquetes])

  return (
    <GerenciaLayout
      titulo="SLA y atascos"
      descripcion="Tiempos objetivo por etapa y paquetes detenidos"
    >
      {isLoading ? (
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
            rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5 max-w-[1400px]">

          {/* Ciclo completo */}
          <section className="grid grid-cols-4 gap-4">
            <Tarjeta icono={Clock} etiqueta="Ciclo promedio"
              valor={dur(analisis.cicloPromedio)}
              detalle={`objetivo ${dur(analisis.objetivoTotal)}`}
              color={analisis.cicloPromedio && analisis.cicloPromedio > analisis.objetivoTotal
                ? '#B45309' : '#1B7A3E'} />
            <Tarjeta icono={TrendingUp} etiqueta="Más rápido"
              valor={dur(analisis.cicloMin)} detalle="de bodega a entrega" color="#1B7A3E" />
            <Tarjeta icono={AlertTriangle} etiqueta="Más lento"
              valor={dur(analisis.cicloMax)} detalle="de bodega a entrega" color="#B45309" />
            <Tarjeta icono={Package} etiqueta="Entregas medidas"
              valor={analisis.entregados} detalle="con ciclo completo" color="#1565C0" />
          </section>

          {/* Cumplimiento por etapa */}
          <section className="bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid #E8EDF5' }}>
            <div className="px-7 py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
              <h2 className="text-[13px] font-bold tracking-wider text-slate-400">
                CUMPLIMIENTO POR ETAPA
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                De los paquetes que están ahora en cada etapa del corredor
              </p>
            </div>

            <div className="divide-y divide-slate-50">
              {analisis.etapas.map(e => {
                const pct = e.cumplimiento
                const barra = pct == null ? 0 : pct
                return (
                  <div key={e.estado} className="px-7 py-5 flex items-center gap-6">
                    <div className="w-40 flex-shrink-0">
                      <p className="text-[13px] font-semibold text-slate-700">
                        {e.etiqueta}
                      </p>
                      <p className="text-[11px] text-slate-400">{e.lugar}</p>
                    </div>

                    <div className="w-24 flex-shrink-0 text-center">
                      <p className="text-xl font-black" style={{ fontFamily: MONO,
                        color: e.cantidad > 0 ? '#0D2B5E' : '#CBD5E1' }}>
                        {e.cantidad}
                      </p>
                      <p className="text-[10px] text-slate-400">en etapa</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-slate-500">
                          Objetivo: {dur(e.objetivo)}
                          {e.promedio != null && (
                            <> · promedio actual{' '}
                              <span className="font-semibold"
                                style={{ color: e.promedio > e.objetivo ? '#B45309' : '#1B7A3E' }}>
                                {dur(e.promedio)}
                              </span>
                            </>
                          )}
                        </span>
                        {pct != null && (
                          <span className="font-bold"
                            style={{ color: pct === 100 ? '#1B7A3E'
                                          : pct >= 70 ? '#B45309' : '#DC2626' }}>
                            {Math.round(pct)}% a tiempo
                          </span>
                        )}
                      </div>
                      <div className="h-2 rounded-full overflow-hidden"
                        style={{ background: '#F1F5F9' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${barra}%`,
                            background: pct === 100 ? '#1B7A3E'
                                      : pct >= 70 ? '#F0B429' : '#DC2626',
                          }} />
                      </div>
                    </div>

                    <div className="w-24 flex-shrink-0 text-right">
                      {e.demorados > 0 ? (
                        <span className="text-[11px] font-bold px-2 py-1 rounded-full"
                          style={{ background: '#FEF3C7', color: '#B45309' }}>
                          {e.demorados} pasados
                        </span>
                      ) : e.cantidad > 0 ? (
                        <span className="text-[11px] font-medium" style={{ color: '#1B7A3E' }}>
                          al día
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300">vacía</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Detenidos */}
          <section className="bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid #E8EDF5' }}>
            <div className="px-7 py-5 flex items-center justify-between"
              style={{ borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <h2 className="text-[13px] font-bold tracking-wider text-slate-400">
                  PAQUETES DETENIDOS
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Ordenados por cuánto se pasaron del objetivo
                </p>
              </div>
              {analisis.todosDemorados.length > 0 && (
                <span className="text-2xl font-black" style={{ fontFamily: MONO,
                  color: analisis.todosDemorados.some(p => p.critico) ? '#DC2626' : '#B45309' }}>
                  {analisis.todosDemorados.length}
                </span>
              )}
            </div>

            {analisis.todosDemorados.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center
                  mx-auto mb-3" style={{ background: '#E6F4EC' }}>
                  <Activity size={22} style={{ color: '#1B7A3E' }} />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Nada detenido
                </p>
                <p className="text-[13px] text-slate-400 mt-1">
                  Todos los paquetes están dentro de su tiempo objetivo
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#FAFBFD' }}>
                    <Th>Paquete</Th>
                    <Th>Cliente</Th>
                    <Th>Etapa</Th>
                    <Th align="right">Lleva</Th>
                    <Th align="right">Objetivo</Th>
                    <Th align="right">Exceso</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {analisis.todosDemorados.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="w-1 h-8 rounded-full flex-shrink-0"
                            style={{ background: p.critico ? '#DC2626' : '#F0B429' }} />
                          <span className="text-[12px] font-semibold text-slate-700"
                            style={{ fontFamily: MONO }}>
                            {p.tracking_externo ?? p.codigo}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-[13px] text-slate-600">
                          {p.cliente_nombre ?? '—'}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-[12px] text-slate-500">{p.etapa}</span>
                      </Td>
                      <Td align="right">
                        <span className="text-[13px] font-bold" style={{ fontFamily: MONO,
                          color: p.critico ? '#DC2626' : '#B45309' }}>
                          {dur(p.horas)}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="text-[12px] text-slate-400" style={{ fontFamily: MONO }}>
                          {dur(p.objetivo)}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="text-[12px] font-semibold"
                          style={{ fontFamily: MONO, color: '#DC2626' }}>
                          +{dur(p.exceso)}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Nota sobre configurabilidad */}
          <div className="px-5 py-4 rounded-xl flex gap-3" style={{ background: '#F8FAFC' }}>
            <Clock size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#94A3B8' }} />
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Los tiempos objetivo están fijos en el código: {TRANSICIONES
                .map(t => `${t.etiqueta} ${dur(t.objetivo)}`).join(' · ')}.
              Cuando la operación tenga más historia conviene ajustarlos con datos
              reales y moverlos a una tabla editable desde aquí.
            </p>
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
    <th className="px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400"
      style={{ textAlign: align }}>{children}</th>
  )
}
function Td({ children, align = 'left' }) {
  return <td className="px-6 py-3" style={{ textAlign: align }}>{children}</td>
}
