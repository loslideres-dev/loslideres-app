import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ═══════════════════════════════════════════════════════════════════════════
// MONEDAS
// ═══════════════════════════════════════════════════════════════════════════

export function useMonedas() {
  return useQuery({
    queryKey: ['monedas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monedas')
        .select('*')
        .order('orden')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

export function useActualizarMoneda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ codigo, ...campos }) => {
      const { error } = await supabase
        .from('monedas')
        .update(campos)
        .eq('codigo', codigo)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monedas'] })
      qc.invalidateQueries({ queryKey: ['metodos-pago'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// MÉTODOS DE PAGO
// ═══════════════════════════════════════════════════════════════════════════

// soloActivos = true para los selectores de la operación;
// false para la pantalla de configuración, que necesita ver todos.
export function useMetodosPago(soloActivos = true) {
  return useQuery({
    queryKey: ['metodos-pago', soloActivos],
    queryFn: async () => {
      let q = supabase
        .from('metodos_pago')
        .select('*, monedas:moneda_codigo (codigo, nombre, simbolo, decimales, es_base, activo)')
        .order('orden')
      if (soloActivos) q = q.eq('activo', true)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })
}

export function useGuardarMetodoPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...campos }) => {
      if (id) {
        const { error } = await supabase
          .from('metodos_pago')
          .update(campos)
          .eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('metodos_pago')
          .insert(campos)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metodos-pago'] }),
  })
}

export function useEliminarMetodoPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('metodos_pago')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metodos-pago'] }),
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TASAS DE CAMBIO
// ═══════════════════════════════════════════════════════════════════════════

// Última tasa registrada de cada moneda no base.
export function useTasasVigentes() {
  return useQuery({
    queryKey: ['tasas-vigentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasas_cambio')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error

      // Primera aparición de cada moneda = la más reciente
      const vigentes = {}
      for (const t of data ?? []) {
        if (!vigentes[t.moneda_codigo]) vigentes[t.moneda_codigo] = t
      }
      vigentes.USD = { moneda_codigo: 'USD', valor_por_usd: 1, fecha: null }
      return vigentes
    },
    staleTime: 60_000,
  })
}

// Histórico de una moneda, para ver cómo se ha movido.
export function useHistorialTasas(monedaCodigo, limite = 30) {
  return useQuery({
    queryKey: ['historial-tasas', monedaCodigo, limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasas_cambio')
        .select('*')
        .eq('moneda_codigo', monedaCodigo)
        .order('fecha', { ascending: false })
        .limit(limite)
      if (error) throw error
      return data ?? []
    },
    enabled: !!monedaCodigo,
    staleTime: 60_000,
  })
}

export function useGuardarTasa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ moneda_codigo, valor_por_usd, fecha, fuente }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('tasas_cambio')
        .upsert({
          moneda_codigo,
          valor_por_usd,
          fecha: fecha ?? new Date().toISOString().slice(0, 10),
          fuente: fuente ?? null,
          registrado_por: user?.id ?? null,
        }, { onConflict: 'moneda_codigo,fecha' })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasas-vigentes'] })
      qc.invalidateQueries({ queryKey: ['historial-tasas'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AUXILIARES DE CONVERSIÓN
// ═══════════════════════════════════════════════════════════════════════════

// Formatea un monto según su moneda.
export function formatearMonto(monto, moneda) {
  const n = Number(monto) || 0
  const dec = moneda?.decimales ?? 2
  const sim = moneda?.simbolo ?? '$'
  const locale = moneda?.codigo === 'COP' ? 'es-CO' : 'en-US'
  return `${sim}${n.toLocaleString(locale, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })}`
}

// Convierte un precio en USD a la moneda de cobro.
// Devuelve null si falta la tasa, para que la UI pueda avisar
// en vez de mostrar un número inventado.
export function usdAMoneda(montoUsd, tasa) {
  if (tasa == null) return null
  return Number(montoUsd) * Number(tasa)
}

// Convierte de vuelta a USD. Igual: null si no hay tasa.
export function monedaAUsd(monto, tasa) {
  if (!tasa) return null
  return Number(monto) / Number(tasa)
}
