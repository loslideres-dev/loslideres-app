import { useState, useRef } from 'react'
import {
  Camera, Image as ImageIcon, Search, Package, Check, X, Loader2, AlertCircle,
  Receipt, FileText, PackagePlus, Link2, Plus,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useBuscarCliente } from '../../hooks/usePerfiles'
import { useRegistrarPaquete } from '../../hooks/usePaquetes'
import {
  usePrealertasDeCliente, useEnlazarPrealerta, useBuscarPorGuia,
} from '../../hooks/usePrealertas'
import { tiempoRelativo, fechaCorta } from '../../lib/fechas'
import { sugerirTalla } from '../../lib/tallas'
import { supabase } from '../../lib/supabase'
import { comprimirImagen } from '../../lib/imageUtils'
import { TAMANIOS } from '../../constants/roles'
import BodegueroLayout from '../../components/layout/BodegueroLayout'
import Toast from '../../components/ui/Toast'

const MAX_KB = 300

export default function Recepcion() {
  const { user } = useAuthStore()

  // Flujo: 1 = buscar cliente · 2 = registrar paquete · 3 = éxito
  const [step,       setStep]       = useState(1)
  const [query,      setQuery]      = useState('')
  const [clienteSel, setClienteSel] = useState(null)

  // Foto
  const [fotoBlob,    setFotoBlob]    = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoKB,      setFotoKB]      = useState(null)
  const [procesando,  setProcesando]  = useState(false)
  const [errorFoto,   setErrorFoto]   = useState('')

  const camRef = useRef(null)   // input con capture (cámara)
  const galRef = useRef(null)   // input sin capture (galería)

  const [form, setForm] = useState({
    tracking_externo: '', descripcion: '', tienda: '',
    largo_cm: '', ancho_cm: '', alto_cm: '', peso_kg: '',
    tamanio: '', observaciones: '',
  })

  // Cobro a destino: el flete que el bodeguero paga de su bolsillo al recibir
  const [cobroDestino, setCobroDestino] = useState(false)
  const [montoCobro,   setMontoCobro]   = useState('')
  const [guiaBlob,     setGuiaBlob]     = useState(null)
  const [guiaPreview,  setGuiaPreview]  = useState(null)
  const [guiaKB,       setGuiaKB]       = useState(null)
  const [procesandoGuia, setProcesandoGuia] = useState(false)
  const guiaCamRef = useRef(null)
  const guiaGalRef = useRef(null)
  const [tamanioManual, setTamanioManual] = useState(false)
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
  const [ultimoRegistro, setUltimoRegistro] = useState(null)

  // Pre-alertas: qué avisó este cliente que venía en camino
  const [modalAvisos, setModalAvisos] = useState(false)
  const [prealertaSel, setPrealertaSel] = useState(null)

  const { data: resultados = [], isLoading: buscando } = useBuscarCliente(query)
  const { mutateAsync: registrar, isPending: guardando } = useRegistrarPaquete()
  const { data: avisos = [] } = usePrealertasDeCliente(clienteSel?.id)
  const { data: porGuia = [] } = useBuscarPorGuia(query)
  const { mutateAsync: enlazar } = useEnlazarPrealerta()

  // ── Medidas: al cambiar, sugerir tamaño si no fue elegido a mano ────────────
  //
  // Usa lib/tallas.js, la misma fuente que la calculadora de cotización del
  // admin. Antes había aquí una copia local que solo miraba el lado más largo:
  // una caja de 30 cm con 20 kg salía S aquí y L en la cotización, y se
  // cotizaba un precio para terminar cobrando otro.
  const setMedida = (campo, valor) => {
    setForm(f => {
      const nuevo = { ...f, [campo]: valor }
      if (!tamanioManual) {
        nuevo.tamanio = sugerirTalla({
          largo: nuevo.largo_cm,
          ancho: nuevo.ancho_cm,
          alto:  nuevo.alto_cm,
          peso:  nuevo.peso_kg,
        })
      }
      return nuevo
    })
  }

  // ── Selección de foto (cámara o galería) ────────────────────────────────────
  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''            // permite volver a elegir el mismo archivo
    if (!file) return

    setErrorFoto('')
    setProcesando(true)
    try {
      const { blob, sizeKB } = await comprimirImagen(file, { maxKB: MAX_KB })
      if (fotoPreview) URL.revokeObjectURL(fotoPreview)
      setFotoBlob(blob)
      setFotoKB(sizeKB)
      setFotoPreview(URL.createObjectURL(blob))
    } catch (err) {
      setErrorFoto(err.message ?? 'Error al procesar la foto. Intenta de nuevo.')
      setFotoBlob(null)
      setFotoPreview(null)
      setFotoKB(null)
    } finally {
      setProcesando(false)
    }
  }

  const quitarFoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    setFotoBlob(null); setFotoPreview(null); setFotoKB(null); setErrorFoto('')
  }

  // ── Foto de la guía del flete ────────────────────────────────────────────────
  const handleGuia = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProcesandoGuia(true)
    try {
      const { blob, sizeKB } = await comprimirImagen(file, { maxKB: MAX_KB })
      setGuiaBlob(blob)
      setGuiaKB(sizeKB)
      setGuiaPreview(URL.createObjectURL(blob))
    } catch {
      setToast({ show: true, msg: 'Error al procesar la guía', type: 'error' })
    } finally {
      setProcesandoGuia(false)
    }
  }

  const quitarGuia = () => {
    setGuiaBlob(null); setGuiaPreview(null); setGuiaKB(null)
  }

  const limpiarCobro = () => {
    setCobroDestino(false); setMontoCobro(''); quitarGuia()
  }

  // ── Guardar: sube la foto y crea el paquete ─────────────────────────────────
  const handleGuardar = async () => {
    if (!clienteSel || !fotoBlob || !form.tamanio) return
    try {
      // 1. Subir foto comprimida a Storage
      const path = `paq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`
      const { error: errUp } = await supabase.storage
        .from('paquetes-fotos')
        .upload(path, fotoBlob, { contentType: 'image/jpeg', upsert: false })
      if (errUp) throw errUp

      const { data: { publicUrl } } = supabase.storage
        .from('paquetes-fotos')
        .getPublicUrl(path)

      // 2. Si hay cobro a destino, subir la guía del flete
      let comprobanteUrl = null
      if (cobroDestino && guiaBlob) {
        const pathGuia = `guia_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`
        const { error: errGuia } = await supabase.storage
          .from('paquetes-fotos')
          .upload(pathGuia, guiaBlob, { contentType: 'image/jpeg', upsert: false })
        if (errGuia) throw errGuia
        const { data: { publicUrl: urlGuia } } = supabase.storage
          .from('paquetes-fotos').getPublicUrl(pathGuia)
        comprobanteUrl = urlGuia
      }

      // 3. Insertar el paquete
      const data = await registrar({
        clienteId:     clienteSel.id,
        bodegueroId:   user.id,
        foto_url:      publicUrl,
        tracking_externo: form.tracking_externo.trim() || null,
        descripcion:   form.descripcion.trim() || null,
        tienda:        form.tienda.trim() || null,
        largo_cm:      parseFloat(form.largo_cm) || null,
        ancho_cm:      parseFloat(form.ancho_cm) || null,
        alto_cm:       parseFloat(form.alto_cm)  || null,
        peso_kg:       parseFloat(form.peso_kg)  || null,
        tamanio:       form.tamanio,
        observaciones: form.observaciones.trim() || null,
        cobro_destino:         cobroDestino,
        monto_cobro_destino:   cobroDestino ? parseFloat(montoCobro) : null,
        comprobante_cobro_url: comprobanteUrl,
      })

      // 4. Cerrar la pre-alerta si el bodeguero la enlazó.
      //    Va después del registro y en su propio try: el paquete ya está
      //    guardado y un fallo aquí no puede tumbar el flujo. Si falla, la
      //    pre-alerta queda pendiente y aparece en Gerencia → Avisados.
      if (prealertaSel) {
        try {
          await enlazar({ prealertaId: prealertaSel.id, paqueteId: data.id })
        } catch (e) {
          console.error('No se pudo enlazar la pre-alerta:', e)
        }
      }

      setUltimoRegistro({
        codigo: data.codigo,
        cliente: clienteSel.nombre,
        cobro: cobroDestino ? parseFloat(montoCobro) : null,
        aviso: prealertaSel ? prealertaSel.descripcion : null,
      })
      setStep(3)
    } catch (err) {
      console.error(err)
      setToast({ show: true, msg: 'Error al registrar el paquete', type: 'error' })
    }
  }

  // Elegir por guía identifica cliente Y paquete de una vez, así que no se
  // abre el modal: preguntar "¿cuál de estos es?" cuando la guía ya lo dijo
  // sería hacerle repetir la decisión al bodeguero.
  const tomarPorGuia = (pa) => {
    setClienteSel({
      id:               pa.cliente_id,
      nombre:           pa.cliente_nombre,
      codigo_casillero: pa.cliente_codigo,
    })
    setStep(2)
    tomarAviso(pa)
  }

  // Tomar un aviso: rellena lo que el cliente ya dijo para no teclearlo de nuevo,
  // y deja la pre-alerta marcada para enlazarla cuando el paquete se guarde.
  const tomarAviso = (pa) => {
    setPrealertaSel(pa)
    setForm(f => ({
      ...f,
      tienda:           pa.tienda ?? f.tienda,
      descripcion:      pa.descripcion ?? f.descripcion,
      tracking_externo: pa.tracking ?? f.tracking_externo,
    }))
    setModalAvisos(false)
  }

  // Soltar el aviso no borra lo ya escrito: el bodeguero pudo haber corregido
  // la descripción y perderla sería peor que dejar campos de más.
  const soltarAviso = () => setPrealertaSel(null)

  const resetTodo = () => {
    quitarFoto()
    setStep(1); setQuery(''); setClienteSel(null)
    setTamanioManual(false)
    setPrealertaSel(null); setModalAvisos(false)
    setForm({
      tracking_externo: '', descripcion: '', tienda: '',
      largo_cm: '', ancho_cm: '', alto_cm: '', peso_kg: '',
      tamanio: '', observaciones: '',
    })
    limpiarCobro()
  }

  const cobroCompleto = !cobroDestino
    || (parseFloat(montoCobro) > 0 && !!guiaBlob)

  const puedeGuardar = clienteSel && fotoBlob && form.tamanio
    && cobroCompleto && !procesando && !procesandoGuia && !guardando

  return (
    <BodegueroLayout>
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      {/* Inputs ocultos — cámara y galería */}
      <input ref={camRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handleFoto} />
      <input ref={galRef} type="file" accept="image/*"
        className="hidden" onChange={handleFoto} />

      <div className="px-5 py-4">

        {/* ════════ PASO 1 · BUSCAR CLIENTE ════════ */}
        {step === 1 && (
          <div>
            <p className="text-slate-500 text-sm mb-4">
              Busca el código <span className="font-mono font-semibold">LID-XXXX</span>{' '}
              que viene en la etiqueta del paquete
            </p>

            <div className="relative mb-3">
              <Search size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                placeholder="LID-0001, nombre o número de guía"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3.5 rounded-xl border border-slate-200
                  bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              {buscando && (
                <Loader2 size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-slate-400 animate-spin" />
              )}
            </div>

            {/* Resultados por guía. Van primero porque son de mayor certeza:
                una guía identifica un paquete concreto, un nombre solo apunta
                a una persona. */}
            {porGuia.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold tracking-wider mb-2"
                  style={{ color: '#1B7A3E' }}>
                  ENCONTRADO POR GUÍA
                </p>
                <div className="space-y-2">
                  {porGuia.map(pa => (
                    <button key={pa.id} onClick={() => tomarPorGuia(pa)}
                      className="w-full rounded-xl p-4 text-left active:scale-95 transition"
                      style={{ background: '#E6F4EC', border: '1px solid #A7D8BC' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Link2 size={14} style={{ color: '#1B7A3E' }} />
                        <span className="font-mono font-bold text-sm break-all"
                          style={{ color: '#14532D', letterSpacing: 0.5 }}>
                          {pa.tracking}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        {pa.cliente_nombre}
                      </p>
                      <p className="text-xs font-mono" style={{ color: '#1B7A3E' }}>
                        {pa.cliente_codigo}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 break-words">
                        {pa.tienda} · {pa.descripcion}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {resultados.length > 0 && (
              <div className="space-y-2">
                {resultados.map(c => (
                  <button key={c.id}
                    onClick={() => { setClienteSel(c); setStep(2); setModalAvisos(true) }}
                    className="w-full bg-white rounded-xl p-4 flex items-center gap-3
                      border border-slate-100 active:scale-95 transition text-left">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center
                      text-white text-sm font-bold flex-shrink-0"
                      style={{ background: '#1565C0' }}>
                      {(c.nombre ?? '??').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {c.nombre}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        {c.codigo_casillero}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {query.length >= 2 && !buscando && resultados.length === 0
              && porGuia.length === 0 && (
              <div className="text-center py-10">
                <Package size={36} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No se encontró ningún cliente</p>
                <p className="text-slate-400 text-xs mt-1">
                  Probaste con nombre, casillero y guía. Verifica el dato o
                  consulta con Administración.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════ PASO 2 · REGISTRAR PAQUETE ════════ */}
        {step === 2 && clienteSel && (
          <div>
            {/* Cliente seleccionado */}
            <div className="bg-white rounded-xl p-4 flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center
                  text-white text-xs font-bold flex-shrink-0"
                  style={{ background: '#1565C0' }}>
                  {(clienteSel.nombre ?? '??').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {clienteSel.nombre}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    {clienteSel.codigo_casillero}
                  </p>
                </div>
              </div>
              <button onClick={() => setStep(1)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center
                  justify-center text-slate-500 flex-shrink-0 active:scale-95">
                <X size={16} />
              </button>
            </div>

            {/* Aviso enlazado. Visible durante todo el registro para que el
                bodeguero sepa que este paquete cierra una pre-alerta. */}
            {prealertaSel && (
              <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-3"
                style={{ background: '#E6F4EC', border: '1px solid #A7D8BC' }}>
                <Link2 size={16} className="flex-shrink-0 mt-0.5"
                  style={{ color: '#1B7A3E' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: '#14532D' }}>
                    Enlazado al aviso del cliente
                  </p>
                  <p className="text-xs mt-0.5 break-words" style={{ color: '#1B7A3E' }}>
                    {prealertaSel.tienda} · {prealertaSel.descripcion}
                  </p>
                </div>
                <button onClick={soltarAviso} aria-label="Soltar aviso"
                  className="flex-shrink-0 p-1 active:scale-90"
                  style={{ color: '#1B7A3E' }}>
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Si lo cerró sin elegir, puede volver a abrirlo */}
            {!prealertaSel && avisos.length > 0 && (
              <button onClick={() => setModalAvisos(true)}
                className="w-full rounded-xl px-4 py-3 mb-4 flex items-center gap-3
                  active:scale-95 transition text-left"
                style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <PackagePlus size={16} className="flex-shrink-0"
                  style={{ color: '#B45309' }} />
                <p className="text-xs font-semibold flex-1" style={{ color: '#92400E' }}>
                  Este cliente avisó {avisos.length}{' '}
                  {avisos.length === 1 ? 'paquete' : 'paquetes'} en camino
                </p>
                <span className="text-xs font-bold" style={{ color: '#B45309' }}>
                  Ver
                </span>
              </button>
            )}

            {/* ── FOTO ── */}
            <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
              FOTO DEL PAQUETE *
            </p>

            {fotoPreview ? (
              <div className="relative mb-2">
                <img src={fotoPreview} alt="Foto del paquete"
                  className="w-full h-48 object-cover rounded-xl" />
                <button onClick={quitarFoto}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full
                    flex items-center justify-center active:scale-95"
                  style={{ background: 'rgba(220,38,38,0.9)' }}>
                  <X size={16} className="text-white" />
                </button>
                {fotoKB != null && (
                  <span className="absolute bottom-2 left-2 text-xs text-white
                    px-2 py-1 rounded-lg font-medium"
                    style={{ background: 'rgba(13,43,94,0.8)' }}>
                    {fotoKB} KB ✓
                  </span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => camRef.current?.click()}
                  disabled={procesando}
                  className="h-32 rounded-xl border-2 border-dashed border-slate-200
                    bg-white flex flex-col items-center justify-center gap-2
                    text-slate-500 active:scale-95 transition disabled:opacity-50">
                  {procesando
                    ? <Loader2 size={26} className="animate-spin text-blue-600" />
                    : <Camera size={26} style={{ color: '#1565C0' }} />}
                  <span className="text-xs font-medium">Tomar foto</span>
                </button>
                <button onClick={() => galRef.current?.click()}
                  disabled={procesando}
                  className="h-32 rounded-xl border-2 border-dashed border-slate-200
                    bg-white flex flex-col items-center justify-center gap-2
                    text-slate-500 active:scale-95 transition disabled:opacity-50">
                  <ImageIcon size={26} className="text-slate-400" />
                  <span className="text-xs font-medium">Elegir de galería</span>
                </button>
              </div>
            )}

            {errorFoto && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-2
                bg-red-50 border border-red-200">
                <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700">
                  {errorFoto} Si el navegador pidió permiso de cámara y lo negaste,
                  actívalo en los ajustes del navegador o usa la galería.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-400 mb-4">
              La foto se comprime automáticamente a máx. {MAX_KB} KB
            </p>

            {/* ── DATOS ── */}
            <div className="space-y-3 mb-4">
              <div>
                <input type="text"
                  placeholder="Tracking del courier (ej. Amazon, Servientrega)"
                  value={form.tracking_externo}
                  autoCapitalize="characters"
                  onChange={e => setForm(f => ({ ...f, tracking_externo: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                    text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                <p className="text-xs text-slate-400 mt-1 ml-1">
                  Opcional — el código con el que el cliente rastrea su paquete
                </p>
              </div>
              <input type="text" placeholder="Descripción (ej. Zapatos Nike)"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                  text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Tienda (ej. Amazon, Shein)"
                value={form.tienda}
                onChange={e => setForm(f => ({ ...f, tienda: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                  text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* ── MEDIDAS ── */}
            <p className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
              MEDIDAS (CM) Y PESO (KG)
            </p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[['largo_cm', 'Largo'], ['ancho_cm', 'Ancho'], ['alto_cm', 'Alto']].map(([k, l]) => (
                <input key={k} type="number" inputMode="decimal" placeholder={l}
                  value={form[k]}
                  onChange={e => setMedida(k, e.target.value)}
                  className="px-3 py-3 rounded-xl border border-slate-200 bg-white
                    text-sm text-center outline-none focus:ring-2 focus:ring-blue-500" />
              ))}
            </div>
            <input type="number" inputMode="decimal" placeholder="Peso (kg)"
              value={form.peso_kg}
              onChange={e => setMedida('peso_kg', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4" />

            {/* ── TAMAÑO ── */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 tracking-wider">
                TAMAÑO *
              </p>
              {!tamanioManual && form.tamanio && (
                <span className="text-xs font-medium" style={{ color: '#1565C0' }}>
                  Sugerido por medidas: {form.tamanio}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-1">
              {TAMANIOS.map(({ value }) => (
                <button key={value}
                  onClick={() => {
                    setTamanioManual(true)
                    setForm(f => ({ ...f, tamanio: value }))
                  }}
                  className={`py-3 rounded-xl text-sm font-bold border-2 transition
                    active:scale-95
                    ${form.tamanio === value
                      ? 'text-white'
                      : 'border-slate-200 text-slate-600 bg-white'}`}
                  style={form.tamanio === value
                    ? { background: '#1565C0', borderColor: '#1565C0' }
                    : {}}>
                  {value}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mb-4">
              S: hasta 30 cm · M: hasta 50 cm · L: hasta 80 cm · XL: más grande
            </p>

            {/* ── COBRO A DESTINO ── */}
            <input ref={guiaCamRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleGuia} />
            <input ref={guiaGalRef} type="file" accept="image/*"
              className="hidden" onChange={handleGuia} />

            <div className="rounded-2xl mb-4 overflow-hidden"
              style={{
                border: cobroDestino ? '2px solid #B45309' : '1px solid #E2E8F0',
                background: cobroDestino ? '#FFFBEB' : '#FFFFFF',
              }}>

              {/* Interruptor */}
              <button
                onClick={() => cobroDestino ? limpiarCobro() : setCobroDestino(true)}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center
                  flex-shrink-0"
                  style={{ background: cobroDestino ? '#FEF3C7' : '#F4F6FA' }}>
                  <Receipt size={17}
                    style={{ color: cobroDestino ? '#B45309' : '#94A3B8' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold"
                    style={{ color: cobroDestino ? '#92400E' : '#334155' }}>
                    Cobro a destino
                  </p>
                  <p className="text-xs"
                    style={{ color: cobroDestino ? '#B45309' : '#94A3B8' }}>
                    Pagaste el flete al recibir este paquete
                  </p>
                </div>
                <div className="w-11 h-6 rounded-full transition relative flex-shrink-0"
                  style={{ background: cobroDestino ? '#B45309' : '#CBD5E1' }}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white
                    transition-all ${cobroDestino ? 'left-[22px]' : 'left-0.5'}`} />
                </div>
              </button>

              {/* Monto y guía */}
              {cobroDestino && (
                <div className="px-4 pb-4 space-y-3"
                  style={{ borderTop: '1px solid #FDE68A' }}>

                  <div className="pt-3">
                    <p className="text-xs font-semibold mb-1.5"
                      style={{ color: '#92400E' }}>
                      ¿Cuánto pagaste? *
                    </p>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2
                        text-slate-400 text-sm">$</span>
                      <input type="number" inputMode="numeric" value={montoCobro}
                        onChange={e => setMontoCobro(e.target.value)}
                        placeholder="0"
                        className="w-full pl-9 pr-14 py-3 rounded-xl bg-white text-lg
                          font-bold outline-none focus:ring-2"
                        style={{ border: '1px solid #FDE68A' }} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2
                        text-slate-400 text-xs">COP</span>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: '#B45309' }}>
                      Este monto se te devuelve completo en tu liquidación,
                      además de tu comisión.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-1.5"
                      style={{ color: '#92400E' }}>
                      Foto de la guía o el recibo *
                    </p>
                    {guiaPreview ? (
                      <div className="relative">
                        <img src={guiaPreview} alt="Guía"
                          className="w-full h-40 object-cover rounded-xl" />
                        <button onClick={quitarGuia}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full
                            flex items-center justify-center active:scale-90"
                          style={{ background: 'rgba(0,0,0,0.55)' }}>
                          <X size={15} className="text-white" />
                        </button>
                        {guiaKB != null && (
                          <span className="absolute bottom-2 left-2 text-white text-[10px]
                            font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(0,0,0,0.5)' }}>
                            {guiaKB} KB ✓
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => guiaCamRef.current?.click()}
                          disabled={procesandoGuia}
                          className="py-3 rounded-xl bg-white flex items-center
                            justify-center gap-2 text-xs font-medium active:scale-95
                            disabled:opacity-50"
                          style={{ border: '2px dashed #FDE68A', color: '#B45309' }}>
                          {procesandoGuia
                            ? <Loader2 size={15} className="animate-spin" />
                            : <Camera size={15} />}
                          Tomar foto
                        </button>
                        <button onClick={() => guiaGalRef.current?.click()}
                          disabled={procesandoGuia}
                          className="py-3 rounded-xl bg-white flex items-center
                            justify-center gap-2 text-xs font-medium active:scale-95
                            disabled:opacity-50"
                          style={{ border: '2px dashed #FDE68A', color: '#B45309' }}>
                          <ImageIcon size={15} /> Galería
                        </button>
                      </div>
                    )}
                    <p className="text-xs mt-1.5" style={{ color: '#B45309' }}>
                      Administración la revisa para verificar el pago.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── OBSERVACIONES ── */}
            <textarea placeholder="Observaciones (opcional)"
              value={form.observaciones} rows={2}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4" />

            {/* ── GUARDAR ── */}
            <button onClick={handleGuardar} disabled={!puedeGuardar}
              className="w-full py-4 rounded-2xl text-white font-semibold text-sm
                flex items-center justify-center gap-2 disabled:opacity-50
                active:scale-95 transition"
              style={{ background: '#1565C0' }}>
              {guardando
                ? <><Loader2 size={18} className="animate-spin" /> Guardando...</>
                : <><Check size={18} /> Registrar paquete</>}
            </button>

            {cobroDestino && !cobroCompleto && (
              <div className="mt-3 px-4 py-3 rounded-xl flex gap-2.5"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <FileText size={15} className="flex-shrink-0 mt-0.5"
                  style={{ color: '#B45309' }} />
                <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
                  Para registrar con cobro a destino falta{' '}
                  {!(parseFloat(montoCobro) > 0) && 'el monto que pagaste'}
                  {!(parseFloat(montoCobro) > 0) && !guiaBlob && ' y '}
                  {!guiaBlob && 'la foto de la guía'}.
                </p>
              </div>
            )}

            {!fotoBlob && (
              <p className="text-xs text-center text-slate-400 mt-2">
                La foto es obligatoria para registrar
              </p>
            )}
          </div>
        )}

        {/* ════════ PASO 3 · ÉXITO ════════ */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: '#E6F4EC' }}>
              <Check size={40} style={{ color: '#1B7A3E' }} />
            </div>
            <h2 className="text-slate-800 text-xl font-bold mb-1">
              ¡Paquete registrado!
            </h2>
            {ultimoRegistro && (
              <p className="text-slate-500 text-sm mb-1">
                <span className="font-mono font-semibold">{ultimoRegistro.codigo}</span>
                {' '}· {ultimoRegistro.cliente}
              </p>
            )}
            {ultimoRegistro?.cobro > 0 && (
              <div className="px-4 py-3 rounded-xl mb-4 flex items-center gap-2.5"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <Receipt size={16} style={{ color: '#B45309' }} />
                <p className="text-xs text-left" style={{ color: '#92400E' }}>
                  Se registró el flete de{' '}
                  <span className="font-bold">
                    ${ultimoRegistro.cobro.toLocaleString('es-CO')} COP
                  </span>.
                  Se te devuelve en tu próxima liquidación.
                </p>
              </div>
            )}
            {ultimoRegistro?.aviso && (
              <div className="px-4 py-3 rounded-xl mb-4 flex items-center gap-2.5"
                style={{ background: '#E6F4EC', border: '1px solid #A7D8BC' }}>
                <Link2 size={16} style={{ color: '#1B7A3E' }} />
                <p className="text-xs text-left" style={{ color: '#14532D' }}>
                  Se cerró el aviso del cliente:{' '}
                  <span className="font-bold">{ultimoRegistro.aviso}</span>.
                </p>
              </div>
            )}
            <p className="text-slate-400 text-xs mb-8">
              Administración lo verá en su bandeja para asignarle el precio.
            </p>
            <button onClick={resetTodo}
              className="w-full py-4 rounded-2xl text-white font-semibold text-sm
                active:scale-95 transition"
              style={{ background: '#1565C0' }}>
              Registrar otro paquete
            </button>
          </div>
        )}

      </div>

      {/* ════════ MODAL · PRE-ALERTAS DEL CLIENTE ════════
          Se abre solo si el cliente avisó algo. Interrumpe a propósito:
          si el bodeguero no enlaza, la pre-alerta queda abierta para siempre
          y la función entera deja de servir. */}
      {modalAvisos && avisos.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(13,43,94,0.6)' }}
          onClick={() => setModalAvisos(false)}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8
            max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5" />

            <div className="flex items-start gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center
                flex-shrink-0" style={{ background: '#FEF3C7' }}>
                <PackagePlus size={20} style={{ color: '#B45309' }} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-800">
                  {clienteSel?.nombre} avisó {avisos.length}{' '}
                  {avisos.length === 1 ? 'paquete' : 'paquetes'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ¿El que tienes en la mano es alguno de estos?
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-5 mb-4">
              {avisos.map(pa => (
                <button key={pa.id} onClick={() => tomarAviso(pa)}
                  className="w-full rounded-xl p-4 text-left active:scale-95 transition
                    border border-slate-200 bg-white">

                  {/* La guía va primero y grande: es el único dato que el
                      bodeguero puede cotejar contra la etiqueta de la caja que
                      tiene en la mano. La tienda y la descripción son contexto. */}
                  {pa.tracking ? (
                    <div className="rounded-lg px-3 py-2.5 mb-3"
                      style={{ background: '#F1F5F9' }}>
                      <p className="text-[10px] font-semibold tracking-wider mb-1"
                        style={{ color: '#64748B' }}>
                        GUÍA A COMPARAR
                      </p>
                      <p className="font-mono font-bold break-all leading-tight"
                        style={{ fontSize: 22, color: '#0D2B5E', letterSpacing: 1 }}>
                        {pa.tracking}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg px-3 py-2 mb-3"
                      style={{ background: '#FFFBEB' }}>
                      <p className="text-[11px] font-semibold" style={{ color: '#B45309' }}>
                        Sin guía — compara por tienda y contenido
                      </p>
                    </div>
                  )}

                  <p className="text-sm font-semibold text-slate-800 break-words">
                    {pa.descripcion}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#EEF2F8', color: '#1565C0' }}>
                      {pa.tienda}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Avisado {tiempoRelativo(pa.created_at) ?? fechaCorta(pa.created_at)}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Registrar sin enlazar queda como opción secundaria a propósito:
                si tuviera el mismo peso visual, se volvería el reflejo. */}
            <button onClick={() => setModalAvisos(false)}
              className="w-full py-3.5 rounded-xl border border-slate-200 bg-white
                text-sm font-semibold text-slate-500 flex items-center
                justify-center gap-2 active:scale-95 transition">
              <Plus size={16} /> Ninguno, es un paquete nuevo
            </button>
          </div>
        </div>
      )}
    </BodegueroLayout>
  )
}
