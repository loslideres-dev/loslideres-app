import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

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