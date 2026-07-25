import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Leer un valor de configuración
export function useConfig(clave) {
  return useQuery({
    queryKey: ['config', clave],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_negocio')
        .select('valor')
        .eq('clave', clave)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data?.valor ?? null
    },
    staleTime: 60_000,
  })
}

// Guardar/actualizar un valor de configuración (admin)
export function useGuardarConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clave, valor }) => {
      const { error } = await supabase
        .from('config_negocio')
        .upsert(
          { clave, valor: String(valor), updated_at: new Date().toISOString() },
          { onConflict: 'clave' },
        )
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['config', vars.clave] })
      qc.invalidateQueries({ queryKey: ['reporte-bodeguero'] })
    },
  })
}