import { useNavigate } from 'react-router-dom'
import { Package, Truck, CheckCircle, Clock, RefreshCw, ChevronRight } from 'lucide-react'
import { useDashboardStats, usePaquetesAdmin } from '../../hooks/usePaquetes'
import AdminLayout from '../../components/layout/AdminLayout'
import EstadoBadge from '../../components/ui/EstadoBadge'

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <button onClick={onClick}
      className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm
        active:scale-95 transition w-full text-left">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + '20' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-black text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <ChevronRight size={16} className="text-slate-300" />
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: stats = {}, isLoading: loadStats, refetch } = useDashboardStats()
  const { data: recientes = [], isLoading: loadRec } = usePaquetesAdmin('RECIBIDO')

  return (
    <AdminLayout title="Dashboard">
      <div className="px-5 py-4">

        {/* Stats */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-400 tracking-wider">RESUMEN</p>
          <button onClick={() => refetch()} className="text-slate-400 hover:text-slate-600">
            <RefreshCw size={16} />
          </button>
        </div>

        {loadStats
          ? <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          : <div className="space-y-2 mb-5">
              <StatCard icon={Clock}        label="Pendientes de precio"  value={stats.pendientes_precio ?? 0} color="#0EA5E9"
                onClick={() => navigate('/admin/paquetes?estado=RECIBIDO')} />
              <StatCard icon={Truck}        label="En tránsito"           value={stats.en_transito ?? 0}      color="#F59E0B"
                onClick={() => navigate('/admin/paquetes?estado=EN_TRANSITO')} />
              <StatCard icon={Package}      label="En reparto"            value={stats.en_reparto ?? 0}       color="#8B5CF6"
                onClick={() => navigate('/admin/paquetes?estado=EN_REPARTO')} />
              <StatCard icon={CheckCircle}  label="Entregados hoy"        value={stats.entregados_hoy ?? 0}   color="#10B981"
                onClick={() => navigate('/admin/paquetes?estado=ENTREGADO')} />
            </div>
        }

        {/* Cola de tarifación */}
        {recientes.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-400 tracking-wider mb-3">
              PENDIENTES DE PRECIO ({recientes.length})
            </p>
            <div className="space-y-2">
              {recientes.slice(0, 5).map(p => (
                <button key={p.id}
                  onClick={() => navigate(`/admin/paquetes?tarificar=${p.id}`)}
                  className="w-full bg-white rounded-2xl flex items-stretch overflow-hidden
                    shadow-sm active:scale-95 transition text-left">
                  <div className="w-16 h-16 flex-shrink-0 bg-slate-100">
                    {p.foto_url
                      ? <img src={p.foto_url} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Package size={20} className="text-slate-300" />
                        </div>
                    }
                  </div>
                  <div className="flex-1 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-slate-400">{p.codigo}</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {p.perfiles?.nombre ?? 'Cliente'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.tamanio ?? '—'}
                        {p.peso_kg ? ` · ${p.peso_kg}kg` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full text-white"
                      style={{ background: '#1565C0' }}>
                      Tarifar
                    </span>
                  </div>
                </button>
              ))}
              {recientes.length > 5 && (
                <button onClick={() => navigate('/admin/paquetes?estado=RECIBIDO')}
                  className="w-full py-3 text-sm font-medium text-blue-600 text-center">
                  Ver todos ({recientes.length}) →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
