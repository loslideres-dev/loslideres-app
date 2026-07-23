import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { ROLE_REDIRECT } from '../../constants/roles'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const schema = z.object({
  email:    z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export default function Login() {
  const navigate     = useNavigate()
  const setAuth      = useAuthStore((s) => s.setAuth)
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [googleLoad, setGoogleLoad] = useState(false)
  const [error,      setError]      = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  // ── Email / contraseña ──────────────────────────────────────────────────
  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email, password,
      })
      if (err) throw err
      setAuth(data.user, data.session)
      const roles = data.user?.user_metadata?.roles ?? []
      const redirect = ROLE_REDIRECT[roles[0]] ?? '/cliente/casillero'
      navigate(redirect, { replace: true })
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos'
        : 'Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Google OAuth ────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoad(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (err) throw err
    } catch (err) {
      setError('Error al conectar con Google. Intenta de nuevo.')
      setGoogleLoad(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F4F6FA' }}>

      {/* ── Header ── */}
      <div
        className="flex flex-col items-center justify-center pt-14 pb-10 px-6"
        style={{ background: '#0D2B5E' }}
      >
        {/* Logo placeholder — reemplazar con <img> cuando tengamos el SVG */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: '#1565C0' }}>
          <span className="text-white text-4xl font-black">LL</span>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">
          Los Líderes
        </h1>
        <p className="text-sky-300 text-sm mt-1">Encomiendas</p>
        <p className="text-slate-400 text-xs mt-3 text-center">
          De Maicao a tu puerta en Maracaibo
        </p>
      </div>

      {/* ── Card ── */}
      <div className="flex-1 flex flex-col items-center px-5 -mt-5">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 pt-7">

          <h2 className="text-slate-800 text-lg font-semibold mb-1">
            Bienvenido
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Entra con tu cuenta para ver tu casillero
          </p>

          {/* ── Error global ── */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          {/* ── Formulario ── */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="tucorreo@gmail.com"
                {...register('email')}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${errors.email
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 bg-slate-50'}`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none transition
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    ${errors.password
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-200 bg-slate-50'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                    hover:text-slate-600 transition"
                >
                  {showPass
                    ? <EyeOff size={18} />
                    : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Olvidé contraseña */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 transition"
                onClick={() => navigate('/auth/forgot-password')}
              >
                Olvidé mi contraseña
              </button>
            </div>

            {/* Botón entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm
                transition active:scale-95 flex items-center justify-center gap-2
                disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: loading ? '#1565C0aa' : '#1565C0' }}
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Entrando...</>
                : 'Entrar'}
            </button>
          </form>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">o</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* ── Google ── */}
          <button
            onClick={handleGoogle}
            disabled={googleLoad}
            className="w-full py-3 rounded-xl border border-slate-200 bg-white
              text-slate-700 text-sm font-medium flex items-center justify-center gap-3
              hover:bg-slate-50 transition active:scale-95
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoad
              ? <Loader2 size={18} className="animate-spin text-slate-400" />
              : (
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
              )
            }
            {googleLoad ? 'Conectando...' : 'Continuar con Google'}
          </button>

        </div>

        {/* ── Footer ── */}
        <p className="text-xs text-slate-400 mt-6 mb-8 text-center">
          Los Líderes Encomiendas · v{import.meta.env.VITE_APP_VERSION}
        </p>
      </div>

    </div>
  )
}