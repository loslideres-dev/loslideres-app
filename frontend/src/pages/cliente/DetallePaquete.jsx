import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Package, MapPin, Calendar, User, CreditCard } from 'lucide-react'
import EstadoBadge from '../../components/ui/EstadoBadge'
import ClienteLayout from '../../components/layout/ClienteLayout'

const TIMELINE = [
  { estado: 'RECIBIDO',    label: 'Recibido en bodega',   field: 'fecha_recepcion' },
  { estado: 'TARIFADO',    label: 'Precio asignado',       field: 'updated_at'      },
  { estado: 'EN_TRANSITO', label: 'En camino a Maracaibo', field: 'updated_at'      },
  { estado: 'EN_REPARTO',  label: 'En reparto',            field: 'updated_at'      },
  { estado: 'ENTREGADO',   label: 'Entregado',             field: 'fecha_entrega'   },
]

const ORDEN = ['RECIBIDO','TARIFADO','EN_TRANSITO','EN_REPARTO','ENTREGADO']

function formatFecha(fecha) {
  if (!fecha) return null
  return new Date(fecha).toLocaleDateString('es-VE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: '#EEF2F8' }}>
        <Icon size={15} style={{ color: '#1565C0' }} />
      </div>
      <div>
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  )
}

export default function DetallePaquete() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const { data: paquete, isLoading, isError } = useQuery({
    queryKey: ['paquete', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })

  if (isLoading) return (
    <ClienteLayout>
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
          rounded-full animate-spin" />
      </div>
    </ClienteLayout>
  )

  if (isError || !paquete) return (
    <ClienteLayout>
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Package size={48} className="text-slate-200" />
        <p className="text-slate-500 text-sm">Paquete no encontrado</p>
        <button onClick={() => navigate(-1)}
          className="text-blue-600 text-sm font-medium">
          Volver
        </button>
      </div>
    </ClienteLayout>
  )

  const estadoIdx = ORDEN.indexOf(paquete.estado)

  return (
    <ClienteLayout>

      {/* ── Header con foto ── */}
      <div className="relative" style={{ background: '#0D2B5E' }}>
        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 z-10 w-9 h-9 rounded-full
            flex items-center justify-center transition"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Foto */}
        <div className="w-full h-56 bg-slate-800">
          {paquete.foto_url
            ? <img src={paquete.foto_url} alt="paquete"
                className="w-full h-full object-cover opacity-80" />
            : <div className="w-full h-full flex items-center justify-center">
                <Package size={64} className="text-slate-600" />
              </div>
          }
          {/* Gradiente abajo */}
          <div className="absolute bottom-0 left-0 right-0 h-20"
            style={{ background: 'linear-gradient(to top, #0D2B5E, transparent)' }} />
        </div>

        {/* Código y estado */}
        <div className="px-5 pb-5 pt-2">
          <p className="text-slate-400 text-xs font-mono mb-1">{paquete.codigo}</p>
          <div className="flex items-center justify-between">
            <h1 className="text-white text-lg font-bold">
              {paquete.descripcion}
              {paquete.tienda ? ` · ${paquete.tienda}` : ''}
            </h1>
            <EstadoBadge estado={paquete.estado} />
          </div>
        </div>
      </div>

      {/* ── Precio destacado ── */}
      {paquete.precio_final && (
        <div className="mx-5 -mt-1 mb-4 rounded-2xl p-4 flex items-center justify-between"
          style={{ background: '#1565C0' }}>
          <div>
            <p className="text-blue-200 text-xs mb-0.5">Precio de envío</p>
            <p className="text-white text-2xl font-black">
              ${paquete.precio_final}
              <span className="text-sm font-normal text-blue-200 ml-1">USD</span>
            </p>
          </div>
          {paquete.fecha_estimada && paquete.estado !== 'ENTREGADO' && (
            <div className="text-right">
              <p className="text-blue-200 text-xs mb-0.5">Entrega estimada</p>
              <p className="text-white text-sm font-semibold">
                {new Date(paquete.fecha_estimada).toLocaleDateString('es-VE', {
                  day: 'numeric', month: 'short'
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Timeline de estados ── */}
      <div className="mx-5 mb-4 bg-white rounded-2xl shadow-sm p-5">
        <p className="text-xs font-semibold text-slate-400 tracking-wider mb-4">
          SEGUIMIENTO
        </p>
        <div className="space-y-0">
          {TIMELINE.map(({ estado, label }, i) => {
            const done    = i <= estadoIdx
            const current = i === estadoIdx
            const last    = i === TIMELINE.length - 1
            return (
              <div key={estado} className="flex gap-3">
                {/* Línea y punto */}
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 border-2
                    transition-all
                    ${current
                      ? 'border-blue-600 bg-blue-600 scale-125'
                      : done
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-200 bg-white'}`}
                  />
                  {!last && (
                    <div className={`w-0.5 flex-1 my-1 min-h-6
                      ${done && i < estadoIdx ? 'bg-blue-600' : 'bg-slate-100'}`}
                    />
                  )}
                </div>
                {/* Label */}
                <div className="pb-4 last:pb-0">
                  <p className={`text-sm font-medium leading-tight
                    ${current
                      ? 'text-blue-700'
                      : done
                        ? 'text-slate-700'
                        : 'text-slate-300'}`}>
                    {label}
                  </p>
                  {current && (
                    <p className="text-xs text-blue-500 mt-0.5">Estado actual</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Detalles del paquete ── */}
      <div className="mx-5 mb-4 bg-white rounded-2xl shadow-sm p-5">
        <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
          DETALLES
        </p>
        <InfoRow
          icon={Package}
          label="Dimensiones y peso"
          value={[
            [paquete.largo_cm, paquete.ancho_cm, paquete.alto_cm]
              .filter(Boolean).join(' × ') + ' cm',
            paquete.peso_kg ? `${paquete.peso_kg} kg` : null,
            paquete.tamanio ? `Talla ${paquete.tamanio}` : null,
          ].filter(Boolean).join(' · ')}
        />
        <InfoRow
          icon={Calendar}
          label="Recibido en bodega"
          value={formatFecha(paquete.fecha_recepcion)}
        />
        {paquete.fecha_estimada && paquete.estado !== 'ENTREGADO' && (
          <InfoRow
            icon={Calendar}
            label="Fecha estimada de entrega"
            value={new Date(paquete.fecha_estimada).toLocaleDateString('es-VE', {
              weekday: 'long', day: 'numeric', month: 'long'
            })}
          />
        )}
        {paquete.observaciones && (
          <InfoRow
            icon={Package}
            label="Observaciones"
            value={paquete.observaciones}
          />
        )}
      </div>

      {/* ── Entrega (si está entregado) ── */}
      {paquete.estado === 'ENTREGADO' && (
        <div className="mx-5 mb-4 bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
            ENTREGA
          </p>
          <InfoRow
            icon={Calendar}
            label="Fecha de entrega"
            value={formatFecha(paquete.fecha_entrega)}
          />
          <InfoRow
            icon={User}
            label="Recibido por"
            value={paquete.nombre_receptor}
          />
          <InfoRow
            icon={CreditCard}
            label="Método de pago"
            value={paquete.metodo_pago}
          />
          {paquete.monto_cobrado && (
            <InfoRow
              icon={CreditCard}
              label="Monto cobrado"
              value={`$${paquete.monto_cobrado} USD`}
            />
          )}
        </div>
      )}

    </ClienteLayout>
  )
}