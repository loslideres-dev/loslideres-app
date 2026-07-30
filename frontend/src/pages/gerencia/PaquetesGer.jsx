import { useState, useMemo } from 'react'
import { Search, Download, Package, AlertTriangle, X } from 'lucide-react'
import { usePaquetesAdmin } from '../../hooks/usePaquetes'
import { OBJETIVO_HORAS, CORREDOR } from '../../hooks/useGerencia'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'
const usd = n => n == null ? '—' : `$${Number(n).toFixed(2)}`

const ESTADO_COLOR = {
  RECIBIDO:    { bg: '#EEF2F8', fg: '#1565C0' },
  TARIFADO:    { bg: '#EDE9FE', fg: '#5B21B6' },
  EN_TRANSITO: { bg: '#FEF3C7', fg: '#B45309' },
  EN_REPARTO:  { bg: '#DBEAFE', fg: '#1D4ED8' },
  ENTREGADO:   { bg: '#E6F4EC', fg: '#1B7A3E' },
}

const FILTROS = [
  { label: 'Todos',    value: null },
  ...CORREDOR.map(c => ({ label: c.etiqueta, value: c.estado })),
]

function fechaCorta(f) {
  return f ? new Date(f).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }) : '—'
}

function horasEn(p) {
  const base = p.estado === 'RECIBIDO'
    ? (p.fecha_recepcion ?? p.updated_at)
    : (p.updated_at ?? p.fecha_recepcion)
  if (!base) return null
  return (Date.now() - new Date(base).getTime()) / 36e5
}

export default function PaquetesGer() {
  const [filtro, setFiltro] = useState(null)
  const [busca,  setBusca]  = useState('')
  const [soloDemorados, setSoloDemorados] = useState(false)

  const { data: paquetes = [], isLoading } = usePaquetesAdmin(filtro)

  const filas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return paquetes
      .map(p => {
        const objetivo = OBJETIVO_HORAS[p.estado]
        const horas = p.estado === 'ENTREGADO' ? null : horasEn(p)
        const demorado = objetivo && horas != null && horas > objetivo
        return { ...p, horas, objetivo, demorado, critico: demorado && horas > objetivo * 3 }
      })
      .filter(p => {
        if (soloDemorados && !p.demorado) return false
        if (!q) return true
        return p.codigo?.toLowerCase().includes(q)
          || p.tracking_externo?.toLowerCase().includes(q)
          || p.cliente_nombre?.toLowerCase().includes(q)
      })
  }, [paquetes, busca, soloDemorados])

  const demorados = filas.filter(p => p.demorado).length

  const exportar = () => {
    const cab = ['Codigo', 'Tracking', 'Cliente', 'Estado', 'Tamano',
                 'Precio USD', 'Traslado USD', 'Recibido', 'Entregado']
    const filasCsv = filas.map(p => [
      p.codigo, p.tracking_externo ?? '', p.cliente_nombre ?? '', p.estado,
      p.tamanio ?? '', p.precio_final ?? '', p.monto_traslado ?? '',
      p.fecha_recepcion ? new Date(p.fecha_recepcion).toISOString().slice(0, 10) : '',
      p.fecha_entrega   ? new Date(p.fecha_entrega).toISOString().slice(0, 10)   : '',
    ])
    const csv = [cab, ...filasCsv]
      .map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `paquetes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <GerenciaLayout
      titulo="Paquetes"
      descripcion={`${filas.length} de ${paquetes.length} envíos`}
      acciones={
        <button onClick={exportar} disabled={filas.length === 0}
          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600
            hover:bg-slate-50 transition text-[13px] font-medium flex items-center gap-2
            disabled:opacity-40">
          <Download size={14} /> Exportar
        </button>
      }
    >
      <div className="max-w-[1600px] space-y-4">

        {/* Filtros */}
        <div className="flex items-center gap-3">
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

          {demorados > 0 && (
            <button onClick={() => setSoloDemorados(v => !v)}
              className="px-3 py-2 rounded-lg text-[12px] font-semibold flex items-center
                gap-1.5 transition"
              style={{
                background: soloDemorados ? '#B45309' : '#FEF3C7',
                color:      soloDemorados ? '#FFFFFF' : '#B45309',
              }}>
              <AlertTriangle size={13} />
              {demorados} demorado{demorados > 1 ? 's' : ''}
            </button>
          )}

          <div className="relative flex-1 max-w-sm ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
              text-slate-400" />
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por código, tracking o cliente"
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

        {/* Tabla */}
        <section className="bg-white rounded-2xl overflow-hidden"
          style={{ border: '1px solid #E8EDF5' }}>
          {isLoading ? (
            <div className="py-24 flex justify-center">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
                rounded-full animate-spin" />
            </div>
          ) : filas.length === 0 ? (
            <div className="py-24 text-center">
              <Package size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Sin resultados</p>
              <p className="text-[13px] text-slate-400 mt-1">
                Prueba con otro filtro o término de búsqueda
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#FAFBFD' }}>
                    <Th>Código</Th>
                    <Th>Cliente</Th>
                    <Th align="center">Estado</Th>
                    <Th align="center">Tamaño</Th>
                    <Th align="right">Precio</Th>
                    <Th align="right">Traslado</Th>
                    <Th align="center">Recibido</Th>
                    <Th align="center">Entregado</Th>
                    <Th align="right">En etapa</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filas.map(p => {
                    const c = ESTADO_COLOR[p.estado] ?? { bg: '#F1F5F9', fg: '#64748B' }
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <Td>
                          <p className="text-[12px] font-semibold text-slate-700"
                            style={{ fontFamily: MONO }}>
                            {p.tracking_externo ?? p.codigo}
                          </p>
                          {p.tracking_externo && (
                            <p className="text-[10px] text-slate-400" style={{ fontFamily: MONO }}>
                              {p.codigo}
                            </p>
                          )}
                        </Td>
                        <Td>
                          <span className="text-[13px] text-slate-600">
                            {p.cliente_nombre ?? '—'}
                          </span>
                        </Td>
                        <Td align="center">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full
                            whitespace-nowrap"
                            style={{ background: c.bg, color: c.fg }}>
                            {CORREDOR.find(x => x.estado === p.estado)?.etiqueta ?? p.estado}
                          </span>
                        </Td>
                        <Td align="center">
                          <span className="text-[12px] font-bold text-slate-500">
                            {p.tamanio ?? '—'}
                          </span>
                        </Td>
                        <Td align="right">
                          <span className="text-[13px] font-bold" style={{ fontFamily: MONO }}>
                            {usd(p.precio_final)}
                          </span>
                        </Td>
                        <Td align="right">
                          <span className="text-[12px]"
                            style={{ fontFamily: MONO, color: '#94A3B8' }}>
                            {usd(p.monto_traslado)}
                          </span>
                        </Td>
                        <Td align="center">
                          <span className="text-[12px] text-slate-500">
                            {fechaCorta(p.fecha_recepcion)}
                          </span>
                        </Td>
                        <Td align="center">
                          <span className="text-[12px] text-slate-500">
                            {fechaCorta(p.fecha_entrega)}
                          </span>
                        </Td>
                        <Td align="right">
                          {p.horas == null ? (
                            <span className="text-[12px] text-slate-300">—</span>
                          ) : (
                            <span className="text-[12px] font-bold"
                              style={{
                                fontFamily: MONO,
                                color: p.critico ? '#DC2626'
                                     : p.demorado ? '#B45309' : '#94A3B8',
                              }}>
                              {p.horas < 24
                                ? `${Math.round(p.horas)} h`
                                : `${(p.horas / 24).toFixed(1)} d`}
                            </span>
                          )}
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </GerenciaLayout>
  )
}

function Th({ children, align = 'left' }) {
  return (
    <th className="px-5 py-3 text-[11px] font-bold tracking-wider text-slate-400
      whitespace-nowrap" style={{ textAlign: align }}>{children}</th>
  )
}
function Td({ children, align = 'left' }) {
  return <td className="px-5 py-3" style={{ textAlign: align }}>{children}</td>
}
