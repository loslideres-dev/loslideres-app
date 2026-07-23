import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useAuditoria({ desde, hasta, evento, entidadId, limite = 50 } = {}) {
  return useQuery({
    queryKey: ['auditoria', desde, hasta, evento, entidadId],
    queryFn: async () => {
      let q = supabase
        .from('auditoria')
        .select('*, perfiles!usuario_id(nombre)')
        .order('fecha_hora', { ascending: false })
        .limit(limite)

      if (desde)     q = q.gte('fecha_hora', desde)
      if (hasta)     q = q.lte('fecha_hora', hasta)
      if (evento)    q = q.eq('evento', evento)
      if (entidadId) q = q.eq('entidad_id', entidadId)

      const { data, error } = await q
      if (error) throw error
      return data
    },
    staleTime: 10_000,
  })
}
