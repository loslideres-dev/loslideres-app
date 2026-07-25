import { useState } from 'react'
import { Truck, DollarSign, Package, Calendar } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useReporteConductor } from '../../hooks/useReportes'
import ConductorLayout from '../../components/layout/ConductorLayout'

function inicioMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}
function hoy() {
  return new Date().toISOString().split('T')[0]
}

export default function ReporteConductor() {
  const { user } = useAuthStore()
  const [desde, setDesde] = useState(inicioMes())
  const [hasta, setHasta] = useState(hoy())

  const { data, isLoading } = useReporteConductor(user?.id, desde, hasta)

  return (
    <ConductorLayout>
      <div className="px-5 py-4">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Mi reporte</h2>
        <p className="text-slate-500 text-sm mb-4">
          Entregas y montos en el periodo seleccionado
        </p>

        {/* Filtro de fechas */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} style={{ color: '#1565C0' }} />
            <p className="text-xs font-semibold text-slate-400 tracking-wider">
              PERIODO
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Desde</label>
              <input type="date" value={desde}
                onChange={e => setDesde(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200
                  text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Hasta</label>
              <input type="date" value={hasta}
                onChange={e => setHasta(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200
                  text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl p-5 text-white" style={{ background: '#1565C0' }}>
                <Package size={22} className="mb-2 opacity-80" />
                <p className="text-3xl font-black">{data?.totalEntregados ?? 0}</p>
                <p className="text-blue-200 text-xs mt-0.5">Paquetes entregados</p>
              </div>
              <div className="rounded-2xl p-5 text-white" style={{ background: '#1B7A3E' }}>
                <DollarSign size={22} className="mb-2 opacity-80" />
                <p className="text-3xl font-black">${data?.totalTraslados ?? 0}</p>
                <p className="text-green-200 text-xs mt-0.5">Ganado en traslados (USD)</p>
              </div>
            </div>

            {/* Detalle */}
            <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
              DETALLE DE ENTREGAS
            </p>
            <div className="space-y-2">
              {(data?.paquetes ?? []).length === 0 && (
                <div className="text-center py-10">
                  <Truck size={40} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">
                    Sin entregas en este periodo
                  </p>
                </div>
              )}
              {(data?.paquetes ?? []).map(p => (
                <div key={p.id}
                  className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-slate-400">{p.codigo}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.fecha_entrega
                        ? new Date(p.fecha_entrega).toLocaleDateString('es-VE', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })
                        : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: '#1B7A3E' }}>
                      +${p.monto_traslado ?? 0}
                    </p>
                    <p className="text-xs text-slate-400">traslado</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ConductorLayout>
  )
}
