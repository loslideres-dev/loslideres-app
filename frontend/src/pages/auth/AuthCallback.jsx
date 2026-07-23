import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { ROLE_REDIRECT } from '../../constants/roles'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuth(session.user, session)
        const roles    = session.user?.user_metadata?.roles ?? []
        const redirect = ROLE_REDIRECT[roles[0]] ?? '/cliente/casillero'
        navigate(redirect, { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
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