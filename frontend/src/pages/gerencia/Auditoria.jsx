import { useState, useMemo } from 'react'
import {
  ScrollText, Search, X, User, Package, DollarSign, Wallet,
  Settings, UserPlus, Truck, FileText,
} from 'lucide-react'
import { useAuditoria } from '../../hooks/useAuditoria'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'

// Cada evento se pinta según lo que toca: dinero, operación o configuración.
// Lo que toca dinero se resalta, porque es lo que importa auditar.
const EVENTO_CONF = {
  paquete_recibido:  { icono: Package,    color: '#1565C0', label: 'Paquete recibido'  },
  paquete_tarifado:  { icono: DollarSign, color: '#B45309', label: 'Paquete tarifado', dinero: true },
  paquete_transito:  { icono: Truck,      color: '#5B21B6', label: 'Puesto en tránsito' },
  paquete_reparto:   { icono: Truck,      color: '#1D4ED8', label: 'En reparto'        },
  paquete_entregado: { icono: Package,    color: '#1B7A3E', label: 'Entregado', dinero: true },
  paquete_editado:   { icono: FileText,   color: '#64748B', label: 'Registro editado'  },
  paquete_eliminado: { icono: X,          color: '#DC2626', label: 'Registro eliminado' },
  liquidacion:       { icono: Wallet,     color: '#1B7A3E', label: 'Liquidación', dinero: true },
  cierre_mensual:    { icono: FileText,   color: '#0D2B5E', label: 'Cierre mensual', dinero: true },
  nuevo_usuario:     { icono: UserPlus,   color: '#5B21B6', label: 'Usuario creado'   },
  config_cambiada:   { icono: Settings,   color: '#B45309', label: 'Configuración', dinero: true },
}

function conf(evento) {
  return EVENTO_CONF[evento] ?? {
    icono: ScrollText, color: '#64748B',
    label: (evento ?? 'evento').replace(/_/g, ' '),
  }
}

function cuando(f) {
  if (!f) return '—'
  const d = new Date(f)
  const horas = (Date.now() - d.getTime()) / 36e5
  if (horas < 1)  return 'hace un momento'
  if (horas < 24) return `hace ${Math.round(horas)} h`
  return d.toLocaleDateString('es-VE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function Auditoria() {
  const [busca, setBusca]   = useState('')
  const [evento, setEvento] = useState(null)
  const [soloDinero, setSoloDinero] = useState(false)
  const [detalle, setDetalle] = useState(null)

  const { data: logs = [], isLoading } = useAuditoria({ limite: 300 })

  const eventosPresentes = useMemo(() => {
    const set = new Set(logs.map(l => l.evento).filter(Boolean))
    return [...set].sort()
  }, [logs])

  const filas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return logs.filter(l => {
      if (evento && l.evento !== evento) return false
      if (soloDinero && !conf(l.evento).dinero) return false
      if (!q) return true
      return l.perfiles?.nombre?.toLowerCase().includes(q)
        || l.evento?.toLowerCase().includes(q)
        || JSON.stringify(l.detalle ?? l.datos ?? {}).toLowerCase().includes(q)
    })
  }, [logs, busca, evento, soloDinero])

  return (
    <GerenciaLayout
      titulo="Auditoría"
      descripcion={`${filas.length} de ${logs.length} registros`}
    >
      <div className="max-w-[1400px] space-y-4">

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F1F5F9' }}>
            <button onClick={() => setEvento(null)}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition"
              style={{
                background: evento === null ? '#FFFFFF' : 'transparent',
                color:      evento === null ? '#0D2B5E' : '#94A3B8',
                boxShadow:  evento === null ? '0 1px 3px rgba(13,43,94,0.08)' : 'none',
              }}>
              Todo
            </button>
            {eventosPresentes.slice(0, 6).map(e => (
              <button key={e} onClick={() => setEvento(e)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition
                  whitespace-nowrap"
                style={{
                  background: evento === e ? '#FFFFFF' : 'transparent',
                  color:      evento === e ? '#0D2B5E' : '#94A3B8',
                  boxShadow:  evento === e ? '0 1px 3px rgba(13,43,94,0.08)' : 'none',
                }}>
                {conf(e).label}
              </button>
            ))}
          </div>

          <button onClick={() => setSoloDinero(v => !v)}
            className="px-3 py-2 rounded-lg text-[12px] font-semibold flex items-center
              gap-1.5 transition"
            style={{
              background: soloDinero ? '#0D2B5E' : '#EEF2F8',
              color:      soloDinero ? '#FFFFFF' : '#1565C0',
            }}>
            <DollarSign size={13} /> Solo dinero
          </button>

          <div className="relative flex-1 max-w-sm ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
              text-slate-400" />
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por persona o contenido"
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

        <section className="bg-white rounded-2xl overflow-hidden"
          style={{ border: '1px solid #E8EDF5' }}>
          {isLoading ? (
            <div className="py-24 flex justify-center">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
                rounded-full animate-spin" />
            </div>
          ) : filas.length === 0 ? (
            <div className="py-24 text-center">
              <ScrollText size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Sin registros</p>
              <p className="text-[13px] text-slate-400 mt-1">
                {logs.length === 0
                  ? 'La auditoría empieza a llenarse con la actividad del sistema'
                  : 'Prueba con otro filtro'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[calc(100vh-280px)]
              overflow-y-auto">
              {filas.map(l => {
                const c = conf(l.evento)
                const Icono = c.icono
                return (
                  <button key={l.id} onClick={() => setDetalle(l)}
                    className="w-full px-6 py-3.5 flex items-center gap-4
                      hover:bg-slate-50/60 transition text-left">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center
                      flex-shrink-0" style={{ background: c.color + '18' }}>
                      <Icono size={16} style={{ color: c.color }} />
                    </div>

                    <div className="w-44 flex-shrink-0">
                      <p className="text-[13px] font-semibold text-slate-700">
                        {c.label}
                      </p>
                      {c.dinero && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: '#FEF3C7', color: '#B45309' }}>
                          DINERO
                        </span>
                      )}
                    </div>

                    <div className="w-40 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-300" />
                        <span className="text-[12px] text-slate-500 truncate">
                          {l.perfiles?.nombre ?? 'Sistema'}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-slate-400 truncate"
                        style={{ fontFamily: MONO }}>
                        {resumen(l)}
                      </p>
                    </div>

                    <span className="text-[11px] text-slate-400 flex-shrink-0 w-28
                      text-right">
                      {cuando(l.fecha_hora)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div className="px-5 py-4 rounded-xl flex gap-3" style={{ background: '#F8FAFC' }}>
          <ScrollText size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#94A3B8' }} />
          <p className="text-[12px] text-slate-500 leading-relaxed">
            La auditoría es de solo lectura y no se puede editar ni borrar. Cuando dos
            socios reparten dinero, el registro de quién cambió qué y cuándo es lo que
            evita conversaciones incómodas.
          </p>
        </div>
      </div>

      {detalle && <ModalDetalle log={detalle} onClose={() => setDetalle(null)} />}
    </GerenciaLayout>
  )
}

function resumen(l) {
  const d = l.detalle ?? l.datos ?? l.valor_nuevo ?? null
  if (!d) return l.entidad_id ? `#${String(l.entidad_id).slice(0, 8)}` : '—'
  if (typeof d === 'string') return d
  const partes = Object.entries(d)
    .filter(([, v]) => v != null && typeof v !== 'object')
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v}`)
  return partes.length ? partes.join(' · ') : '—'
}

function ModalDetalle({ log, onClose }) {
  const c = conf(log.evento)
  const Icono = c.icono

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(13,43,94,0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden
        max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

        <div className="px-7 py-5 flex items-center gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: c.color + '18' }}>
            <Icono size={18} style={{ color: c.color }} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">{c.label}</h2>
            <p className="text-[12px] text-slate-400">
              {log.fecha_hora
                ? new Date(log.fecha_hora).toLocaleString('es-VE', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })
                : '—'}
            </p>
          </div>
        </div>

        <div className="px-7 py-5 space-y-4 overflow-y-auto">
          <Campo label="Quién" valor={log.perfiles?.nombre ?? 'Sistema'} />
          {log.entidad && <Campo label="Entidad" valor={log.entidad} />}
          {log.entidad_id && <Campo label="ID" valor={log.entidad_id} mono />}

          {(log.valor_anterior || log.valor_nuevo) && (
            <div className="grid grid-cols-2 gap-3">
              {log.valor_anterior && (
                <Json titulo="Antes" datos={log.valor_anterior} color="#DC2626" />
              )}
              {log.valor_nuevo && (
                <Json titulo="Después" datos={log.valor_nuevo} color="#1B7A3E" />
              )}
            </div>
          )}

          {(log.detalle || log.datos) && !log.valor_nuevo && (
            <Json titulo="Detalle" datos={log.detalle ?? log.datos} color="#1565C0" />
          )}
        </div>
      </div>
    </div>
  )
}

function Campo({ label, valor, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[12px] text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-[13px] font-medium text-slate-700 text-right break-all"
        style={{ fontFamily: mono ? MONO : undefined }}>
        {valor}
      </span>
    </div>
  )
}

function Json({ titulo, datos, color }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-wider mb-1.5" style={{ color }}>
        {titulo.toUpperCase()}
      </p>
      <pre className="px-3 py-2.5 rounded-lg text-[11px] leading-relaxed
        overflow-x-auto whitespace-pre-wrap break-all"
        style={{ background: '#F8FAFC', fontFamily: MONO, color: '#475569' }}>
        {typeof datos === 'string' ? datos : JSON.stringify(datos, null, 2)}
      </pre>
    </div>
  )
}
