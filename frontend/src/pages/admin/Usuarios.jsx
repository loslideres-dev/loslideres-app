import { useState } from 'react'
import { Users, Plus, Search, Loader2, Check } from 'lucide-react'
import { useUsuarios } from '../../hooks/usePerfiles'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/layout/AdminLayout'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'

const ROL_COLOR = {
  cliente:   { bg: '#EEF2F8', text: '#1565C0' },
  bodeguero: { bg: '#FEF3C7', text: '#B45309' },
  admin:     { bg: '#FEE2E2', text: '#991B1B' },
  conductor: { bg: '#EDE9FE', text: '#5B21B6' },
}

export default function Usuarios() {
  const [filtroRol, setFiltroRol] = useState(null)
  const [query,     setQuery]     = useState('')
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState({ nombre:'', email:'', telefono:'', rol:'cliente', direccion:'' })
  const [creando,   setCreando]   = useState(false)
  const [toast,     setToast]     = useState({ show: false, msg: '', type: 'success' })

  const { data: usuarios = [], isLoading, refetch } = useUsuarios(filtroRol)

  const filtrados = query
    ? usuarios.filter(u =>
        u.nombre?.toLowerCase().includes(query.toLowerCase()) ||
        u.codigo_casillero?.toLowerCase().includes(query.toLowerCase()))
    : usuarios

  const handleCrear = async () => {
    setCreando(true)
    try {
      const { error } = await supabase.auth.admin.createUser({
        email: form.email,
        password: Math.random().toString(36).slice(-10),
        email_confirm: true,
        user_metadata: {
          nombre:   form.nombre,
          telefono: form.telefono,
          roles:    [form.rol],
        },
      })
      if (error) throw error
      setToast({ show: true, msg: 'Usuario creado correctamente', type: 'success' })
      setModal(false)
      refetch()
    } catch (e) {
      setToast({ show: true, msg: e.message ?? 'Error al crear usuario', type: 'error' })
    } finally {
      setCreando(false)
    }
  }

  return (
    <AdminLayout title="Usuarios">
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      <div className="px-5 py-4">

        {/* Search + add */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por nombre o LID"
              value={query} onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200
                bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => setModal(true)}
            className="w-10 h-10 rounded-xl text-white flex items-center justify-center flex-shrink-0"
            style={{ background: '#1565C0' }}>
            <Plus size={18} />
          </button>
        </div>

        {/* Filtro por rol */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {[null,'cliente','bodeguero','admin','conductor'].map(r => (
            <button key={r ?? 'todos'} onClick={() => setFiltroRol(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap
                ${filtroRol === r ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200'}`}
              style={filtroRol === r ? { background: '#1565C0' } : {}}>
              {r ?? 'Todos'}
            </button>
          ))}
        </div>

        {isLoading
          ? <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          : <div className="space-y-2">
              {filtrados.map(u => (
                <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center
                    text-white text-sm font-bold flex-shrink-0"
                    style={{ background: '#1565C0' }}>
                    {u.nombre?.slice(0,2).toUpperCase() ?? 'US'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{u.nombre}</p>
                    <p className="text-xs text-slate-400 font-mono">{u.codigo_casillero}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {(u.roles ?? []).map(r => {
                      const c = ROL_COLOR[r] ?? { bg: '#F4F6FA', text: '#555' }
                      return (
                        <span key={r} className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: c.bg, color: c.text }}>
                          {r}
                        </span>
                      )
                    })}
                  </div>
                </div>
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

      {/* Modal crear usuario */}
      <Modal open={modal} onClose={() => setModal(false)} title="Crear usuario">
        <div className="space-y-3">
          <input type="text" placeholder="Nombre completo *"
            value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
              outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="email" placeholder="Correo electrónico *"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
              outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="tel" placeholder="Teléfono (+58...)"
            value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
              outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white
              outline-none focus:ring-2 focus:ring-blue-500">
            <option value="cliente">Cliente</option>
            <option value="bodeguero">Bodeguero</option>
            <option value="admin">Administrador</option>
            <option value="conductor">Conductor</option>
          </select>
          {form.rol === 'cliente' && (
            <textarea placeholder="Dirección de entrega en Maracaibo" rows={2}
              value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          )}
          <p className="text-xs text-slate-400">
            Se enviará un correo al usuario para que establezca su contraseña.
          </p>
          <button onClick={handleCrear} disabled={!form.nombre || !form.email || creando}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm
              flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: '#1565C0' }}>
            {creando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            Crear usuario
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
