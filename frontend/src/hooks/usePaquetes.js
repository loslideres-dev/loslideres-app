import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, registrarAuditoria } from '../lib/supabase'
import { crearNotificacion, notificarAdmins } from '../lib/notificar'

// Helper: normaliza filas de la vista paquetes_con_cliente
const conPerfil = (data) => data.map(p => ({
  ...p,
  perfiles: {
    nombre:           p.cliente_nombre,
    codigo_casillero: p.cliente_codigo,
    telefono:         p.cliente_telefono,
  },
}))

// ── Cliente: sus paquetes ─────────────────────────────────────────────────────
export function usePaquetes() {
  return useQuery({
    queryKey: ['paquetes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .order('fecha_recepcion', { ascending: false })
      if (error) throw error
      return data
    },
    staleTime: 30_000,
  })
}

// ── Detalle de un paquete ─────────────────────────────────────────────────────
export function usePaquete(id) {
  return useQuery({
    queryKey: ['paquete', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// ── Bodeguero: paquetes de hoy ────────────────────────────────────────────────
export function usePaquetesHoy(bodegueroId) {
  return useQuery({
    queryKey: ['paquetes-hoy', bodegueroId],
    queryFn: async () => {
      const hoy = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('paquetes_con_cliente')
        .select('*')
        .eq('bodeguero_id', bodegueroId)
        .gte('fecha_recepcion', `${hoy}T00:00:00`)
        .order('fecha_recepcion', { ascending: false })
      if (error) throw error
      return conPerfil(data)
    },
    enabled: !!bodegueroId,
    staleTime: 10_000,
  })
}

// ── Admin: todos los paquetes por estado ──────────────────────────────────────
export function usePaquetesAdmin(estado = null) {
  return useQuery({
    queryKey: ['paquetes-admin', estado],
    queryFn: async () => {
      let q = supabase
        .from('paquetes_con_cliente')
        .select('*')
        .order('fecha_recepcion', { ascending: false })
      if (estado) q = q.eq('estado', estado)
      const { data, error } = await q
      if (error) throw error
      return conPerfil(data)
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

// ── Conductor: entregas asignadas (EN_TRANSITO y EN_REPARTO) ──────────────────
export function useEntregasConductor(conductorId) {
  return useQuery({
    queryKey: ['entregas-conductor', conductorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paquetes_con_cliente')
        .select('*')
        .eq('conductor_id', conductorId)
        .in('estado', ['TARIFADO', 'EN_TRANSITO', 'EN_REPARTO'])
        .order('fecha_recepcion', { ascending: true })
      if (error) throw error
      return conPerfil(data)
    },
    enabled: !!conductorId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  })
}

// ── Admin: stats para dashboard ───────────────────────────────────────────────
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paquetes')
        .select('estado, fecha_entrega')
      if (error) throw error
      const hoy = new Date().toDateString()
      return {
        pendientes_precio: data.filter(p => p.estado === 'RECIBIDO').length,
        en_transito:       data.filter(p => p.estado === 'EN_TRANSITO').length,
        en_reparto:        data.filter(p => p.estado === 'EN_REPARTO').length,
        entregados_hoy:    data.filter(p =>
          p.estado === 'ENTREGADO' && p.fecha_entrega &&
          new Date(p.fecha_entrega).toDateString() === hoy).length,
        total: data.length,
      }
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

// ── Registrar paquete (bodeguero) ─────────────────────────────────────────────
export function useRegistrarPaquete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clienteId, bodegueroId, foto_url, ...resto }) => {
      const codigo = `ENC-${Date.now().toString(36).toUpperCase()}`
      // Código que ve el cliente: el tracking del courier si lo trae, si no el interno
      const codigoCliente = resto.tracking_externo?.trim() || codigo
      const { data, error } = await supabase
        .from('paquetes')
        .insert({
          codigo,
          cliente_id:   clienteId,
          bodeguero_id: bodegueroId,
          foto_url,
          ...resto,
        })
        .select()
        .single()
      if (error) throw error
      await registrarAuditoria({
        evento:    'paquete_registrado',
        entidad:   'paquetes',
        entidadId: data.id,
        valorNuevo: {
          codigo, cliente_id: clienteId, tamanio: resto.tamanio,
          tracking_externo: resto.tracking_externo,
          cobro_destino: resto.cobro_destino ?? false,
          monto_cobro_destino: resto.monto_cobro_destino ?? null,
        },
      })
      // Notificar al cliente y a los admins
      await crearNotificacion({
        usuarioId: clienteId,
        tipo:      'paquete_recibido',
        titulo:    'Tu paquete llegó a la bodega',
        mensaje:   `El paquete ${codigoCliente} fue recibido en Maicao. Pronto tendrá precio asignado.`,
        paqueteId: data.id,
      })
      const avisoCobro = resto.cobro_destino && resto.monto_cobro_destino
        ? ` Llegó con cobro a destino de $${Number(resto.monto_cobro_destino).toLocaleString('es-CO')} COP que el bodeguero pagó.`
        : ''
      await notificarAdmins({
        tipo:    'paquete_recibido',
        titulo:  'Nuevo paquete en bodega',
        mensaje: `Se registró el paquete ${codigo}. Pendiente por tarifar.${avisoCobro}`,
        paqueteId: data.id,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paquetes-hoy'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['paquetes-admin'] })
    },
  })
}

// ── Tarifar paquete (admin) — asigna conductor (o el admin por defecto) ──────
export function useTarifar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id, precio_sugerido, precio_final, fecha_estimada,
      conductor_id, monto_traslado, metodo_pago, metodo_pago_id,
      moneda_cobro, anteriorEstado, direccion_entrega,
    }) => {
      // La dirección se congela aquí: a partir de este momento el paquete
      // lleva su propia dirección y ya no cambia si el cliente edita su
      // perfil estando el envío en camino.
      const cambios = {
        precio_sugerido,
        precio_final,
        fecha_estimada,
        conductor_id,
        monto_traslado: monto_traslado ?? 0,
        metodo_pago,
        estado: 'TARIFADO',
      }
      if (direccion_entrega) cambios.direccion_entrega = direccion_entrega
      if (metodo_pago_id)    cambios.metodo_pago_id    = metodo_pago_id
      if (moneda_cobro)      cambios.moneda_cobro      = moneda_cobro

      const { data, error } = await supabase
        .from('paquetes')
        .update(cambios)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await registrarAuditoria({
        evento:    'paquete_tarifado',
        entidad:   'paquetes',
        entidadId: id,
        valorAnterior: { estado: anteriorEstado },
        valorNuevo: {
          precio_sugerido,
          precio_final,
          diferencia: precio_final - precio_sugerido,
          conductor_id,
          monto_traslado,
          metodo_pago,
        },
      })
      if (data?.cliente_id) {
        await crearNotificacion({
          usuarioId: data.cliente_id,
          tipo:      'cambio_estado',
          titulo:    'Tu paquete tiene precio',
          mensaje:   `El paquete ${data.tracking_externo || data.codigo} fue tarifado en $${precio_final} USD.`,
          paqueteId: id,
        })
      }
      // Notificar al conductor asignado
      if (conductor_id) {
        await crearNotificacion({
          usuarioId: conductor_id,
          tipo:      'paquete_asignado',
          titulo:    'Nuevo paquete asignado',
          mensaje:   `Se te asignó el paquete ${data.tracking_externo || data.codigo} para entrega.`,
          paqueteId: id,
        })
      }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paquetes-admin'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['entregas-conductor'] })
    },
  })
}

// ── Poner en tránsito (CONDUCTOR) — TARIFADO → EN_TRANSITO ─────────────────────
// El conductor lo marca cuando arranca el viaje Maicao → Maracaibo.
export function usePonerEnTransito() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }) => {
      const { data, error } = await supabase
        .from('paquetes')
        .update({ estado: 'EN_TRANSITO' })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await registrarAuditoria({
        evento:    'paquete_en_transito',
        entidad:   'paquetes',
        entidadId: id,
        valorNuevo: { estado: 'EN_TRANSITO' },
      })
      if (data?.cliente_id) {
        await crearNotificacion({
          usuarioId: data.cliente_id,
          tipo:      'cambio_estado',
          titulo:    'Tu paquete está en camino',
          mensaje:   `El paquete ${data.tracking_externo || data.codigo} va en camino a Maracaibo.`,
          paqueteId: id,
        })
      }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entregas-conductor'] })
      qc.invalidateQueries({ queryKey: ['paquetes-admin'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

// ── Iniciar reparto (conductor) — EN_TRANSITO → EN_REPARTO ────────────────────
export function useIniciarReparto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }) => {
      const { data, error } = await supabase
        .from('paquetes')
        .update({ estado: 'EN_REPARTO' })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await registrarAuditoria({
        evento:    'paquete_en_reparto',
        entidad:   'paquetes',
        entidadId: id,
        valorNuevo: { estado: 'EN_REPARTO' },
      })
      if (data?.cliente_id) {
        await crearNotificacion({
          usuarioId: data.cliente_id,
          tipo:      'cambio_estado',
          titulo:    'Tu paquete está en reparto',
          mensaje:   `El paquete ${data.tracking_externo || data.codigo} está saliendo a tu dirección. ¡Prepárate!`,
          paqueteId: id,
        })
      }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entregas-conductor'] })
      qc.invalidateQueries({ queryKey: ['paquetes-admin'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

// ── Marcar entregado (conductor o admin) — fecha automática ───────────────────
export function useMarcarEntregado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id, nombre_receptor, metodo_pago, monto_cobrado, anteriorEstado,
      foto_entrega_url, moneda_cobro, tasa_aplicada, monto_cobrado_usd,
    }) => {
      const cambios = {
        estado:        'ENTREGADO',
        fecha_entrega: new Date().toISOString(),   // fecha automática
        nombre_receptor,
        metodo_pago,
        monto_cobrado,
      }
      if (foto_entrega_url) cambios.foto_entrega_url = foto_entrega_url

      // El cobro se congela con la tasa del momento. Si la moneda es el
      // dólar la tasa es 1 y el monto en USD es el mismo.
      if (moneda_cobro)            cambios.moneda_cobro      = moneda_cobro
      if (tasa_aplicada != null)   cambios.tasa_aplicada     = tasa_aplicada
      if (monto_cobrado_usd != null) cambios.monto_cobrado_usd = monto_cobrado_usd

      const { data, error } = await supabase
        .from('paquetes')
        .update(cambios)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await registrarAuditoria({
        evento:    'paquete_entregado',
        entidad:   'paquetes',
        entidadId: id,
        valorAnterior: { estado: anteriorEstado },
        valorNuevo: {
          estado: 'ENTREGADO', nombre_receptor, metodo_pago, monto_cobrado,
          con_foto: !!foto_entrega_url,
        },
      })
      if (data?.cliente_id) {
        await crearNotificacion({
          usuarioId: data.cliente_id,
          tipo:      'paquete_entregado',
          titulo:    '¡Paquete entregado!',
          mensaje:   `El paquete ${data.tracking_externo || data.codigo} fue entregado a ${nombre_receptor}. ¡Gracias!`,
          paqueteId: id,
        })
      }
      await notificarAdmins({
        tipo:    'paquete_entregado',
        titulo:  'Paquete entregado',
        mensaje: `El paquete ${data.codigo} fue entregado a ${nombre_receptor}.`,
        paqueteId: id,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entregas-conductor'] })
      qc.invalidateQueries({ queryKey: ['paquetes-admin'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['paquetes'] })
    },
  })
}

// ── Actualizar paquete (bodeguero, solo si está en RECIBIDO) ──────────────────
export function useActualizarPaquete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...campos }) => {
      const { data, error } = await supabase
        .from('paquetes')
        .update(campos)
        .eq('id', id)
        .eq('estado', 'RECIBIDO')   // seguridad extra: solo editable en RECIBIDO
        .select()
        .single()
      if (error) throw error
      await registrarAuditoria({
        evento:    'paquete_editado',
        entidad:   'paquetes',
        entidadId: id,
        valorNuevo: campos,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paquetes-hoy'] })
      qc.invalidateQueries({ queryKey: ['paquetes-admin'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

// ── Eliminar paquete (bodeguero, solo si está en RECIBIDO) ────────────────────
export function useEliminarPaquete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, codigo }) => {
      const { error } = await supabase
        .from('paquetes')
        .delete()
        .eq('id', id)
        .eq('estado', 'RECIBIDO')
      if (error) throw error
      await registrarAuditoria({
        evento:    'paquete_eliminado',
        entidad:   'paquetes',
        entidadId: id,
        valorAnterior: { codigo },
      })
      return true
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paquetes-hoy'] })
      qc.invalidateQueries({ queryKey: ['paquetes-admin'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}


// ── Buscar paquete por código interno (ENC) o tracking externo ────────────────
// Útil para el admin y la futura página de rastreo público.
export function useBuscarPaquete(query) {
  return useQuery({
    queryKey: ['buscar-paquete', query],
    queryFn: async () => {
      if (!query || query.length < 3) return []
      const q = query.trim()
      const { data, error } = await supabase
        .from('paquetes_con_cliente')
        .select('*')
        .or(`codigo.ilike.%${q}%,tracking_externo.ilike.%${q}%`)
        .order('fecha_recepcion', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
    enabled: !!query && query.length >= 3,
    staleTime: 10_000,
  })
}