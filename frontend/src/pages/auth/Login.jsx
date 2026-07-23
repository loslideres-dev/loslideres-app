import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { ROLE_REDIRECT } from '../../constants/roles'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

// ── Schemas ───────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

const registerSchema = z.object({
  nombre:    z.string().min(2, 'Ingresa tu nombre completo'),
  email:     z.string().email('Correo inválido'),
  password:  z.string().min(6, 'Mínimo 6 caracteres'),
  telefono:  z.string().min(7, 'Teléfono inválido'),
  direccion: z.string().min(10, 'Ingresa tu dirección completa en Maracaibo'),
})

// ── Botón Google compartido ───────────────────────────────────────────────────
function GoogleButton({ loading, onClick }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full py-3 rounded-xl border border-slate-200 bg-white
        text-slate-700 text-sm font-medium flex items-center justify-center gap-3
        hover:bg-slate-50 transition active:scale-95 disabled:opacity-60">
      {loading
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
      {loading ? 'Conectando...' : 'Continuar con Google'}
    </button>
  )
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginForm({ onSwitch }) {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [googleLoad, setGoogleLoad] = useState(false)
  const [error,      setError]      = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const checkOnboarding = async (user) => {
    const roles = user?.user_metadata?.roles ?? ['cliente']
    if (roles.includes('admin')) return false
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('telefono, direccion_entrega')
      .eq('id', user.id)
      .single()
    return !perfil?.telefono || !perfil?.direccion_entrega
  }

  const onSubmit = async ({ email, password }) => {
    setLoading(true); setError('')
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err
      setAuth(data.user, data.session)
      const necesitaOnboarding = await checkOnboarding(data.user)
      if (necesitaOnboarding) {
        navigate('/onboarding', { replace: true }); return
      }
      const roles = data.user?.user_metadata?.roles ?? ['cliente']
      navigate(ROLE_REDIRECT[roles[0]] ?? '/cliente/casillero', { replace: true })
    } catch {
      setError('Correo o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoad(true); setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (err) throw err
    } catch {
      setError('Error al conectar con Google')
      setGoogleLoad(false)
    }
  }

  return (
    <>
      <h2 className="text-slate-800 text-lg font-semibold mb-1">Bienvenido</h2>
      <p className="text-slate-500 text-sm mb-5">Entra con tu cuenta</p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
          <input type="email" autoComplete="email" placeholder="tucorreo@gmail.com"
            {...register('email')}
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition
              focus:ring-2 focus:ring-blue-500
              ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} autoComplete="current-password"
              placeholder="••••••••" {...register('password')}
              className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none transition
                focus:ring-2 focus:ring-blue-500
                ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`} />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={() => navigate('/auth/forgot-password')}
            className="text-xs text-blue-600 hover:text-blue-800">
            Olvidé mi contraseña
          </button>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm
            flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95"
          style={{ background: '#1565C0' }}>
          {loading ? <><Loader2 size={18} className="animate-spin" /> Entrando...</> : 'Entrar'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">o</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <GoogleButton loading={googleLoad} onClick={handleGoogle} />

      <p className="text-center text-sm text-slate-500 mt-5">
        ¿No tienes cuenta?{' '}
        <button onClick={onSwitch} className="text-blue-600 font-semibold hover:text-blue-800">
          Regístrate
        </button>
      </p>
    </>
  )
}

// ── REGISTRO ──────────────────────────────────────────────────────────────────
function RegisterForm({ onSwitch }) {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [googleLoad, setGoogleLoad] = useState(false)
  const [error,      setError]      = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async ({ nombre, email, password, telefono, direccion }) => {
    setLoading(true); setError('')
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            telefono,
            direccion_entrega: direccion,
            roles: ['cliente'],
          }
        }
      })
      if (err) throw err
      if (data.session) {
        setAuth(data.user, data.session)
        navigate('/onboarding', { replace: true })
      } else {
        navigate('/auth/confirmar-correo', { replace: true })
      }
    } catch (e) {
      setError(
        e.message?.includes('already registered')
          ? 'Ya existe una cuenta con ese correo. Inicia sesión.'
          : 'Error al crear la cuenta. Intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoad(true); setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (err) throw err
    } catch {
      setError('Error al conectar con Google')
      setGoogleLoad(false)
    }
  }

  return (
    <>
      <h2 className="text-slate-800 text-lg font-semibold mb-1">Crear cuenta</h2>
      <p className="text-slate-500 text-sm mb-5">
        Regístrate para recibir tus paquetes en Maracaibo
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      {/* Google primero */}
      <GoogleButton loading={googleLoad} onClick={handleGoogle} />

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">o regístrate con correo</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
          <input type="text" autoComplete="name" placeholder="María Fernanda García"
            {...register('nombre')}
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition
              focus:ring-2 focus:ring-blue-500
              ${errors.nombre ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`} />
          {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
          <input type="email" autoComplete="email" placeholder="tucorreo@gmail.com"
            {...register('email')}
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition
              focus:ring-2 focus:ring-blue-500
              ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} autoComplete="new-password"
              placeholder="Mínimo 6 caracteres" {...register('password')}
              className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none transition
                focus:ring-2 focus:ring-blue-500
                ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`} />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono WhatsApp</label>
          <input type="tel" autoComplete="tel" placeholder="+58 412 000 0000"
            {...register('telefono')}
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition
              focus:ring-2 focus:ring-blue-500
              ${errors.telefono ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`} />
          {errors.telefono && <p className="mt-1 text-xs text-red-600">{errors.telefono.message}</p>}
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Dirección de entrega en Maracaibo
          </label>
          <textarea placeholder="Av. Las Delicias, Edif. Torre Norte, Apto 4B. Referencia: frente al CCCT."
            rows={2} {...register('direccion')}
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition
              focus:ring-2 focus:ring-blue-500 resize-none
              ${errors.direccion ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`} />
          {errors.direccion && <p className="mt-1 text-xs text-red-600">{errors.direccion.message}</p>}
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm
            flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 !mt-5"
          style={{ background: '#1565C0' }}>
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Creando cuenta...</>
            : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-5">
        ¿Ya tienes cuenta?{' '}
        <button onClick={onSwitch} className="text-blue-600 font-semibold hover:text-blue-800">
          Iniciar sesión
        </button>
      </p>
    </>
  )
}

// ── PANTALLA PRINCIPAL ────────────────────────────────────────────────────────
export default function Login() {
  const [mode, setMode] = useState('login')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F4F6FA' }}>

      {/* Header */}
      <div className="flex flex-col items-center justify-center pt-14 pb-10 px-6"
        style={{ background: '#0D2B5E' }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: '#1565C0' }}>
          <span className="text-white text-4xl font-black">LL</span>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Los Líderes</h1>
        <p className="text-sky-300 text-sm mt-1">Encomiendas</p>
        <p className="text-slate-400 text-xs mt-3 text-center">
          De Maicao a tu puerta en Maracaibo
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center px-5 -mt-5">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 pt-7">
          {mode === 'login'
            ? <LoginForm    onSwitch={() => setMode('register')} />
            : <RegisterForm onSwitch={() => setMode('login')}    />
          }
        </div>
        <p className="text-xs text-slate-400 mt-5 mb-8 text-center">
          Los Líderes Encomiendas · v{import.meta.env.VITE_APP_VERSION}
        </p>
      </div>
    </div>
  )
}
