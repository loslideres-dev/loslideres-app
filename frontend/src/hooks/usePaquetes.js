import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, registrarAuditoria } from '../lib/supabase'

// ── Cliente: sus paquetes ──────────────────────────────────────────────────
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

// ── Detalle de un paquete ─────────────────────────────────────────────────
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

// ── Bodeguero: paquetes de hoy ────────────────────────────────────────────
export function usePaquetesHoy(bodegueroId) {
  return useQuery({
    queryKey: ['paquetes-hoy', bodegueroId],
    queryFn: async () => {
      const hoy = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('paquetes')
        .select('*, perfiles!cliente_id(nombre, codigo_casillero)')
        .eq('bodeguero_id', bodegueroId)
        .gte('fecha_recepcion', `${hoy}T00:00:00`)
        .order('fecha_recepcion', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!bodegueroId,
    staleTime: 10_000,
  })
}

// ── Admin: todos los paquetes por estado ──────────────────────────────────
export function usePaquetesAdmin(estado = null) {
  return useQuery({
    queryKey: ['paquetes-admin', estado],
    queryFn: async () => {
      let q = supabase
        .from('paquetes')
        .select('*, perfiles!cliente_id(nombre, codigo_casillero, telefono)')
        .order('fecha_recepcion', { ascending: false })
      if (estado) q = q.eq('estado', estado)
      const { data, error } = await q
      if (error) throw error
      return data
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

// ── Admin: stats para dashboard ───────────────────────────────────────────
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paquetes')
        .select('estado, fecha_recepcion')
      if (error) throw error
      const hoy = new Date().toDateString()
      return {
        pendientes_precio: data.filter(p => p.estado === 'RECIBIDO').length,
        en_transito:       data.filter(p => p.estado === 'EN_TRANSITO').length,
        en_reparto:        data.filter(p => p.estado === 'EN_REPARTO').length,
        entregados_hoy:    data.filter(p =>
          p.estado === 'ENTREGADO' &&
          new Date(p.fecha_recepcion).toDateString() === hoy).length,
        total:             data.length,
      }
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

// ── Registrar paquete (bodeguero) ─────────────────────────────────────────
export function useRegistrarPaquete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clienteId, bodegueroId, foto_url, ...resto }) => {
      const codigo = `ENC-${Date.now().toString(36).toUpperCase()}`
      const { data, error } = await supabase
        .from('paquetes')
        .insert({ codigo, cliente_id: clienteId, bodeguero_id: bodegueroId, foto_url, ...resto })
        .select()
        .single()
      if (error) throw error
      await registrarAuditoria({
        evento:    'paquete_registrado',
        entidad:   'paquetes',
        entidadId: data.id,
        valorNuevo: { codigo, cliente_id: clienteId, tamanio: resto.tamanio },
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paquetes-hoy'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

// ── Tarifar paquete (admin) ───────────────────────────────────────────────
export function useTarifar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, precio_sugerido, precio_final, fecha_estimada, anteriorEstado }) => {
      const { data, error } = await supabase
        .from('paquetes')
        .update({ precio_sugerido, precio_final, fecha_estimada, estado: 'TARIFADO' })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await registrarAuditoria({
        evento:    'paquete_tarifado',
        entidad:   'paquetes',
        entidadId: id,
        valorAnterior: { estado: anteriorEstado },
        valorNuevo:    { precio_sugerido, precio_final, diferencia: precio_final - precio_sugerido },
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paquetes-admin'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

// ── Despachar paquete (admin) ─────────────────────────────────────────────
export function useDespachar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, conductor_id, monto_traslado }) => {
      const { data, error } = await supabase
        .from('paquetes')
        .update({ estado: 'EN_TRANSITO', conductor_id, monto_traslado })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await registrarAuditoria({
        evento:    'paquete_despachado',
        entidad:   'paquetes',
        entidadId: id,
        valorNuevo: { estado: 'EN_TRANSITO', monto_traslado },
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paquetes-admin'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}
