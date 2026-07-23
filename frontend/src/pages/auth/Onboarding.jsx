import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Loader2, Package, MapPin, Phone, User, ArrowRight, Check } from 'lucide-react'

const schema = z.object({
  nombre:    z.string().min(2, 'Ingresa tu nombre completo'),
  telefono:  z.string().min(7, 'Ingresa tu número de WhatsApp'),
  direccion: z.string().min(10, 'Ingresa tu dirección completa en Maracaibo'),
})

const PASOS_TOUR = [
  {
    icon:  Package,
    color: '#1565C0',
    title: '¡Bienvenido a Los Líderes!',
    desc:  'Recibe tus compras de Amazon, Shein, Temu y cualquier tienda directamente en tu puerta en Maracaibo.',
  },
  {
    icon:  MapPin,
    color: '#0EA5E9',
    title: 'Tu código de casillero',
    desc:  'Te asignaremos un código único (LID-XXXX). Agrégalo a la dirección al comprar y sabremos que el paquete es tuyo cuando llegue a Maicao.',
  },
  {
    icon:  Phone,
    color: '#8B5CF6',
    title: 'Te avisamos por WhatsApp',
    desc:  'Recibirás una notificación cuando tu paquete llegue a la bodega, cuando tenga precio y cuando esté en camino a tu puerta.',
  },
]

// ── Step 1: Tour ──────────────────────────────────────────────────────────────
function StepTour({ onNext }) {
  const [paso, setPaso] = useState(0)
  const actual  = PASOS_TOUR[paso]
  const Icon    = actual.icon
  const ultimo  = paso === PASOS_TOUR.length - 1

  return (
    <div className="flex flex-col items-center text-center px-2">
      {/* Icon */}
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: actual.color + '15' }}>
        <Icon size={44} style={{ color: actual.color }} />
      </div>

      {/* Text */}
      <h2 className="text-slate-800 text-xl font-bold mb-3 leading-tight">
        {actual.title}
      </h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-8">
        {actual.desc}
      </p>

      {/* Dots */}
      <div className="flex justify-center gap-2 mb-8">
        {PASOS_TOUR.map((_, i) => (
          <div key={i} className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width:      i === paso ? 28 : 8,
              background: i === paso ? '#1565C0' : '#E2E8F0',
            }} />
        ))}
      </div>

      <button
        onClick={() => ultimo ? onNext() : setPaso(p => p + 1)}
        className="w-full py-4 rounded-2xl text-white font-semibold text-sm
          flex items-center justify-center gap-2 active:scale-95 transition"
        style={{ background: '#1565C0' }}>
        {ultimo
          ? <><span>Completar mi perfil</span><ArrowRight size={18} /></>
          : <><span>Siguiente</span><ArrowRight size={18} /></>
        }
      </button>
    </div>
  )
}

// ── Step 2: Formulario de perfil ──────────────────────────────────────────────
function StepPerfil({ tieneNombre, onDone }) {
  const { user, setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(
      tieneNombre
        ? schema.omit({ nombre: true })
        : schema
    ),
    defaultValues: {
      nombre: user?.user_metadata?.full_name
        ?? user?.user_metadata?.name
        ?? user?.user_metadata?.nombre
        ?? '',
    }
  })

  const onSubmit = async (values) => {
    setLoading(true); setError('')
    try {
      const nombre = tieneNombre
        ? (user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.user_metadata?.nombre)
        : values.nombre

      // 1. Upsert perfil en tabla perfiles
      const { error: errPerfil } = await supabase
        .from('perfiles')
        .upsert({
          id:               user.id,
          nombre,
          telefono:         values.telefono,
          direccion_entrega: values.direccion,
          roles:            ['cliente'],
        }, { onConflict: 'id' })
      if (errPerfil) throw errPerfil

      // 2. Actualizar metadata del usuario
      const { data, error: errMeta } = await supabase.auth.updateUser({
        data: {
          nombre,
          telefono:        values.telefono,
          primer_ingreso:  false,
          roles:           ['cliente'],
        }
      })
      if (errMeta) throw errMeta

      // 3. Refrescar sesión en el store
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setAuth(session.user, session)

      onDone()
    } catch (e) {
      setError('Error al guardar tu perfil. Intenta de nuevo.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#EEF2F8' }}>
          <User size={20} style={{ color: '#1565C0' }} />
        </div>
        <div>
          <h2 className="text-slate-800 text-lg font-bold leading-tight">
            Completa tu perfil
          </h2>
          <p className="text-slate-500 text-xs">
            Necesitamos estos datos para entregarte tus paquetes
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        {/* Nombre — solo si no viene de Google */}
        {!tieneNombre && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre completo
            </label>
            <input type="text" autoComplete="name"
              placeholder="María Fernanda García"
              {...register('nombre')}
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition
                focus:ring-2 focus:ring-blue-500
                ${errors.nombre ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`} />
            {errors.nombre && (
              <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>
            )}
          </div>
        )}

        {/* Si viene de Google, mostrar nombre como readonly */}
        {tieneNombre && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
            <Check size={16} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-green-600 font-medium">Nombre obtenido de Google</p>
              <p className="text-sm font-semibold text-green-800">
                {user?.user_metadata?.full_name ?? user?.user_metadata?.name}
              </p>
            </div>
          </div>
        )}

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Teléfono WhatsApp
          </label>
          <input type="tel" autoComplete="tel"
            placeholder="+58 412 000 0000"
            {...register('telefono')}
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition
              focus:ring-2 focus:ring-blue-500
              ${errors.telefono ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`} />
          {errors.telefono && (
            <p className="mt-1 text-xs text-red-600">{errors.telefono.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Por aquí te avisamos cuando llegue tu paquete
          </p>
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Dirección de entrega en Maracaibo
          </label>
          <textarea
            placeholder="Av. Las Delicias, Edif. Torre Norte, Apto 4B, Maracaibo. Referencia: frente al CCCT."
            rows={3}
            {...register('direccion')}
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition
              focus:ring-2 focus:ring-blue-500 resize-none
              ${errors.direccion ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`} />
          {errors.direccion && (
            <p className="mt-1 text-xs text-red-600">{errors.direccion.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Sé lo más específico posible — aquí te entregaremos tus paquetes
          </p>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-semibold text-sm
            flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 !mt-6"
          style={{ background: '#1565C0' }}>
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Guardando...</>
            : <><Check size={18} /> Listo, quiero mi casillero</>
          }
        </button>
      </form>
    </div>
  )
}

// ── Step 3: Casillero asignado ────────────────────────────────────────────────
function StepCasillero({ codigo, onDone }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: '#EEF2F8' }}>
        <Package size={44} style={{ color: '#1565C0' }} />
      </div>

      <p className="text-slate-500 text-xs font-medium tracking-widest mb-2">
        TU CÓDIGO DE CASILLERO
      </p>
      <p className="font-black tracking-widest mb-2"
        style={{ fontSize: 42, letterSpacing: 6, color: '#1565C0' }}>
        {codigo}
      </p>
      <p className="text-slate-500 text-sm mb-2">
        Este código te identifica en nuestra bodega de Maicao
      </p>
      <p className="text-slate-400 text-xs mb-8 leading-relaxed">
        Agrégalo siempre a la dirección cuando compres en tiendas online
      </p>

      <button onClick={onDone}
        className="w-full py-4 rounded-2xl text-white font-semibold text-sm
          flex items-center justify-center gap-2 active:scale-95 transition"
        style={{ background: '#1565C0' }}>
        <Check size={18} /> Ir a mi casillero
      </button>
    </div>
  )
}

// ── Onboarding principal ──────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate      = useNavigate()
  const { user }      = useAuthStore()
  const [step, setStep] = useState(1) // 1=tour, 2=perfil, 3=casillero
  const [codigo, setCodigo] = useState(null)

  // Detectar si viene de Google (ya tiene nombre)
  const tieneNombre = !!(
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name
  )

  const handlePerfilDone = async () => {
    // Obtener el código asignado por el trigger de Supabase
    const { data } = await supabase
      .from('perfiles')
      .select('codigo_casillero')
      .eq('id', user.id)
      .single()
    setCodigo(data?.codigo_casillero ?? '????')
    setStep(3)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F4F6FA' }}>

      {/* Header */}
      <div className="flex flex-col items-center justify-center pt-12 pb-8 px-6"
        style={{ background: '#0D2B5E' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: '#1565C0' }}>
          <span className="text-white text-2xl font-black">LL</span>
        </div>
        <h1 className="text-white text-xl font-bold">Los Líderes</h1>
        <p className="text-sky-300 text-xs mt-1">Encomiendas</p>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mt-6 w-full max-w-xs">
          {[1,2,3].map(s => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`flex-1 h-1 rounded-full transition-all duration-500
                ${s <= step ? 'bg-sky-400' : 'bg-slate-700'}`} />
            </div>
          ))}
        </div>
        <p className="text-sky-400 text-xs mt-2">
          {step === 1 && 'Conoce cómo funciona'}
          {step === 2 && 'Completa tu perfil'}
          {step === 3 && '¡Tu casillero está listo!'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-sm mx-auto w-full">
        {step === 1 && (
          <StepTour onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <StepPerfil
            tieneNombre={tieneNombre}
            onDone={handlePerfilDone}
          />
        )}
        {step === 3 && (
          <StepCasillero
            codigo={codigo}
            onDone={() => navigate('/cliente/casillero', { replace: true })}
          />
        )}
      </div>
    </div>
  )
}