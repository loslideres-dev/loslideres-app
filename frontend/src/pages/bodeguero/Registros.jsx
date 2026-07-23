import { Package, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { usePaquetesHoy } from '../../hooks/usePaquetes'
import BodegueroLayout from '../../components/layout/BodegueroLayout'
import EstadoBadge from '../../components/ui/EstadoBadge'

export default function Registros() {
  const { user } = useAuthStore()
  const { data: paquetes = [], isLoading, refetch } = usePaquetesHoy(user?.id)

  return (
    <BodegueroLayout>
      <div className="px-5 py-4">

        {/* Counter */}
        <div className="rounded-2xl p-5 mb-4 flex items-center justify-between"
          style={{ background: '#1565C0' }}>
          <div>
            <p className="text-blue-200 text-xs mb-0.5">REGISTRADOS HOY</p>
            <p className="text-white text-4xl font-black">{paquetes.length}</p>
            <p className="text-blue-200 text-xs mt-0.5">paquetes</p>
          </div>
          <button onClick={() => refetch()} className="text-blue-200 hover:text-white transition">
            <RefreshCw size={22} />
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && paquetes.length === 0 && (
          <div className="text-center py-16">
            <Package size={48} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No has registrado paquetes hoy</p>
          </div>
        )}

        <div className="space-y-3">
          {paquetes.map(p => (
            <div key={p.id} className="bg-white rounded-2xl overflow-hidden flex items-stretch shadow-sm">
              {/* Foto */}
              <div className="w-20 h-20 flex-shrink-0 bg-slate-100">
                {p.foto_url
                  ? <img src={p.foto_url} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <Package size={24} className="text-slate-300" />
                    </div>
                }
              </div>
              <div className="flex-1 px-4 py-3">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs font-mono text-slate-400">{p.codigo}</p>
                  <EstadoBadge estado={p.estado} />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {p.perfiles?.nombre ?? 'Cliente'}
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  {p.perfiles?.codigo_casillero}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {[p.largo_cm, p.ancho_cm, p.alto_cm].filter(Boolean).join('×')} cm
                  {p.peso_kg ? ` · ${p.peso_kg}kg` : ''}
                  {p.tamanio ? ` · ${p.tamanio}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BodegueroLayout>
  )
}
