import { supabase } from './supabase';

// Llama la función RPC pública `rastrear_paquete` (SECURITY DEFINER) que solo
// devuelve campos NO sensibles del paquete. Búsqueda por igualdad exacta:
// el visitante debe conocer su código de courier o su código interno ENC.
export async function rastrearPaquete(codigo) {
  const limpio = (codigo || '').trim();
  if (!limpio) return { paquete: null, error: 'Ingresa un código' };

  if (!supabase) {
    return { paquete: null, error: 'El rastreo no está disponible en este momento.' };
  }

  const { data, error } = await supabase.rpc('rastrear_paquete', {
    codigo_busqueda: limpio,
  });

  if (error) return { paquete: null, error: 'Error al buscar el paquete. Intenta de nuevo.' };
  if (!data || data.length === 0) {
    return { paquete: null, error: 'No encontramos ningún paquete con ese código.' };
  }
  return { paquete: data[0], error: null };
}
