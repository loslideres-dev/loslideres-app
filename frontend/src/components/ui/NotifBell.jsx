import { useState } from 'react'
import { Bell, Package, Check, UserPlus, Truck, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import {
  useNotificaciones, useMarcarLeida, useMarcarTodasLeidas,
} from '../../hooks/useNotificaciones'

const ICONO_TIPO = {
  paquete_recibido: Package,
  cambio_estado:    Truck,
  paquete_entregado: Check,
  nuevo_usuario:    UserPlus,
  paquete_asignado: Truck,
  default:          Bell,
}

function tiempoRelativo(fecha) {
  const diff = (Date.now() - new Date(fecha).getTime()) / 1000
  if (diff < 60)      return 'hace un momento'
  if (diff < 3600)    return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400)   return `hace ${Math.floor(diff / 3600)} h`
  return new Date(fecha).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
}

export default function NotifBell() {
  const { user } = useAuthStore()
  const [abierto, setAbierto] = useState(false)

  const { data: notifs = [] } = useNotificaciones(user?.id)
  const { mutate: marcarLeida }       = useMarcarLeida()
  const { mutate: marcarTodasLeidas } = useMarcarTodasLeidas()

  const noLeidas = notifs.filter(n => !n.leida).length

  return (
    <>
      {/* Botón campana */}
      <button onClick={() => setAbierto(true)}
        className="relative text-slate-300 hover:text-white transition p-1 active:scale-95">
        <Bell size={20} />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
            rounded-full bg-red-500 text-white text-[10px] font-bold
            flex items-center justify-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <div className="fixed inset-0 z-50 flex justify-center"
          style={{ background: 'rgba(13,43,94,0.4)' }}
          onClick={() => setAbierto(false)}>
          <div className="w-full max-w-lg bg-white flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4
              border-b border-slate-100 flex-shrink-0"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
              <div className="flex items-center gap-2">
                <Bell size={18} style={{ color: '#1565C0' }} />
                <h3 className="text-base font-semibold text-slate-800">
                  Notificaciones
                </h3>
              </div>
              <button onClick={() => setAbierto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center
                  justify-center active:scale-95">
                <X size={16} className="text-slate-600" />
              </button>
            </div>

            {/* Acción marcar todas */}
            {noLeidas > 0 && (
              <button onClick={() => marcarTodasLeidas(user.id)}
                className="text-xs font-semibold py-2.5 border-b border-slate-100
                  active:scale-95" style={{ color: '#1565C0' }}>
                Marcar todas como leídas ({noLeidas})
              </button>
            )}

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="text-center py-16">
                  <Bell size={44} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No tienes notificaciones</p>
                </div>
              ) : (
                notifs.map(n => {
                  const Icon = ICONO_TIPO[n.tipo] ?? ICONO_TIPO.default
                  return (
                    <button key={n.id}
                      onClick={() => !n.leida && marcarLeida(n.id)}
                      className={`w-full flex items-start gap-3 px-5 py-4 text-left
                        border-b border-slate-50 transition
                        ${n.leida ? 'bg-white' : 'bg-blue-50/40'}`}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center
                        flex-shrink-0"
                        style={{ background: n.leida ? '#F1F5F9' : '#DBEAFE' }}>
                        <Icon size={16}
                          style={{ color: n.leida ? '#94A3B8' : '#1565C0' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${n.leida
                            ? 'font-medium text-slate-600'
                            : 'font-semibold text-slate-800'}`}>
                            {n.titulo}
                          </p>
                          {!n.leida && (
                            <span className="w-2 h-2 rounded-full bg-blue-500
                              flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 break-words">
                          {n.mensaje}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {tiempoRelativo(n.created_at)}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
