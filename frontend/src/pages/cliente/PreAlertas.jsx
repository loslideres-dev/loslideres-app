import { useState } from 'react'
import {
  PackagePlus, Plus, X, Loader2, Check, Truck, HelpCircle,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useMiPerfil } from '../../hooks/usePerfiles'
import {
  useMisPrealertas, useCrearPrealerta, useCancelarPrealerta,
  TIENDAS, ESTADO_PREALERTA,
} from '../../hooks/usePrealertas'
import { tiempoRelativo, fechaCorta } from '../../lib/fechas'
import ClienteLayout from '../../components/layout/ClienteLayout'
import ClienteHeader from '../../components/layout/ClienteHeader'
import Toast from '../../components/ui/Toast'

const FORM_VACIO = { tienda: 'Amazon', descripcion: '', tracking: '' }

export default function PreAlertas() {
  const { user } = useAuthStore()
  const { data: perfil } = useMiPerfil(user?.id)

  const [form,      setForm]      = useState(FORM_VACIO)
  const [abierto,   setAbierto]   = useState(false)
  const [ayuda,     setAyuda]     = useState(false)
  const [toast,     setToast]     = useState({ show: false, msg: '', type: 'success' })

  const { data: prealertas = [], isLoading } = useMisPrealertas(user?.id)
  const crear    = useCrearPrealerta()
  const cancelar = useCancelarPrealerta()

  const pendientes = prealertas.filter(p => p.estado === 'PENDIENTE')
  const historial  = prealertas.filter(p => p.estado !== 'PENDIENTE')

  const puedeGuardar = form.descripcion.trim().length >= 3 && !crear.isPending

  const guardar = async () => {
    try {
      await crear.mutateAsync({
        clienteId:   user.id,
        tienda:      form.tienda,
        descripcion: form.descripcion,
        tracking:    form.tracking,
        nombre:      perfil?.nombre,
        codigo:      perfil?.codigo_casillero,
      })
      setForm(FORM_VACIO)
      setAbierto(false)
      setToast({ show: true, msg: 'Aviso enviado. Ya sabemos que viene.', type: 'success' })
    } catch (e) {
      setToast({ show: true, msg: e.message ?? 'No se pudo guardar', type: 'error' })
    }
  }

  const quitar = async (id) => {
    try {
      await cancelar.mutateAsync({ id, clienteId: user.id })
      setToast({ show: true, msg: 'Aviso cancelado', type: 'success' })
    } catch {
      setToast({ show: true, msg: 'No se pudo cancelar', type: 'error' })
    }
  }

  return (
    <ClienteLayout>
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      <ClienteHeader
        subtitulo={`Casillero ${perfil?.codigo_casillero ?? '—'}`}
        titulo="Avisar un envío"
        acciones={
          <button onClick={() => setAyuda(a => !a)} aria-label="Cómo funciona"
            className="text-slate-400 hover:text-white transition p-1 active:scale-95">
            <HelpCircle size={18} />
          </button>
        }
      >
        <div className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <p className="text-sky-300 text-xs leading-relaxed">
            {pendientes.length > 0
              ? `Estamos esperando ${pendientes.length} ${pendientes.length === 1
                  ? 'paquete tuyo' : 'paquetes tuyos'} en la bodega de Maicao.`
              : 'Avísanos qué compraste y estaremos pendientes cuando llegue.'}
          </p>
        </div>
      </ClienteHeader>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-6">

        {/* ── Explicación ── */}
        {ayuda && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <p className="text-sm font-semibold text-slate-800 mb-2">
              ¿Para qué sirve avisar?
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Cuando compras en una tienda y la envías a nuestra bodega, a veces
              la caja llega sin tu código de casillero visible. Si nos avisas
              antes, sabemos qué esperar y podemos identificar tu paquete aunque
              venga mal marcado.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              No es obligatorio, pero evita demoras y confusiones. Si tienes el
              número de guía a la mano, mejor todavía.
            </p>
          </div>
        )}

        {/* ── Formulario ── */}
        {abierto ? (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-400 tracking-wider">
                NUEVO AVISO
              </p>
              <button onClick={() => { setAbierto(false); setForm(FORM_VACIO) }}
                className="text-slate-300 active:scale-90">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-2">¿En qué tienda compraste?</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {TIENDAS.map(t => {
                const activa = form.tienda === t
                return (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tienda: t }))}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border
                      active:scale-95 transition"
                    style={activa
                      ? { background: '#1565C0', color: '#fff', borderColor: '#1565C0' }
                      : { background: '#fff', color: '#64748B', borderColor: '#E2E8F0' }}>
                    {t}
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-slate-500 mb-1.5">¿Qué compraste?</p>
            <input type="text" value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Ej: dos pares de zapatos"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                outline-none focus:ring-2 focus:ring-blue-500 mb-4" />

            <p className="text-xs text-slate-500 mb-1.5">
              Número de guía <span className="text-slate-300">(opcional)</span>
            </p>
            <input type="text" value={form.tracking}
              onChange={e => setForm(f => ({ ...f, tracking: e.target.value }))}
              placeholder="El que te dio la tienda"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                font-mono outline-none focus:ring-2 focus:ring-blue-500 mb-4" />

            <button onClick={guardar} disabled={!puedeGuardar}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm
                flex items-center justify-center gap-2 disabled:opacity-40
                active:scale-95 transition"
              style={{ background: '#1565C0' }}>
              {crear.isPending
                ? <Loader2 size={17} className="animate-spin" />
                : <Check size={17} />}
              Avisar
            </button>
          </div>
        ) : (
          <button onClick={() => setAbierto(true)}
            className="w-full py-4 rounded-2xl text-white font-semibold text-sm
              flex items-center justify-center gap-2 active:scale-95 transition mb-4"
            style={{ background: '#1565C0' }}>
            <Plus size={18} /> Avisar un paquete
          </button>
        )}

        {/* ── Pendientes ── */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {pendientes.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-400 tracking-wider mb-3">
                  EN CAMINO ({pendientes.length})
                </p>
                <div className="space-y-2 mb-5">
                  {pendientes.map(p => (
                    <Tarjeta key={p.id} p={p}
                      onCancelar={() => quitar(p.id)}
                      cancelando={cancelar.isPending} />
                  ))}
                </div>
              </>
            )}

            {historial.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-400 tracking-wider mb-3">
                  ANTERIORES
                </p>
                <div className="space-y-2">
                  {historial.map(p => <Tarjeta key={p.id} p={p} />)}
                </div>
              </>
            )}

            {prealertas.length === 0 && !abierto && (
              <div className="text-center py-12">
                <PackagePlus size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600 mb-1">
                  Todavía no has avisado nada
                </p>
                <p className="text-xs text-slate-400 leading-relaxed px-6">
                  Cuando compres en una tienda y la envíes a nuestra bodega,
                  avísanos aquí para estar pendientes.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </ClienteLayout>
  )
}

function Tarjeta({ p, onCancelar, cancelando }) {
  const est = ESTADO_PREALERTA[p.estado] ?? ESTADO_PREALERTA.PENDIENTE
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#EEF2F8', color: '#1565C0' }}>
              {p.tienda}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: est.bg, color: est.color }}>
              {est.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 break-words">
            {p.descripcion}
          </p>
          {p.tracking && (
            <p className="text-xs text-slate-400 font-mono mt-0.5 break-all">
              {p.tracking}
            </p>
          )}
        </div>
        {onCancelar && (
          <button onClick={onCancelar} disabled={cancelando}
            aria-label="Cancelar aviso"
            className="text-slate-300 active:scale-90 flex-shrink-0 p-1
              disabled:opacity-40">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Truck size={12} />
        <span>
          Avisado {tiempoRelativo(p.created_at) ?? `el ${fechaCorta(p.created_at)}`}
        </span>
      </div>
    </div>
  )
}
