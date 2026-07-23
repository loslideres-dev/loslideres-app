import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, ChevronRight, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { usePaquetes } from '../../hooks/usePaquetes'
import ClienteLayout from '../../components/layout/ClienteLayout'
import EstadoBadge from '../../components/ui/EstadoBadge'

const FILTROS = [
  { label: 'Todos',        value: null },
  { label: 'Recibidos',    value: 'RECIBIDO' },
  { label: 'En tránsito',  value: 'EN_TRANSITO' },
  { label: 'En reparto',   value: 'EN_REPARTO' },
  { label: 'Entregados',   value: 'ENTREGADO' },
]

function formatFecha(fecha) {
  if (!fecha) return null
  return new Date(fecha).toLocaleDateString('es-VE', {
    day: 'numeric', month: 'short'
  })
}

function PaqueteCard({ paquete, onClick }) {
  const entregado = paquete.estado === 'ENTREGADO'

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-sm overflow-hidden
        flex items-stretch active:scale-95 transition text-left"
    >
      {/* Foto */}
      <div className="w-24 h-24 flex-shrink-0 bg-slate-100 relative">
        {paquete.foto_url
          ? <img src={paquete.foto_url} alt="paquete"
              className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              <Package size={28} className="text-slate-300" />
            </div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 px-4 py-3 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <p className="text-xs text-slate-400 font-mono">{paquete.codigo}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {paquete.descripcion} · {paquete.tienda}
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
          </div>

          <p className="text-xs text-slate-400 mb-2">
            {[paquete.largo_cm, paquete.ancho_cm, paquete.alto_cm]
              .filter(Boolean).join(' × ')} cm
            {paquete.peso_kg ? ` · ${paquete.peso_kg} kg` : ''}
            {paquete.tamanio ? ` · ${paquete.tamanio}` : ''}
          </p>

          <EstadoBadge estado={paquete.estado} />
        </div>

        <div className="flex items-center justify-between mt-2">
          {paquete.precio_final
            ? <span className="text-sm font-bold" style={{ color: '#1565C0' }}>
                ${paquete.precio_final} <span className="text-xs font-normal text-slate-400">USD</span>
              </span>
            : <span className="text-xs text-slate-400 italic">Precio pendiente</span>
          }
          <span className="text-xs text-slate-400">
            {entregado
              ? `Entregado ${formatFecha(paquete.fecha_entrega)}`
              : paquete.fecha_estimada
                ? `Llega est. ${formatFecha(paquete.fecha_estimada)}`
                : null
            }
          </span>
        </div>

        {/* Receptor si entregado */}
        {entregado && paquete.nombre_receptor && (
          <p className="text-xs text-slate-400 mt-1">
            Recibido por <span className="font-medium text-slate-600">
              {paquete.nombre_receptor}
            </span>
          </p>
        )}
      </div>
    </button>
  )
}

export default function Paquetes() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const [filtro, setFiltro] = useState(null)

  const { data: paquetes = [], isLoading, isError, refetch } = usePaquetes()

  const nombre = user?.user_metadata?.nombre
    ?? user?.email?.split('@')[0]
    ?? 'Cliente'
  const codigo = user?.user_metadata?.codigo_casillero ?? '????'

  const filtrados = filtro
    ? paquetes.filter(p => p.estado === filtro)
    : paquetes

  const enTransito = paquetes.filter(p =>
    ['EN_TRANSITO','EN_REPARTO','TARIFADO','RECIBIDO'].includes(p.estado)).length
  const entregados = paquetes.filter(p => p.estado === 'ENTREGADO').length

  return (
    <ClienteLayout>
      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-5" style={{ background: '#0D2B5E' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-sky-300 text-xs mb-0.5">
              Casillero {codigo}
            </p>
            <h1 className="text-white text-xl font-bold">Mis paquetes</h1>
          </div>
          <button onClick={() => refetch()}
            className="text-slate-400 hover:text-white transition p-1">
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Contadores */}
        {!isLoading && (
          <div className="flex gap-3 mt-4">
            <div className="flex-1 rounded-xl px-4 py-3 text-center"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-white text-2xl font-black">{enTransito}</p>
              <p className="text-sky-300 text-xs mt-0.5">En tránsito</p>
            </div>
            <div className="flex-1 rounded-xl px-4 py-3 text-center"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-white text-2xl font-black">{entregados}</p>
              <p className="text-sky-300 text-xs mt-0.5">Entregados</p>
            </div>
            <div className="flex-1 rounded-xl px-4 py-3 text-center"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-white text-2xl font-black">{paquetes.length}</p>
              <p className="text-sky-300 text-xs mt-0.5">Total</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Filtros ── */}
      <div className="px-5 py-3 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {FILTROS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setFiltro(value)}
              className={`px-4 py-2 rounded-full text-xs font-semibold
                transition whitespace-nowrap border
                ${filtro === value
                  ? 'text-white border-transparent'
                  : 'bg-white text-slate-500 border-slate-200'}`}
              style={filtro === value
                ? { background: '#1565C0', borderColor: '#1565C0' }
                : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista ── */}
      <div className="px-5 space-y-3 pb-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">Error cargando paquetes</p>
            <button onClick={() => refetch()}
              className="mt-2 text-blue-600 text-sm font-medium">
              Reintentar
            </button>
          </div>
        )}

        {!isLoading && !isError && filtrados.length === 0 && (
          <div className="text-center py-16">
            <Package size={48} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              {filtro ? 'No hay paquetes con ese estado' : 'No tienes paquetes aún'}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Usa tu código {codigo} al comprar
            </p>
          </div>
        )}

        {!isLoading && filtrados.map(paquete => (
          <PaqueteCard
            key={paquete.id}
            paquete={paquete}
            onClick={() => navigate(`/cliente/paquetes/${paquete.id}`)}
          />
        ))}
      </div>
    </ClienteLayout>
  )
}