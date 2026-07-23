import { useState, useRef } from 'react'
import { Camera, Search, Package, Check, X, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useBuscarCliente } from '../../hooks/usePerfiles'
import { useRegistrarPaquete } from '../../hooks/usePaquetes'
import { supabase } from '../../lib/supabase'
import { TAMANIOS } from '../../constants/roles'
import BodegueroLayout from '../../components/layout/BodegueroLayout'
import Toast from '../../components/ui/Toast'

export default function Recepcion() {
  const { user } = useAuthStore()
  const [step, setStep]             = useState(1) // 1=buscar, 2=registrar, 3=ok
  const [query, setQuery]           = useState('')
  const [clienteSel, setClienteSel] = useState(null)
  const [foto, setFoto]             = useState(null)
  const [fotoUrl, setFotoUrl]       = useState(null)
  const [uploading, setUploading]   = useState(false)
  const [toast, setToast]           = useState({ show: false, msg: '', type: 'success' })
  const [form, setForm]             = useState({
    descripcion: '', tienda: '',
    largo_cm: '', ancho_cm: '', alto_cm: '', peso_kg: '',
    tamanio: '', observaciones: '',
  })
  const fileRef = useRef()

  const { data: resultados = [], isLoading: buscando } = useBuscarCliente(query)
  const { mutateAsync: registrar, isPending } = useRegistrarPaquete()

  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFoto(URL.createObjectURL(file))
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('paquetes-fotos')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('paquetes-fotos').getPublicUrl(path)
      setFotoUrl(publicUrl)
    } catch {
      setToast({ show: true, msg: 'Error subiendo foto', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleGuardar = async () => {
    if (!clienteSel) return
    try {
      await registrar({
        clienteId:   clienteSel.id,
        bodegueroId: user.id,
        foto_url:    fotoUrl,
        descripcion: form.descripcion,
        tienda:      form.tienda,
        largo_cm:    parseFloat(form.largo_cm) || null,
        ancho_cm:    parseFloat(form.ancho_cm) || null,
        alto_cm:     parseFloat(form.alto_cm)  || null,
        peso_kg:     parseFloat(form.peso_kg)  || null,
        tamanio:     form.tamanio,
        observaciones: form.observaciones,
      })
      setStep(3)
    } catch {
      setToast({ show: true, msg: 'Error registrando paquete', type: 'error' })
    }
  }

  const resetForm = () => {
    setStep(1); setQuery(''); setClienteSel(null)
    setFoto(null); setFotoUrl(null)
    setForm({ descripcion:'',tienda:'',largo_cm:'',ancho_cm:'',alto_cm:'',peso_kg:'',tamanio:'',observaciones:'' })
  }

  return (
    <BodegueroLayout>
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      <div className="px-5 py-4">

        {/* ── STEP 1: Buscar cliente ── */}
        {step === 1 && (
          <div>
            <p className="text-slate-500 text-sm mb-4">
              Ingresa el código LID o nombre del cliente
            </p>
            <div className="relative mb-3">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="LID-0001 o nombre del cliente"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200
                  bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              {buscando && (
                <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2
                  text-slate-400 animate-spin" />
              )}
            </div>

            {resultados.length > 0 && (
              <div className="space-y-2">
                {resultados.map(c => (
                  <button key={c.id} onClick={() => { setClienteSel(c); setStep(2) }}
                    className="w-full bg-white rounded-xl p-4 flex items-center gap-3
                      border border-slate-100 active:scale-95 transition text-left">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center
                      text-white text-sm font-bold flex-shrink-0"
                      style={{ background: '#1565C0' }}>
                      {c.nombre?.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{c.nombre}</p>
                      <p className="text-xs text-slate-400 font-mono">{c.codigo_casillero}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {query.length >= 2 && !buscando && resultados.length === 0 && (
              <div className="text-center py-8">
                <Package size={36} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No se encontró ningún cliente</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Registrar paquete ── */}
        {step === 2 && clienteSel && (
          <div>
            {/* Cliente seleccionado */}
            <div className="bg-white rounded-xl p-4 flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center
                  text-white text-xs font-bold" style={{ background: '#1565C0' }}>
                  {clienteSel.nombre?.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{clienteSel.nombre}</p>
                  <p className="text-xs text-slate-400 font-mono">{clienteSel.codigo_casillero}</p>
                </div>
              </div>
              <button onClick={() => setStep(1)} className="text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* Foto */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">FOTO DEL PAQUETE *</p>
              <button onClick={() => fileRef.current?.click()}
                className="w-full h-40 rounded-xl border-2 border-dashed border-slate-200
                  flex items-center justify-center bg-white overflow-hidden relative">
                {foto
                  ? <img src={foto} className="w-full h-full object-cover" />
                  : <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Camera size={32} />
                      <span className="text-sm">Tomar foto o elegir imagen</span>
                    </div>
                }
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                  </div>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={handleFoto} />
            </div>

            {/* Datos básicos */}
            <div className="space-y-3 mb-4">
              <input type="text" placeholder="Descripción (ej. Zapatos Nike)"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                  text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Tienda (ej. Amazon)"
                value={form.tienda}
                onChange={e => setForm(f => ({ ...f, tienda: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                  text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Medidas */}
            <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">MEDIDAS (CM)</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[['largo_cm','Largo'],['ancho_cm','Ancho'],['alto_cm','Alto']].map(([k,l]) => (
                <input key={k} type="number" placeholder={l}
                  value={form[k]}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  className="px-3 py-3 rounded-xl border border-slate-200 bg-white
                    text-sm text-center outline-none focus:ring-2 focus:ring-blue-500" />
              ))}
            </div>
            <input type="number" placeholder="Peso (kg)"
              value={form.peso_kg}
              onChange={e => setForm(f => ({ ...f, peso_kg: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4" />

            {/* Tamaño */}
            <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">TAMAÑO</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {TAMANIOS.map(({ value, label }) => (
                <button key={value}
                  onClick={() => setForm(f => ({ ...f, tamanio: value }))}
                  className={`py-3 rounded-xl text-sm font-bold border-2 transition
                    ${form.tamanio === value
                      ? 'border-blue-600 text-white'
                      : 'border-slate-200 text-slate-600 bg-white'}`}
                  style={form.tamanio === value ? { background: '#1565C0', borderColor: '#1565C0' } : {}}>
                  {value}
                </button>
              ))}
            </div>

            {/* Observaciones */}
            <textarea placeholder="Observaciones (opcional)"
              value={form.observaciones} rows={2}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4" />

            <button onClick={handleGuardar} disabled={isPending || uploading || !form.tamanio}
              className="w-full py-4 rounded-xl text-white font-semibold text-sm
                flex items-center justify-center gap-2 disabled:opacity-50 transition active:scale-95"
              style={{ background: '#1565C0' }}>
              {isPending
                ? <><Loader2 size={18} className="animate-spin" /> Guardando...</>
                : 'Registrar paquete'}
            </button>
          </div>
        )}

        {/* ── STEP 3: Éxito ── */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: '#E6F4EC' }}>
              <Check size={40} style={{ color: '#1B7A3E' }} />
            </div>
            <h2 className="text-slate-800 text-xl font-bold mb-1">¡Paquete registrado!</h2>
            <p className="text-slate-500 text-sm mb-2">
              Asignado a <span className="font-semibold">{clienteSel?.nombre}</span>
            </p>
            <p className="text-slate-400 text-xs mb-8">
              Iván recibirá una notificación para asignar el precio.
            </p>
            <button onClick={resetForm}
              className="w-full py-4 rounded-xl text-white font-semibold text-sm active:scale-95"
              style={{ background: '#1565C0' }}>
              Registrar otro paquete
            </button>
          </div>
        )}
      </div>
    </BodegueroLayout>
  )
}
