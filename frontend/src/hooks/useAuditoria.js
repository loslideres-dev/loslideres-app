import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useAuditoria({ desde, hasta, evento, entidadId, limite = 100 } = {}) {
  return useQuery({
    queryKey: ['auditoria', desde, hasta, evento, entidadId],
    queryFn: async () => {
      // 1. Traer los registros de auditoría (sin join directo)
      let q = supabase
        .from('auditoria')
        .select('*')
        .order('fecha_hora', { ascending: false })
        .limit(limite)

      if (desde)     q = q.gte('fecha_hora', desde)
      if (hasta)     q = q.lte('fecha_hora', hasta)
      if (evento)    q = q.eq('evento', evento)
      if (entidadId) q = q.eq('entidad_id', entidadId)

      const { data: logs, error } = await q
      if (error) throw error
      if (!logs || logs.length === 0) return []

      // 2. Traer los nombres de los usuarios involucrados en un solo query
      const usuarioIds = [...new Set(logs.map(l => l.usuario_id).filter(Boolean))]
      let nombresPorId = {}
      if (usuarioIds.length > 0) {
        const { data: perfiles } = await supabase
          .from('perfiles')
          .select('id, nombre')
          .in('id', usuarioIds)
        nombresPorId = Object.fromEntries(
          (perfiles ?? []).map(p => [p.id, p.nombre])
        )
      }

      // 3. Combinar
      return logs.map(l => ({
        ...l,
        perfiles: { nombre: nombresPorId[l.usuario_id] ?? null },
      }))
    },
    staleTime: 10_000,
  })
}