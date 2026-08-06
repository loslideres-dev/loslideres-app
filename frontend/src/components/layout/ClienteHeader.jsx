import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useMiPerfil } from '../../hooks/usePerfiles'
import NotifBell from '../ui/NotifBell'

/**
 * Header único de las pantallas del cliente.
 *
 * Antes cada pantalla armaba el suyo y quedaban desiguales: en Paquetes no
 * había forma de cerrar sesión, y en Perfil no se veían las notificaciones.
 * Que la campana y el salir estén siempre en el mismo sitio no es estética:
 * es que el usuario no tenga que aprender tres pantallas distintas.
 *
 * @param titulo     Título grande de la pantalla
 * @param subtitulo  Línea pequeña encima del título
 * @param acciones   Botones extra (ej. refrescar), a la izquierda de la campana
 * @param children   Contenido que va debajo, dentro del bloque azul
 */
export default function ClienteHeader({ titulo, subtitulo, acciones, children }) {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { data: perfil } = useMiPerfil(user?.id)

  const nombre = perfil?.nombre
    ?? user?.user_metadata?.nombre
    ?? user?.email?.split('@')[0]
    ?? 'Cliente'
  const iniciales = nombre.slice(0, 2).toUpperCase()

  const salir = async () => {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex-shrink-0 px-5 pt-12 pb-5" style={{ background: '#0D2B5E' }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          {subtitulo && (
            <p className="text-sky-300 text-xs mb-0.5 truncate">{subtitulo}</p>
          )}
          <h1 className="text-white text-xl font-bold truncate">{titulo}</h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {acciones}
          <NotifBell />
          <button
            onClick={() => navigate('/cliente/perfil')}
            aria-label="Mi perfil"
            className="w-9 h-9 rounded-full flex items-center justify-center
              text-white text-sm font-bold overflow-hidden active:scale-95 transition"
            style={{ background: '#1565C0' }}>
            {perfil?.avatar_url
              ? <img src={perfil.avatar_url} alt="" className="w-full h-full object-cover" />
              : iniciales}
          </button>
          <button onClick={salir} aria-label="Cerrar sesión"
            className="text-slate-400 hover:text-white transition p-1 active:scale-95">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {children}
    </div>
  )
}
