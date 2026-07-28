import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Plus, Search, Loader2, Check, Phone, MapPin, Mail, Calendar } from 'lucide-react'
import { useUsuarios } from '../../hooks/usePerfiles'
import { supabase } from '../../lib/supabase'
import { notificarAdmins } from '../../lib/notificar'
import AdminLayout from '../../components/layout/AdminLayout'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'

// Cliente secundario SOLO para crear usuarios sin cerrar la sesión del admin
const supabaseSignup = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const ROL_COLOR = {
  cliente:   { bg: '#EEF2F8', text: '#1565C0' },
  bodeguero: { bg: '#FEF3C7', text: '#B45309' },
  admin:     { bg: '#FEE2E2', text: '#991B1B' },
  conductor: { bg: '#EDE9FE', text: '#5B21B6' },
}

const FORM_INICIAL = {
  nombre: '', email: '', password: '', rol: 'cliente',
}

// Roles que muestran teléfono y nombre en el detalle (además del cliente que ya los tiene)
const ROLES_CON_CONTACTO = ['bodeguero', 'conductor', 'admin']

function tieneRolContacto(roles = []) {
  return roles.some(r => ROLES_CON_CONTACTO.includes(r))
}

function mapsUrl(direccion) {
  const query = encodeURIComponent(`${direccion}, Maracaibo, Venezuela`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

export default function Usuarios() {
  const [filtroRol, setFiltroRol] = useState(null)
  const [query,     setQuery]     = useState('')
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState(FORM_INICIAL)
  const [creando,   setCreando]   = useState(false)
  const [detalle,   setDetalle]   = useState(null)
  const [toast,     setToast]     = useState({ show: false, msg: '', type: 'success' })

  const { data: usuarios = [], isLoading, refetch } = useUsuarios(filtroRol)

  const filtrados = query
    ? usuarios.filter(u =>
        u.nombre?.toLowerCase().includes(query.toLowerCase()) ||
        u.codigo_casillero?.toLowerCase().includes(query.toLowerCase()))
    : usuarios

  const puedeCrear = form.nombre.trim() && form.email.trim() &&
    form.password.length >= 6 && !creando

  const handleCrear = async () => {
    setCreando(true)
    try {
      const { data, error } = await supabaseSignup.auth.signUp({
        email:    form.email.trim(),
        password: form.password,
        options: {
          data: {
            nombre: form.nombre.trim(),
            roles:  [form.rol],
          },
        },
      })
      if (error) throw error
      const nuevoId = data.user?.id
      if (!nuevoId) throw new Error('No se obtuvo el ID del usuario')

      await notificarAdmins({
        tipo:    'nuevo_usuario',
        titulo:  'Nuevo usuario registrado',
        mensaje: `Se creó el usuario ${form.nombre} (${form.rol}).`,
      })
      setToast({
        show: true,
        msg:  `Usuario ${form.nombre} creado ✓`,
        type: 'success',
      })
      setModal(false)
      setForm(FORM_INICIAL)
      setTimeout(() => refetch(), 800)
    } catch (e) {
      const msg = e.message?.includes('already registered')
        ? 'Ya existe una cuenta con ese correo'
        : `Error: ${e.message ?? 'no se pudo crear el usuario'}`
      setToast({ show: true, msg, type: 'error' })
    } finally {
      setCreando(false)
    }
  }

  return (
    <AdminLayout title="Usuarios">
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      <div className="px-5 py-4">

        {/* Buscar + agregar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por nombre o LID"
              value={query} onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200
                bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => setModal(true)}
            className="w-10 h-10 rounded-xl text-white flex items-center
              justify-center flex-shrink-0 active:scale-95"
            style={{ background: '#1565C0' }}>
            <Plus size={18} />
          </button>
        </div>

        {/* Filtros por rol */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {[null, 'cliente', 'bodeguero', 'admin', 'conductor'].map(r => (
            <button key={r ?? 'todos'} onClick={() => setFiltroRol(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border
                whitespace-nowrap
                ${filtroRol === r
                  ? 'text-white border-transparent'
                  : 'bg-white text-slate-500 border-slate-200'}`}
              style={filtroRol === r ? { background: '#1565C0' } : {}}>
              {r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Todos'}
            </button>
          ))}
        </div>

        {isLoading
          ? <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
                rounded-full animate-spin" />
            </div>
          : <div className="space-y-2">
              {filtrados.map(u => (
                <button key={u.id} onClick={() => setDetalle(u)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3
                    active:scale-95 transition text-left">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center
                    text-white text-sm font-bold flex-shrink-0"
                    style={{ background: '#1565C0' }}>
                    {(u.nombre ?? 'US').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {u.nombre}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {u.codigo_casillero ?? u.email ?? ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {(u.roles ?? []).map(r => {
                      const c = ROL_COLOR[r] ?? { bg: '#F4F6FA', text: '#555' }
                      return (
                        <span key={r}
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: c.bg, color: c.text }}>
                          {r}
                        </span>
                      )
                    })}
                  </div>
                </button>
              ))}
              {filtrados.length === 0 && (
                <div className="text-center py-14">
                  <Users size={44} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No se encontraron usuarios</p>
                </div>
              )}
            </div>
        }
      </div>

      {/* ── Modal detalle de usuario ── */}
      <Modal open={!!detalle} onClose={() => setDetalle(null)}
        title={detalle?.nombre ?? 'Usuario'}>
        {detalle && (
          <div className="space-y-4">
            {/* Avatar + roles */}
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-20 h-20 rounded-full flex items-center justify-center
                text-white text-2xl font-black mb-3" style={{ background: '#1565C0' }}>
                {(detalle.nombre ?? 'US').slice(0, 2).toUpperCase()}
              </div>
              <p className="text-lg font-bold text-slate-800">{detalle.nombre}</p>
              <div className="flex gap-1.5 mt-2 flex-wrap justify-center">
                {(detalle.roles ?? []).map(r => {
                  const c = ROL_COLOR[r] ?? { bg: '#F4F6FA', text: '#555' }
                  return (
                    <span key={r}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: c.bg, color: c.text }}>
                      {r}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Datos */}
            <div className="space-y-2">

              {/* Casillero — solo clientes */}
              {detalle.codigo_casillero && (
                <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center
                    flex-shrink-0" style={{ background: '#EEF2F8' }}>
                    <Users size={15} style={{ color: '#1565C0' }} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Casillero</p>
                    <p className="text-sm font-semibold text-slate-800 font-mono">
                      {detalle.codigo_casillero}
                    </p>
                  </div>
                </div>
              )}

              {/* Correo electrónico — siempre visible si está disponible */}
              {detalle.email && (
                <a href={`mailto:${detalle.email}`}
                  className="flex items-center gap-3 bg-white rounded-xl px-4 py-3
                    active:scale-95 transition">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center
                    flex-shrink-0" style={{ background: '#EEF2F8' }}>
                    <Mail size={15} style={{ color: '#1565C0' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Correo electrónico</p>
                    <p className="text-sm font-semibold text-slate-800 truncate"
                      style={{ color: '#1565C0' }}>
                      {detalle.email}
                    </p>
                  </div>
                </a>
              )}

              {/* Teléfono — visible para todos los roles si existe */}
              {detalle.telefono && (
                <a href={`tel:${detalle.telefono}`}
                  className="flex items-center gap-3 bg-white rounded-xl px-4 py-3
                    active:scale-95 transition">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center
                    flex-shrink-0" style={{ background: '#E6F4EC' }}>
                    <Phone size={15} style={{ color: '#1B7A3E' }} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Teléfono</p>
                    <p className="text-sm font-semibold" style={{ color: '#1B7A3E' }}>
                      {detalle.telefono}
                    </p>
                  </div>
                </a>
              )}

              {/* Dirección — clickeable a Google Maps */}
              {detalle.direccion_entrega && (
                <a
                  href={mapsUrl(detalle.direccion_entrega)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 bg-white rounded-xl overflow-hidden
                    active:scale-95 transition"
                >
                  <div className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center
                      flex-shrink-0" style={{ background: '#FEF3C7' }}>
                      <MapPin size={15} style={{ color: '#B45309' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400">Dirección de entrega</p>
                      <p className="text-sm font-medium break-words"
                        style={{ color: '#B45309' }}>
                        {detalle.direccion_entrega}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#B45309', opacity: 0.7 }}>
                        Toca para abrir en Maps
                      </p>
                    </div>
                  </div>
                </a>
              )}

              {/* Fecha de registro */}
              <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center
                  flex-shrink-0" style={{ background: '#EEF2F8' }}>
                  <Calendar size={15} style={{ color: '#1565C0' }} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Registrado</p>
                  <p className="text-sm font-medium text-slate-800">
                    {detalle.created_at
                      ? new Date(detalle.created_at).toLocaleDateString('es-VE', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })
                      : '—'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal crear usuario ── */}
      <Modal open={modal} onClose={() => setModal(false)} title="Crear usuario">
        <div className="space-y-3">
          <input type="text" placeholder="Nombre completo *"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
              bg-white outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="email" placeholder="Correo electrónico *"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
              bg-white outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Contraseña inicial * (mín. 6 caracteres)"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
              bg-white outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={form.rol}
            onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
              bg-white outline-none focus:ring-2 focus:ring-blue-500">
            <option value="cliente">Cliente</option>
            <option value="bodeguero">Bodeguero</option>
            <option value="conductor">Conductor</option>
            <option value="admin">Administrador</option>
          </select>
          <p className="text-xs text-slate-400">
            Comparte el correo y la contraseña inicial con el usuario para que
            pueda entrar. Si es cliente, completará su teléfono y dirección la
            primera vez que ingrese. Podrá cambiar la contraseña con "Olvidé mi contraseña".
          </p>
          <button onClick={handleCrear} disabled={!puedeCrear}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm
              flex items-center justify-center gap-2 disabled:opacity-50
              active:scale-95"
            style={{ background: '#1565C0' }}>
            {creando
              ? <Loader2 size={18} className="animate-spin" />
              : <Check size={18} />}
            Crear usuario
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
