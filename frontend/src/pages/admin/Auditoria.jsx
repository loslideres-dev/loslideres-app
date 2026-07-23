import { useState } from 'react'
import { Shield, Download, RefreshCw } from 'lucide-react'
import { useAuditoria } from '../../hooks/useAuditoria'
import AdminLayout from '../../components/layout/AdminLayout'

const EVENTO_COLOR = {
  paquete_registrado:  { bg: '#EEF2F8', text: '#1565C0',  label: 'Registro' },
  paquete_tarifado:    { bg: '#FEF3C7', text: '#B45309',  label: 'Tarifación' },
  paquete_despachado:  { bg: '#EDE9FE', text: '#5B21B6',  label: 'Despacho' },
  tarifa_actualizada:  { bg: '#FEE2E2', text: '#991B1B',  label: 'Tarifa' },
  paquete_entregado:   { bg: '#E6F4EC', text: '#1B7A3E',  label: 'Entrega' },
}

function formatFecha(f) {
  return new Date(f).toLocaleString('es-VE', {
    day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
  })
}

function downloadCSV(rows) {
  const headers = ['fecha','evento','entidad','entidad_id','usuario','valor_anterior','valor_nuevo']
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      r.fecha_hora, r.evento, r.entidad, r.entidad_id ?? '',
      r.perfiles?.nombre ?? r.usuario_id ?? '',
      JSON.stringify(r.valor_anterior ?? ''),
      JSON.stringify(r.valor_nuevo ?? ''),
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `auditoria-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function Auditoria() {
  const [filtroEvento, setFiltroEvento] = useState('')
  const { data: logs = [], isLoading, refetch } = useAuditoria({
    evento: filtroEvento || undefined,
    limite: 100,
  })

  return (
    <AdminLayout title="Auditoría">
      <div className="px-5 py-4">

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4">
          <select value={filtroEvento} onChange={e => setFiltroEvento(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white
              text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos los eventos</option>
            {Object.entries(EVENTO_COLOR).map(([k,v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={() => refetch()}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200
              flex items-center justify-center text-slate-400 hover:text-slate-600">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => downloadCSV(logs)}
            className="w-10 h-10 rounded-xl border-2 flex items-center justify-center"
            style={{ borderColor: '#1565C0', color: '#1565C0' }}>
            <Download size={16} />
          </button>
        </div>

        {/* Contador */}
        <p className="text-xs text-slate-400 mb-3">{logs.length} registros</p>

        {isLoading
          ? <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          : <div className="space-y-2">
              {logs.map(log => {
                const ev = EVENTO_COLOR[log.evento] ?? { bg: '#F4F6FA', text: '#555', label: log.evento }
                return (
                  <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: ev.bg, color: ev.text }}>
                        {ev.label}
                      </span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {formatFecha(log.fecha_hora)}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-500 mb-1">
                      {log.entidad_id ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400">
                      por <span className="font-medium text-slate-600">
                        {log.perfiles?.nombre ?? log.usuario_id ?? 'sistema'}
                      </span>
                    </p>
                    {(log.valor_nuevo || log.valor_anterior) && (
                      <div className="mt-2 bg-slate-50 rounded-lg p-2">
                        {log.valor_anterior && (
                          <p className="text-xs text-slate-400 font-mono truncate">
                            - {JSON.stringify(log.valor_anterior)}
                          </p>
                        )}
                        {log.valor_nuevo && (
                          <p className="text-xs text-slate-600 font-mono truncate">
                            + {JSON.stringify(log.valor_nuevo)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {logs.length === 0 && (
                <div className="text-center py-14">
                  <Shield size={44} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Sin registros de auditoría</p>
                </div>
              )}
            </div>
        }
      </div>
    </AdminLayout>
  )
}
