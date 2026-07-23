import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, registrarAuditoria } from '../lib/supabase'

export function useTarifas() {
  return useQuery({
    queryKey: ['tarifas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarifas')
        .select('*')
        .eq('activa', true)
        .order('precio_usd')
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })
}

export function useActualizarTarifa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, precio_usd, descripcion, tamanioLabel }) => {
      // Obtener valor anterior
      const { data: anterior } = await supabase
        .from('tarifas').select('precio_usd').eq('id', id).single()

      const { data, error } = await supabase
        .from('tarifas')
        .update({ precio_usd, descripcion, fecha_actualizacion: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      await registrarAuditoria({
        evento:    'tarifa_actualizada',
        entidad:   'tarifas',
        entidadId: id,
        valorAnterior: { precio_usd: anterior?.precio_usd, tamanio: tamanioLabel },
        valorNuevo:    { precio_usd, tamanio: tamanioLabel },
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarifas'] }),
  })
}

// Precio sugerido según tamaño
export function getPrecioSugerido(tarifas, tamanio) {
  return tarifas?.find(t => t.tamanio === tamanio)?.precio_usd ?? null
}
