import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/login', { replace: true }); return }

      const user  = session.user
      setAuth(user, session)

      const roles = user?.user_metadata?.roles ?? ['cliente']

      // Redirección por prioridad de rol
      if (roles.includes('admin')) {
        navigate('/admin/dashboard', { replace: true }); return
      }
      if (roles.includes('bodeguero')) {
        navigate('/bodeguero/recepcion', { replace: true }); return
      }
      if (roles.includes('conductor')) {
        navigate('/conductor/entregas', { replace: true }); return
      }

      // Cliente puro: verificar onboarding
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('telefono, direccion_entrega')
        .eq('id', user.id)
        .single()

      const necesitaOnboarding = !perfil?.telefono || !perfil?.direccion_entrega
      navigate(necesitaOnboarding ? '/onboarding' : '/cliente/casillero',
        { replace: true })
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#0D2B5E' }}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={40} className="animate-spin text-white" />
        <p className="text-white text-sm">Verificando sesión...</p>
      </div>
    </div>
  )
}
