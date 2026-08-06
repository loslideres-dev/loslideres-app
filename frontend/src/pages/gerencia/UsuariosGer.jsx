import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Search, Plus, Loader2, Check, Phone, Mail, MapPin, Calendar, Users, X,
  Clock, ShieldAlert,
} from 'lucide-react'
import { useUsuarios } from '../../hooks/usePerfiles'
import {
  tiempoRelativo, tiempoRelativoCorto, fechaCorta, fechaLarga, fechaHora,
  colorActividad,
} from '../../lib/fechas'
import { notificarAdmins } from '../../lib/notificar'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'

// Cliente secundario para crear usuarios sin tumbar la sesión actual
const supabaseSignup = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const ROL_COLOR = {
  cliente:   { bg: '#EEF2F8', fg: '#1565C0' },
  bodeguero: { bg: '#FEF3C7', fg: '#B45309' },
  conductor: { bg: '#EDE9FE', fg: '#5B21B6' },
  admin:     { bg: '#FEE2E2', fg: '#991B1B' },
  gerente:   { bg: '#0D2B5E', fg: '#FFFFFF' },
}

const ROLES = [
  { label: 'Todos',       value: null },
  { label: 'Clientes',    value: 'cliente' },
  { label: 'Bodegueros',  value: 'bodeguero' },
  { label: 'Conductores', value: 'conductor' },
  { label: 'Admins',      value: 'admin' },
  { label: 'Gerentes',    value: 'gerente' },
]

const FORM_VACIO = { nombre: '', email: '', password: '', rol: 'cliente' }

export default function UsuariosGer() {
  const [filtro, setFiltro] = useState(null)
  const [busca,  setBusca]  = useState('')
  const [nuevo,  setNuevo]  = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [toast, setToast] = useState(null)

  const { data: usuarios = [], isLoading, refetch } = useUsuarios(filtro)

  const q = busca.trim().toLowerCase()
  const filas = q
    ? usuarios.filter(u =>
        u.nombre?.toLowerCase().includes(q) ||
        u.codigo_casillero?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.telefono?.includes(q))
    : usuarios

  return (
    <GerenciaLayout
      titulo="Usuarios"
      descripcion={`${filas.length} de ${usuarios.length} personas`}
      acciones={
        <button onClick={() => setNuevo(FORM_VACIO)}
          className="px-3 py-2 rounded-lg text-white text-[13px] font-semibold
            flex items-center gap-2 transition active:scale-95"
          style={{ background: '#1565C0' }}>
          <Plus size={15} /> Crear usuario
        </button>
      }
    >
      {toast && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: toast.tipo === 'error' ? '#FEE2E2' : '#E6F4EC',
            color:      toast.tipo === 'error' ? '#991B1B' : '#166534',
          }}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-[1400px] space-y-4">

        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F1F5F9' }}>
            {ROLES.map(r => (
              <button key={r.label} onClick={() => setFiltro(r.value)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition"
                style={{
                  background: filtro === r.value ? '#FFFFFF' : 'transparent',
                  color:      filtro === r.value ? '#0D2B5E' : '#94A3B8',
                  boxShadow:  filtro === r.value ? '0 1px 3px rgba(13,43,94,0.08)' : 'none',
                }}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
              text-slate-400" />
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nombre, casillero, correo o teléfono"
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-200
                text-[13px] outline-none focus:ring-2 focus:ring-blue-500" />
            {busca && (
              <button onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <section className="bg-white rounded-2xl overflow-hidden"
          style={{ border: '1px solid #E8EDF5' }}>
          {isLoading ? (
            <div className="py-24 flex justify-center">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
                rounded-full animate-spin" />
            </div>
          ) : filas.length === 0 ? (
            <div className="py-24 text-center">
              <Users size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Sin resultados</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#FAFBFD' }}>
                  <Th>Persona</Th>
                  <Th>Casillero</Th>
                  <Th>Teléfono</Th>
                  <Th>Roles</Th>
                  <Th align="center">Registrado</Th>
                  <Th align="center">Último acceso</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filas.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center
                          text-white text-[11px] font-bold flex-shrink-0"
                          style={{ background: '#1565C0' }}>
                          {(u.nombre ?? 'US').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-semibold text-slate-700">
                          {u.nombre ?? '—'}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <span className="text-[12px] text-slate-500" style={{ fontFamily: MONO }}>
                        {u.codigo_casillero ?? '—'}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[12px] text-slate-500">{u.telefono ?? '—'}</span>
                    </Td>
                    <Td>
                      <div className="flex gap-1 flex-wrap">
                        {(u.roles ?? []).map(r => {
                          const c = ROL_COLOR[r] ?? { bg: '#F1F5F9', fg: '#64748B' }
                          return (
                            <span key={r} className="text-[10px] font-bold px-2 py-0.5
                              rounded-full" style={{ background: c.bg, color: c.fg }}>
                              {r}
                            </span>
                          )
                        })}
                      </div>
                    </Td>
                    <Td align="center">
                      <span className="text-[12px] text-slate-400">
                        {fechaCorta(u.created_at)}
                      </span>
                    </Td>
                    <Td align="center">
                      {/* El color deja leer la columna de un vistazo:
                          verde = entró esta semana, gris = tibio, tenue = frío. */}
                      <span className="text-[12px] font-medium"
                        style={{ color: colorActividad(u.ultimo_login) }}
                        title={u.ultimo_login ? fechaHora(u.ultimo_login) : 'Nunca ha ingresado'}>
                        {u.ultimo_login ? tiempoRelativoCorto(u.ultimo_login) : 'Nunca'}
                      </span>
                    </Td>
                    <Td align="right">
                      <button onClick={() => setDetalle(u)}
                        className="text-[12px] font-semibold px-3 py-1.5 rounded-lg
                          transition hover:bg-slate-100" style={{ color: '#1565C0' }}>
                        Ver
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {nuevo && (
        <ModalCrear form={nuevo} setForm={setNuevo}
          onClose={() => setNuevo(null)} onToast={setToast} onCreado={refetch} />
      )}
      {detalle && (
        <ModalDetalle usuario={detalle} onClose={() => setDetalle(null)} />
      )}
    </GerenciaLayout>
  )
}

function ModalCrear({ form, setForm, onClose, onToast, onCreado }) {
  const [creando, setCreando] = useState(false)
  const puede = form.nombre.trim() && form.email.trim() && form.password.length >= 6

  const handleCrear = async () => {
    setCreando(true)
    try {
      const { data, error } = await supabaseSignup.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { nombre: form.nombre.trim(), roles: [form.rol] } },
      })
      if (error) throw error
      if (!data.user?.id) throw new Error('No se obtuvo el ID del usuario')

      await notificarAdmins({
        tipo: 'nuevo_usuario',
        titulo: 'Nuevo usuario registrado',
        mensaje: `Se creó el usuario ${form.nombre} (${form.rol}).`,
      })
      onToast({ tipo: 'ok', msg: `Usuario ${form.nombre} creado` })
      onClose()
      setTimeout(() => onCreado(), 800)
    } catch (e) {
      onToast({
        tipo: 'error',
        msg: e.message?.includes('already registered')
          ? 'Ya existe una cuenta con ese correo'
          : 'No se pudo crear el usuario',
      })
    } finally {
      setCreando(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="px-7 py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <h2 className="text-lg font-bold text-slate-800">Crear usuario</h2>
      </div>
      <div className="px-7 py-6 space-y-4">
        <Campo label="Nombre completo">
          <input type="text" autoFocus value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            className={inputCls} />
        </Campo>
        <Campo label="Correo electrónico">
          <input type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className={inputCls} />
        </Campo>
        <Campo label="Contraseña inicial" nota="mínimo 6 caracteres">
          <input type="text" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className={inputCls} />
        </Campo>
        <Campo label="Rol">
          <select value={form.rol}
            onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
            className={inputCls}>
            <option value="cliente">Cliente</option>
            <option value="bodeguero">Bodeguero</option>
            <option value="conductor">Conductor</option>
            <option value="admin">Administrador</option>
            <option value="gerente">Gerente</option>
          </select>
        </Campo>

        <p className="text-[12px] text-slate-400 leading-relaxed">
          Comparte el correo y la contraseña con la persona. Si es cliente,
          completará teléfono y dirección al entrar por primera vez.
        </p>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={creando}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600
              text-[13px] font-semibold hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button onClick={handleCrear} disabled={!puede || creando}
            className="flex-[2] py-3 rounded-xl text-white text-[13px] font-semibold
              flex items-center justify-center gap-2 disabled:opacity-40 transition"
            style={{ background: '#1565C0' }}>
            {creando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Crear usuario
          </button>
        </div>
      </div>
    </Overlay>
  )
}

function ModalDetalle({ usuario, onClose }) {
  const mapsUrl = d =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d + ', Maracaibo, Venezuela')}`

  return (
    <Overlay onClose={onClose}>
      <div className="px-7 py-6 text-center" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3
          text-white text-lg font-black" style={{ background: '#1565C0' }}>
          {(usuario.nombre ?? 'US').slice(0, 2).toUpperCase()}
        </div>
        <h2 className="text-lg font-bold text-slate-800">{usuario.nombre}</h2>
        <div className="flex gap-1.5 justify-center mt-2 flex-wrap">
          {(usuario.roles ?? []).map(r => {
            const c = ROL_COLOR[r] ?? { bg: '#F1F5F9', fg: '#64748B' }
            return (
              <span key={r} className="text-[10px] font-bold px-2 py-1 rounded-full"
                style={{ background: c.bg, color: c.fg }}>{r}</span>
            )
          })}
        </div>
      </div>

      <div className="px-7 py-5 space-y-3">
        {usuario.codigo_casillero && (
          <Dato icono={Users} label="Casillero" valor={usuario.codigo_casillero} mono />
        )}
        {usuario.email && (
          <Dato icono={Mail} label="Correo" valor={usuario.email}
            href={`mailto:${usuario.email}`}
            aviso={usuario.email_confirmado === null ? 'Correo sin confirmar' : null} />
        )}
        {usuario.telefono && (
          <Dato icono={Phone} label="Teléfono" valor={usuario.telefono}
            href={`tel:${usuario.telefono}`} color="#1B7A3E" />
        )}
        {usuario.direccion_entrega && (
          <Dato icono={MapPin} label="Dirección de entrega"
            valor={usuario.direccion_entrega}
            href={mapsUrl(usuario.direccion_entrega)} color="#B45309" nuevaPestana />
        )}
        <Dato icono={Calendar} label="Registrado"
          valor={fechaLarga(usuario.created_at)} />

        <Dato icono={Clock} label="Último acceso"
          color={colorActividad(usuario.ultimo_login)}
          valor={usuario.ultimo_login
            ? (tiempoRelativo(usuario.ultimo_login) ?? fechaLarga(usuario.ultimo_login))
            : 'Nunca ha ingresado'}
          nota={usuario.ultimo_login ? fechaHora(usuario.ultimo_login) : null} />
      </div>
    </Overlay>
  )
}

const inputCls = `w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[13px]
  bg-white outline-none focus:ring-2 focus:ring-blue-500`

function Campo({ label, nota, children }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
        {label}
        {nota && <span className="font-normal text-slate-400 ml-1">({nota})</span>}
      </label>
      {children}
    </div>
  )
}

function Dato({ icono: Icono, label, valor, href, color, mono, nuevaPestana,
                nota, aviso }) {
  const contenido = (
    <>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: '#EEF2F8' }}>
        <Icono size={14} style={{ color: color ?? '#1565C0' }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-[13px] font-medium break-words"
          style={{ color: href ? (color ?? '#1565C0') : (color ?? '#334155'),
                   fontFamily: mono ? MONO : undefined }}>
          {valor}
        </p>
        {nota && <p className="text-[11px] text-slate-400 mt-0.5">{nota}</p>}
        {/* Un correo sin confirmar suele ser la razón real de que
            alguien reporte que "no puede entrar" a la app. */}
        {aviso && (
          <span className="inline-flex items-center gap-1 text-[11px] mt-0.5"
            style={{ color: '#B45309' }}>
            <ShieldAlert size={11} /> {aviso}
          </span>
        )}
      </div>
    </>
  )
  if (href) {
    return (
      <a href={href} target={nuevaPestana ? '_blank' : undefined}
        rel={nuevaPestana ? 'noreferrer' : undefined}
        className="flex items-start gap-3 px-4 py-3 rounded-xl transition hover:bg-slate-50">
        {contenido}
      </a>
    )
  }
  return <div className="flex items-start gap-3 px-4 py-3">{contenido}</div>
}

function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(13,43,94,0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden
        max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
function Th({ children, align = 'left' }) {
  return (
    <th className="px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400"
      style={{ textAlign: align }}>{children}</th>
  )
}
function Td({ children, align = 'left' }) {
  return <td className="px-6 py-3" style={{ textAlign: align }}>{children}</td>
}
