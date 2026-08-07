import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useMiPerfil, useActualizarPerfil } from '../../hooks/usePerfiles'
import ClienteLayout from '../../components/layout/ClienteLayout'
import ClienteHeader from '../../components/layout/ClienteHeader'
import TelefonoInput from '../../components/ui/TelefonoInput'
import Toast from '../../components/ui/Toast'

export default function Perfil() {
  const navigate  = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [toast, setToast]   = useState({ show: false, msg: '', type: 'success' })
  const [form, setForm]     = useState({ nombre: '', telefono: '', direccion_entrega: '' })

  const { data: perfil, isLoading } = useMiPerfil(user?.id)
  const { mutateAsync: actualizar, isPending } = useActualizarPerfil()

  useEffect(() => {
    if (perfil) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        nombre:           perfil.nombre ?? '',
        telefono:         perfil.telefono ?? '',
        direccion_entrega: perfil.direccion_entrega ?? '',
      })
    }
  }, [perfil])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login', { replace: true })
  }

  const handleGuardar = async () => {
    try {
      await actualizar({ id: user.id, ...form })
      setToast({ show: true, msg: 'Perfil actualizado', type: 'success' })
    } catch {
      setToast({ show: true, msg: 'Error al guardar', type: 'error' })
    }
  }

  const initials = (perfil?.nombre ?? user?.email ?? 'US').slice(0,2).toUpperCase()
  const codigo   = perfil?.codigo_casillero ?? user?.user_metadata?.codigo_casillero ?? '????'

  return (
    <ClienteLayout>
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      <ClienteHeader subtitulo="MI PERFIL" titulo={perfil?.nombre ?? '—'}>
        {/* Identidad: baja del header al bloque azul para no competir con
            los iconos de la barra, que ahora son iguales en toda la app. */}
        <div className="flex items-center gap-4 rounded-2xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center
            text-white text-lg font-black flex-shrink-0" style={{ background: '#1565C0' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sky-300 text-sm font-mono font-bold">{codigo}</p>
            <p className="text-slate-300 text-xs truncate">{user?.email}</p>
          </div>
        </div>
      </ClienteHeader>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 pb-6">

        {isLoading
          ? <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          : <>
              <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                <p className="text-xs font-semibold text-slate-500 tracking-wider">MIS DATOS</p>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                  <input type="text" value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base
                      outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>

                <TelefonoInput
                  label="Teléfono / WhatsApp"
                  value={form.telefono}
                  onChange={tel => setForm(f => ({ ...f, telefono: tel }))}
                />

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Dirección de entrega en Maracaibo
                  </label>
                  <textarea value={form.direccion_entrega} rows={3}
                    placeholder="Calle, urbanización, referencia..."
                    onChange={e => setForm(f => ({ ...f, direccion_entrega: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base
                      outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none" />
                </div>

                <button onClick={handleGuardar} disabled={isPending}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm
                    flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: '#1565C0' }}>
                  {isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Guardar cambios
                </button>
              </div>

              {/* Info cuenta */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-xs font-semibold text-slate-500 tracking-wider mb-3">MI CUENTA</p>
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <p className="text-sm text-slate-600">Correo</p>
                  <p className="text-sm font-medium text-slate-800">{user?.email}</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <p className="text-sm text-slate-600">Casillero</p>
                  <p className="text-sm font-bold font-mono" style={{ color: '#1565C0' }}>{codigo}</p>
                </div>
              </div>

              {/* Logout */}
              <button onClick={handleLogout}
                className="w-full py-4 rounded-2xl bg-white shadow-sm text-red-600
                  font-semibold text-sm flex items-center justify-center gap-2 active:scale-95">
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </>
        }
      </div>
    </ClienteLayout>
  )
}
