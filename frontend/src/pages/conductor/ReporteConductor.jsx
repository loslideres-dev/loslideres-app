import { useState } from 'react'
import {
  DollarSign, Package, History, Check, Calendar, Clock, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { usePendienteConductor } from '../../hooks/useReportes'
import { useLiquidaciones, usePaquetesDeLiquidacion } from '../../hooks/useLiquidaciones'
import ConductorLayout from '../../components/layout/ConductorLayout'
import Modal from '../../components/ui/Modal'

const fmtUSD = n => `$${(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

function fechaCorta(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
}
function fechaLarga(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ReporteConductor() {
  const { user } = useAuthStore()
  const [verLiq, setVerLiq] = useState(null)

  const { data: pendiente, isLoading } = usePendienteConductor(user?.id)
  const { data: liquidaciones = [], isLoading: loadLiq } =
    useLiquidaciones({ tipo: 'conductor', usuarioId: user?.id })

  const totalHistorico = liquidaciones
    .reduce((s, l) => s + (Number(l.total_usd) || 0), 0)

  return (
    <ConductorLayout>
      <div className="px-5 py-4">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Mi reporte</h2>
        <p className="text-slate-500 text-sm mb-4">
          Lo que llevas acumulado desde tu último pago
        </p>

        {isLoading ? <Spinner /> : (
          <>
            {/* ── Periodo actual ── */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-2xl p-5 text-white" style={{ background: '#1565C0' }}>
                <Package size={22} className="mb-2 opacity-80" />
                <p className="text-3xl font-black">{pendiente?.totalEntregados ?? 0}</p>
                <p className="text-blue-200 text-xs mt-0.5">Paquetes entregados</p>
              </div>
              <div className="rounded-2xl p-5 text-white" style={{ background: '#1B7A3E' }}>
                <DollarSign size={22} className="mb-2 opacity-80" />
                <p className="text-3xl font-black">
                  {fmtUSD(pendiente?.totalTraslados ?? 0)}
                </p>
                <p className="text-green-200 text-xs mt-0.5">Por cobrar (USD)</p>
              </div>
            </div>

            {/* Info del periodo */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <p className="text-sm text-slate-500">Acumulando desde</p>
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {pendiente?.desde ? fechaCorta(pendiente.desde) : 'Sin entregas'}
                </p>
              </div>
            </div>

            {/* ── Histórico de liquidaciones ── */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 tracking-wider">
                MIS LIQUIDACIONES
              </p>
              {liquidaciones.length > 0 && (
                <p className="text-xs text-slate-400">
                  Total cobrado:{' '}
                  <span className="font-bold" style={{ color: '#1B7A3E' }}>
                    {fmtUSD(totalHistorico)}
                  </span>
                </p>
              )}
            </div>

            {loadLiq ? <Spinner /> : (
              <div className="space-y-2">
                {liquidaciones.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl">
                    <History size={40} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-600 text-sm font-medium">
                      Aún no tienes pagos registrados
                    </p>
                    <p className="text-slate-400 text-xs mt-1 px-6">
                      Cuando administración cierre tu periodo, el pago aparecerá aquí
                    </p>
                  </div>
                )}
                {liquidaciones.map(l => (
                  <button key={l.id} onClick={() => setVerLiq(l)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center
                      gap-3 active:scale-95 transition text-left">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center
                      flex-shrink-0" style={{ background: '#E6F4EC' }}>
                      <Check size={18} style={{ color: '#1B7A3E' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {fechaCorta(l.fecha_cierre)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {l.cantidad_paquetes}{' '}
                        {l.cantidad_paquetes === 1 ? 'entrega' : 'entregas'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: '#1B7A3E' }}>
                        {fmtUSD(l.total_usd)}
                      </p>
                      <p className="text-[10px] text-slate-400">USD</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {verLiq && (
        <ModalDetalle liquidacion={verLiq} onClose={() => setVerLiq(null)} />
      )}
    </ConductorLayout>
  )
}

// ── Modal de detalle de una liquidación ──
function ModalDetalle({ liquidacion, onClose }) {
  const { data: paquetes = [], isLoading } =
    usePaquetesDeLiquidacion(liquidacion.id, 'conductor')

  return (
    <Modal open onClose={onClose} title="Detalle del pago">
      <div className="space-y-4">

        <div className="rounded-2xl p-5 text-center text-white"
          style={{ background: '#1B7A3E' }}>
          <p className="text-xs opacity-80 mb-1">RECIBIDO</p>
          <p className="text-4xl font-black">{fmtUSD(liquidacion.total_usd)}</p>
          <p className="text-xs opacity-70 mt-1">
            USD · {liquidacion.cantidad_paquetes} entregas
          </p>
        </div>

        <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3">
          <Calendar size={15} style={{ color: '#1565C0' }} />
          <div>
            <p className="text-xs text-slate-400">Fecha del pago</p>
            <p className="text-sm font-semibold text-slate-800">
              {fechaLarga(liquidacion.fecha_cierre)}
            </p>
          </div>
        </div>

        {liquidacion.notas && (
          <div className="bg-white rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-1">Notas</p>
            <p className="text-sm text-slate-700">{liquidacion.notas}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
            ENTREGAS INCLUIDAS
          </p>
          {isLoading ? <Spinner /> : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {paquetes.map(p => (
                <div key={p.id}
                  className="bg-white rounded-xl px-4 py-2.5 flex items-center
                    justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-slate-500 truncate">
                      {p.tracking_externo ?? p.codigo}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {fechaCorta(p.fecha_entrega)}
                      {p.tamanio ? ` · ${p.tamanio}` : ''}
                    </p>
                  </div>
                  <p className="text-xs font-bold flex-shrink-0"
                    style={{ color: '#1B7A3E' }}>
                    +{fmtUSD(p.monto_traslado)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
        rounded-full animate-spin" />
    </div>
  )
}
