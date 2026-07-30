import { useNavigate } from 'react-router-dom'
import {
  Package, Truck, CheckCircle, Clock, RefreshCw, ChevronRight,
  Users, Settings, Building2, Calculator,
} from 'lucide-react'
import { useDashboardStats, usePaquetesAdmin } from '../../hooks/usePaquetes'
import { useAuthStore } from '../../store/authStore'
import AdminLayout from '../../components/layout/AdminLayout'

/* Contador compacto. Cuatro en una fila: ocupa ~1/3 de lo que ocupaban
   las tarjetas anchas y deja la pantalla para los accesos de gestión. */
function StatTile({ icon: Icon, label, value, color, onClick }) {
  return (
    <button onClick={onClick}
      className="bg-white rounded-2xl px-2 py-3 shadow-sm active:scale-95 transition
        flex flex-col items-center justify-start gap-1.5 text-center">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: color + '20' }}>
        <Icon size={15} style={{ color }} />
      </div>
      <p className="text-xl font-bold font-mono leading-none text-slate-800">{value}</p>
      <p className="text-[10px] leading-tight text-slate-500">{label}</p>
    </button>
  )
}

function AccesoCard({ icon: Icon, label, desc, color, onClick }) {
  return (
    <button onClick={onClick}
      className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm
        active:scale-95 transition w-full text-left">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + '20' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 leading-snug">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: stats = {}, isLoading: loadStats, refetch } = useDashboardStats()
  const { data: recientes = [] } = usePaquetesAdmin('RECIBIDO')
  const roles = useAuthStore(s => s.roles)
  const esGerente = roles.includes('gerente')

  return (
    <AdminLayout title="Dashboard">
      <div className="px-5 py-4">

        {/* Resumen */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 tracking-wider">RESUMEN</p>
          <button onClick={() => refetch()} className="text-slate-400 hover:text-slate-600">
            <RefreshCw size={16} />
          </button>
        </div>

        {loadStats
          ? <div className="flex justify-center py-6 mb-5">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          : <div className="grid grid-cols-4 gap-2 mb-5">
              <StatTile icon={Clock}       label="Por tarifar"    value={stats.pendientes_precio ?? 0} color="#0EA5E9"
                onClick={() => navigate('/admin/paquetes?estado=RECIBIDO')} />
              <StatTile icon={Truck}       label="En tránsito"    value={stats.en_transito ?? 0}       color="#F59E0B"
                onClick={() => navigate('/admin/paquetes?estado=EN_TRANSITO')} />
              <StatTile icon={Package}     label="En reparto"     value={stats.en_reparto ?? 0}        color="#8B5CF6"
                onClick={() => navigate('/admin/paquetes?estado=EN_REPARTO')} />
              <StatTile icon={CheckCircle} label="Entregados hoy" value={stats.entregados_hoy ?? 0}    color="#10B981"
                onClick={() => navigate('/admin/paquetes?estado=ENTREGADO')} />
            </div>
        }

        {/* Accesos */}
        <p className="text-xs font-semibold text-slate-400 tracking-wider mb-3">
          GESTIÓN
        </p>
        <div className="space-y-2 mb-5">
          <AccesoCard icon={Calculator} label="Calculadora"
            desc="Cotiza varios paquetes y arma el mensaje de WhatsApp"
            color="#1B7A3E"
            onClick={() => navigate('/admin/calculadora')} />
          {esGerente && (
            <AccesoCard icon={Building2} label="Gerencia"
              desc="Consola de escritorio: contabilidad, socios y análisis"
              color="#0D2B5E"
              onClick={() => navigate('/gerencia')} />
          )}
          <AccesoCard icon={Users} label="Usuarios"
            desc="Clientes, bodegueros, conductores y administradores"
            color="#8B5CF6"
            onClick={() => navigate('/admin/usuarios')} />
          <AccesoCard icon={Settings} label="Tarifas"
            desc="Precios por tamaño y pago al bodeguero"
            color="#0EA5E9"
            onClick={() => navigate('/admin/tarifas')} />
        </div>

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
