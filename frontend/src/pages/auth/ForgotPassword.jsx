import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Correo inválido'),
})

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email }) => {
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (err) throw err
      setSent(true)
    } catch {
      setError('No pudimos enviar el correo. Verifica que el correo esté registrado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: '#F4F6FA' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">

        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1 text-sm text-slate-500
            hover:text-slate-700 transition mb-6"
        >
          <ArrowLeft size={16} /> Volver al login
        </button>

        {sent ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <CheckCircle size={48} className="text-green-500" />
            <h2 className="text-slate-800 font-semibold text-lg">
              Correo enviado
            </h2>
            <p className="text-slate-500 text-sm">
              Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-sm"
              style={{ background: '#1565C0' }}
            >
              Volver al login
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-slate-800 text-lg font-semibold mb-1">
              Recuperar contraseña
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Te enviamos un enlace para restablecer tu contraseña.
            </p>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-700
                bg-red-50 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  placeholder="tucorreo@gmail.com"
                  {...register('email')}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition
                    focus:ring-2 focus:ring-blue-500
                    ${errors.email
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-200 bg-slate-50'}`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm
                  flex items-center justify-center gap-2
                  disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: '#1565C0' }}
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Enviando...</>
                  : 'Enviar enlace'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}