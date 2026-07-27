import { useState, useRef } from 'react'
import {
  Package, RefreshCw, Camera, Image as ImageIcon, Loader2, Check,
  Trash2, Pencil, AlertTriangle, X,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import {
  usePaquetesHoy, useActualizarPaquete, useEliminarPaquete,
} from '../../hooks/usePaquetes'
import { supabase } from '../../lib/supabase'
import { comprimirImagen } from '../../lib/imageUtils'
import { TAMANIOS } from '../../constants/roles'
import BodegueroLayout from '../../components/layout/BodegueroLayout'
import EstadoBadge from '../../components/ui/EstadoBadge'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'

const MAX_KB = 300

function sugerirTamanio(l, a, h) {
  const m = Math.max(Number(l) || 0, Number(a) || 0, Number(h) || 0)
  if (!m)      return ''
  if (m <= 30) return 'S'
  if (m <= 50) return 'M'
  if (m <= 80) return 'L'
  return 'XL'
}

export default function Registros() {
  const { user } = useAuthStore()
  const { data: paquetes = [], isLoading, refetch } = usePaquetesHoy(user?.id)

  const [detalle, setDetalle] = useState(null)   // paquete seleccionado
  const [toast,   setToast]   = useState({ show: false, msg: '', type: 'success' })

  return (
    <BodegueroLayout>
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      {/* Contador (fijo arriba mientras scrollea la lista) */}
      <div className="sticky top-0 z-10 px-5 pt-4 pb-3" style={{ background: '#F4F6FA' }}>
        <div className="rounded-2xl p-5 flex items-center justify-between"
          style={{ background: '#1565C0' }}>
          <div>
            <p className="text-blue-200 text-xs mb-0.5">REGISTRADOS HOY</p>
            <p className="text-white text-4xl font-black">{paquetes.length}</p>
            <p className="text-blue-200 text-xs mt-0.5">
              {paquetes.length === 1 ? 'paquete' : 'paquetes'}
            </p>
          </div>
          <button onClick={() => refetch()}
            className="text-blue-200 hover:text-white transition p-2 active:scale-95">
            <RefreshCw size={22} />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="px-5 pb-6">
        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && paquetes.length === 0 && (
          <div className="text-center py-16">
            <Package size={48} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              No has registrado paquetes hoy
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Los registros aparecen aquí al guardarlos
            </p>
          </div>
        )}

        <div className="space-y-3">
          {paquetes.map(p => (
            <button key={p.id} onClick={() => setDetalle(p)}
              className="w-full bg-white rounded-2xl overflow-hidden flex items-stretch
                shadow-sm active:scale-95 transition text-left">
              <div className="w-20 h-20 flex-shrink-0 bg-slate-100">
                {p.foto_url
                  ? <img src={p.foto_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <Package size={24} className="text-slate-300" />
                    </div>}
              </div>
              <div className="flex-1 px-4 py-3 min-w-0">
                <div className="flex items-start justify-between mb-1 gap-2">
                  <div className="min-w-0">
                    {p.tracking_externo && (
                      <p className="text-xs font-mono font-semibold text-slate-700 truncate">
                        {p.tracking_externo}
                      </p>
                    )}
                    <p className="text-xs font-mono text-slate-400">{p.codigo}</p>
                  </div>
                  <EstadoBadge estado={p.estado} />
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {p.cliente_nombre ?? p.perfiles?.nombre ?? 'Cliente'}
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  {p.cliente_codigo ?? p.perfiles?.codigo_casillero ?? ''}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {[p.largo_cm, p.ancho_cm, p.alto_cm].filter(Boolean).join('×')}
                  {p.largo_cm ? ' cm' : ''}
                  {p.peso_kg ? ` · ${p.peso_kg}kg` : ''}
                  {p.tamanio ? ` · ${p.tamanio}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modal de detalle / edición */}
      {detalle && (
        <DetalleRegistro
          paquete={detalle}
          onClose={() => setDetalle(null)}
          onToast={(msg, type = 'success') => setToast({ show: true, msg, type })}
        />
      )}
    </BodegueroLayout>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de detalle con edición y eliminación (solo si estado === RECIBIDO)
// ─────────────────────────────────────────────────────────────────────────────
function DetalleRegistro({ paquete, onClose, onToast }) {
  const editable = paquete.estado === 'RECIBIDO'
  const [modo, setModo] = useState('ver')   // 'ver' | 'editar' | 'eliminar'

  const { mutateAsync: actualizar, isPending: guardando } = useActualizarPaquete()
  const { mutateAsync: eliminar,   isPending: eliminando } = useEliminarPaquete()

  const [form, setForm] = useState({
    tracking_externo: paquete.tracking_externo ?? '',
    descripcion: paquete.descripcion ?? '',
    tienda:      paquete.tienda ?? '',
    largo_cm:    paquete.largo_cm ?? '',
    ancho_cm:    paquete.ancho_cm ?? '',
    alto_cm:     paquete.alto_cm ?? '',
    peso_kg:     paquete.peso_kg ?? '',
    tamanio:     paquete.tamanio ?? '',
    observaciones: paquete.observaciones ?? '',
  })
  const [tamanioManual, setTamanioManual] = useState(true)

  // Foto
  const [fotoBlob,    setFotoBlob]    = useState(null)
  const [fotoPreview, setFotoPreview] = useState(paquete.foto_url ?? null)
  const [fotoKB,      setFotoKB]      = useState(null)
  const [procesando,  setProcesando]  = useState(false)
  const camRef = useRef(null)
  const galRef = useRef(null)

  const setMedida = (campo, valor) => {
    setForm(f => {
      const nuevo = { ...f, [campo]: valor }
      if (!tamanioManual) nuevo.tamanio = sugerirTamanio(nuevo.largo_cm, nuevo.ancho_cm, nuevo.alto_cm)
      return nuevo
    })
  }

  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProcesando(true)
    try {
      const { blob, sizeKB } = await comprimirImagen(file, { maxKB: MAX_KB })
      setFotoBlob(blob)
      setFotoKB(sizeKB)
      setFotoPreview(URL.createObjectURL(blob))
    } catch {
      onToast('Error al procesar la foto', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const handleGuardar = async () => {
    try {
      let foto_url = paquete.foto_url
      // Si cambió la foto, subir la nueva
      if (fotoBlob) {
        const path = `paq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`
        const { error: errUp } = await supabase.storage
          .from('paquetes-fotos')
          .upload(path, fotoBlob, { contentType: 'image/jpeg', upsert: false })
        if (errUp) throw errUp
        const { data: { publicUrl } } = supabase.storage
          .from('paquetes-fotos').getPublicUrl(path)
        foto_url = publicUrl
      }

      await actualizar({
        id:            paquete.id,
        foto_url,
        tracking_externo: form.tracking_externo.trim() || null,
        descripcion:   form.descripcion.trim() || null,
        tienda:        form.tienda.trim() || null,
        largo_cm:      parseFloat(form.largo_cm) || null,
        ancho_cm:      parseFloat(form.ancho_cm) || null,
        alto_cm:       parseFloat(form.alto_cm)  || null,
        peso_kg:       parseFloat(form.peso_kg)  || null,
        tamanio:       form.tamanio || null,
        observaciones: form.observaciones.trim() || null,
      })
      onToast('Registro actualizado ✓')
      onClose()
    } catch {
      onToast('Error al guardar los cambios', 'error')
    }
  }

  const handleEliminar = async () => {
    try {
      await eliminar({ id: paquete.id, codigo: paquete.codigo })
      onToast('Registro eliminado')
      onClose()
    } catch {
      onToast('Error al eliminar', 'error')
    }
  }

  return (
    <Modal open onClose={onClose} title={paquete.codigo}>

      {/* ---- MODO ELIMINAR (confirmación) ---- */}
      {modo === 'eliminar' && (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: '#FEE2E2' }}>
            <AlertTriangle size={30} style={{ color: '#DC2626' }} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">¿Eliminar registro?</h3>
          <p className="text-sm text-slate-500 mb-6 px-4">
            Se eliminará el paquete <span className="font-mono font-semibold">{paquete.codigo}</span>.
            Esta acción no se puede deshacer.
          </p>
          <div className="space-y-2">
            <button onClick={handleEliminar} disabled={eliminando}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm
                flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              style={{ background: '#DC2626' }}>
              {eliminando ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              Sí, eliminar
            </button>
            <button onClick={() => setModo('ver')}
              className="w-full py-3.5 rounded-xl font-semibold text-sm border border-slate-200
                text-slate-600 active:scale-95">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ---- MODO VER ---- */}
      {modo === 'ver' && (
        <div className="space-y-4">
          {paquete.foto_url && (
            <img src={paquete.foto_url} alt="" className="w-full h-52 object-cover rounded-xl" />
          )}

          <div className="flex items-center justify-between">
            <EstadoBadge estado={paquete.estado} />
            <span className="text-xs text-slate-400">
              {paquete.cliente_nombre ?? paquete.perfiles?.nombre}
              {' · '}
              {paquete.cliente_codigo ?? paquete.perfiles?.codigo_casillero}
            </span>
          </div>

          {paquete.tracking_externo && (
            <Dato label="Tracking del courier" valor={paquete.tracking_externo} />
          )}

          <div className="grid grid-cols-2 gap-2">
            <Dato label="Descripción" valor={paquete.descripcion || '—'} />
            <Dato label="Tienda" valor={paquete.tienda || '—'} />
            <Dato label="Medidas" valor={
              [paquete.largo_cm, paquete.ancho_cm, paquete.alto_cm].filter(Boolean).join('×') +
              (paquete.largo_cm ? ' cm' : '—')} />
            <Dato label="Peso" valor={paquete.peso_kg ? `${paquete.peso_kg} kg` : '—'} />
            <Dato label="Tamaño" valor={paquete.tamanio || '—'} />
            <Dato label="Recibido" valor={
              new Date(paquete.fecha_recepcion).toLocaleDateString('es-VE',
                { day: 'numeric', month: 'short' })} />
          </div>

          {paquete.observaciones && (
            <Dato label="Observaciones" valor={paquete.observaciones} />
          )}

          {editable ? (
            <div className="space-y-2 pt-2">
              <button onClick={() => setModo('editar')}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm
                  flex items-center justify-center gap-2 active:scale-95"
                style={{ background: '#1565C0' }}>
                <Pencil size={17} /> Editar registro
              </button>
              <button onClick={() => setModo('eliminar')}
                className="w-full py-3.5 rounded-xl font-semibold text-sm border-2
                  flex items-center justify-center gap-2 active:scale-95"
                style={{ borderColor: '#FCA5A5', color: '#DC2626' }}>
                <Trash2 size={17} /> Eliminar registro
              </button>
            </div>
          ) : (
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: '#EEF2F8' }}>
              <p className="text-xs" style={{ color: '#1565C0' }}>
                Este paquete ya avanzó de estado. Solo se puede editar o eliminar
                mientras está "Recibido en bodega".
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---- MODO EDITAR ---- */}
      {modo === 'editar' && (
        <div className="space-y-4">
          <input ref={camRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handleFoto} />
          <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />

          {/* Foto */}
          <div>
            <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">FOTO</p>
            {fotoPreview && (
              <img src={fotoPreview} alt="" className="w-full h-44 object-cover rounded-xl mb-2" />
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => camRef.current?.click()} disabled={procesando}
                className="py-2.5 rounded-xl border-2 border-dashed border-slate-200 bg-white
                  flex items-center justify-center gap-2 text-slate-500 text-xs font-medium
                  active:scale-95 disabled:opacity-50">
                {procesando ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                Cambiar (cámara)
              </button>
              <button onClick={() => galRef.current?.click()} disabled={procesando}
                className="py-2.5 rounded-xl border-2 border-dashed border-slate-200 bg-white
                  flex items-center justify-center gap-2 text-slate-500 text-xs font-medium
                  active:scale-95 disabled:opacity-50">
                <ImageIcon size={16} /> Galería
              </button>
            </div>
            {fotoKB != null && (
              <p className="text-xs text-slate-400 mt-1">Nueva foto: {fotoKB} KB ✓</p>
            )}
          </div>

          {/* Datos */}
          <div>
            <input type="text" placeholder="Tracking del courier (opcional)"
              value={form.tracking_externo}
              autoCapitalize="characters"
              onChange={e => setForm(f => ({ ...f, tracking_externo: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm
                font-mono outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <input type="text" placeholder="Descripción" value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm
              outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Tienda" value={form.tienda}
            onChange={e => setForm(f => ({ ...f, tienda: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm
              outline-none focus:ring-2 focus:ring-blue-500" />

          <div className="grid grid-cols-3 gap-2">
            {[['largo_cm','Largo'],['ancho_cm','Ancho'],['alto_cm','Alto']].map(([k,l]) => (
              <input key={k} type="number" inputMode="decimal" placeholder={l} value={form[k]}
                onChange={e => setMedida(k, e.target.value)}
                className="px-3 py-3 rounded-xl border border-slate-200 bg-white text-sm text-center
                  outline-none focus:ring-2 focus:ring-blue-500" />
            ))}
          </div>
          <input type="number" inputMode="decimal" placeholder="Peso (kg)" value={form.peso_kg}
            onChange={e => setForm(f => ({ ...f, peso_kg: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm
              outline-none focus:ring-2 focus:ring-blue-500" />

          <div>
            <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">TAMAÑO</p>
            <div className="grid grid-cols-4 gap-2">
              {TAMANIOS.map(({ value }) => (
                <button key={value}
                  onClick={() => { setTamanioManual(true); setForm(f => ({ ...f, tamanio: value })) }}
                  className={`py-3 rounded-xl text-sm font-bold border-2 transition active:scale-95
                    ${form.tamanio === value ? 'text-white' : 'border-slate-200 text-slate-600 bg-white'}`}
                  style={form.tamanio === value
                    ? { background: '#1565C0', borderColor: '#1565C0' } : {}}>
                  {value}
                </button>
              ))}
            </div>
          </div>

          <textarea placeholder="Observaciones" rows={2} value={form.observaciones}
            onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm
              outline-none focus:ring-2 focus:ring-blue-500 resize-none" />

          <div className="space-y-2 pt-1">
            <button onClick={handleGuardar} disabled={guardando || procesando}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm
                flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              style={{ background: '#1565C0' }}>
              {guardando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Guardar cambios
            </button>
            <button onClick={() => setModo('ver')}
              className="w-full py-3.5 rounded-xl font-semibold text-sm border border-slate-200
                text-slate-600 active:scale-95 flex items-center justify-center gap-2">
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Dato({ label, valor }) {
  return (
    <div className="bg-white rounded-xl px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">{valor}</p>
    </div>
  )
}
