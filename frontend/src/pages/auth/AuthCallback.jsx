import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { ROLE_REDIRECT } from '../../constants/roles'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/login', { replace: true }); return }

      const user = session.user
      setAuth(user, session)

      const roles = user?.user_metadata?.roles ?? ['cliente']

      // Solo para clientes verificar si necesitan onboarding
      if (roles.includes('cliente') && !roles.includes('admin')) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('telefono, direccion_entrega, codigo_casillero')
          .eq('id', user.id)
          .single()

        const necesitaOnboarding = !perfil?.telefono || !perfil?.direccion_entrega
        if (necesitaOnboarding) {
          navigate('/onboarding', { replace: true }); return
        }
      }

      const base = ROLE_REDIRECT[roles[0]] ?? '/cliente/casillero'
      navigate(base, { replace: true })
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