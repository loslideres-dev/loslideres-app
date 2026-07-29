import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ── Pendientes por liquidar (admin) ───────────────────────────────────────────
// Devuelve una fila por persona con lo que se le debe ahora mismo.
// tipo: 'conductor' | 'bodeguero' | null (ambos)
export function usePendientesLiquidacion(tipo = null) {
  return useQuery({
    queryKey: ['pendientes-liquidacion', tipo],
    queryFn: async () => {
      let q = supabase.from('pendientes_liquidacion').select('*')
      if (tipo) q = q.eq('tipo', tipo)
      const { data, error } = await q.order('nombre')
      if (error) throw error
      return data ?? []
    },
    staleTime: 15_000,
  })
}

// ── Historial de liquidaciones ────────────────────────────────────────────────
// Sin usuarioId → todas (admin). Con usuarioId → las de esa persona.
// RLS se encarga de que cada quien solo vea las suyas.
export function useLiquidaciones({ tipo = null, usuarioId = null } = {}) {
  return useQuery({
    queryKey: ['liquidaciones', tipo, usuarioId],
    queryFn: async () => {
      let q = supabase
        .from('liquidaciones')
        .select('*, perfiles:usuario_id (nombre, telefono)')
        .order('fecha_cierre', { ascending: false })

      if (tipo)      q = q.eq('tipo', tipo)
      if (usuarioId) q = q.eq('usuario_id', usuarioId)

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    staleTime: 30_000,
  })
}

// ── Detalle de los paquetes incluidos en una liquidación ──────────────────────
export function usePaquetesDeLiquidacion(liquidacionId, tipo) {
  return useQuery({
    queryKey: ['paquetes-liquidacion', liquidacionId, tipo],
    queryFn: async () => {
      const campo = tipo === 'conductor'
        ? 'liquidacion_conductor_id'
        : 'liquidacion_bodeguero_id'

      const { data, error } = await supabase
        .from('paquetes')
        .select('id, codigo, tracking_externo, tamanio, monto_traslado, fecha_entrega, fecha_recepcion')
        .eq(campo, liquidacionId)
        .order(tipo === 'conductor' ? 'fecha_entrega' : 'fecha_recepcion',
               { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!liquidacionId,
    staleTime: 60_000,
  })
}

// ── Paquetes pendientes de una persona (previsualización antes de liquidar) ───
export function usePaquetesPendientes(usuarioId, tipo) {
  return useQuery({
    queryKey: ['paquetes-pendientes', usuarioId, tipo],
    queryFn: async () => {
      let q = supabase
        .from('paquetes')
        .select('id, codigo, tracking_externo, tamanio, monto_traslado, fecha_entrega, fecha_recepcion')

      if (tipo === 'conductor') {
        q = q.eq('conductor_id', usuarioId)
             .eq('estado', 'ENTREGADO')
             .is('liquidacion_conductor_id', null)
             .order('fecha_entrega', { ascending: false })
      } else {
        q = q.eq('bodeguero_id', usuarioId)
             .is('liquidacion_bodeguero_id', null)
             .order('fecha_recepcion', { ascending: false })
      }

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    enabled: !!usuarioId && !!tipo,
    staleTime: 15_000,
  })
}

// ── Ejecutar una liquidación ──────────────────────────────────────────────────
// Llama a la función RPC correspondiente. Todo el cálculo y el marcado de
// paquetes ocurre en la base de datos dentro de una transacción.
export function useLiquidar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ usuarioId, tipo, notas }) => {
      const fn = tipo === 'conductor' ? 'liquidar_conductor' : 'liquidar_bodeguero'
      const params = tipo === 'conductor'
        ? { p_conductor_id: usuarioId, p_notas: notas || null }
        : { p_bodeguero_id: usuarioId, p_notas: notas || null }

      const { data, error } = await supabase.rpc(fn, params)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pendientes-liquidacion'] })
      qc.invalidateQueries({ queryKey: ['liquidaciones'] })
      qc.invalidateQueries({ queryKey: ['paquetes-pendientes'] })
      qc.invalidateQueries({ queryKey: ['reporte-conductor'] })
      qc.invalidateQueries({ queryKey: ['reporte-bodeguero'] })
      qc.invalidateQueries({ queryKey: ['reporte-admin'] })
    },
  })
}

// ── Resumen global de deuda (para el estado de cuenta del admin) ──────────────
export function useDeudaTotal() {
  return useQuery({
    queryKey: ['deuda-total'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pendientes_liquidacion')
        .select('tipo, monto_usd, monto_cop, cantidad_paquetes')
      if (error) throw error

      const filas = data ?? []
      return {
        conductoresUSD: filas
          .filter(f => f.tipo === 'conductor')
          .reduce((s, f) => s + (Number(f.monto_usd) || 0), 0),
        bodeguerosCOP: filas
          .filter(f => f.tipo === 'bodeguero')
          .reduce((s, f) => s + (Number(f.monto_cop) || 0), 0),
        conductoresPendientes: filas.filter(f => f.tipo === 'conductor').length,
        bodeguerosPendientes:  filas.filter(f => f.tipo === 'bodeguero').length,
      }
    },
    staleTime: 30_000,
  })
}
