'use server'

import { createClient } from '@supabase/supabase-js'

export type ValidateDiscountResult =
  | { valid: true;  porcentaje: number; descripcion: string | null }
  | { valid: false; message: string }

/**
 * Valida un código de descuento en Supabase.
 * Usa service_role para garantizar atomicidad y evitar exponer datos al cliente.
 *
 * @param codigo      Código ingresado por el usuario (se normaliza a uppercase)
 * @param totalDop    Total de productos en DOP (sin envío) para verificar monto mínimo
 */
export async function validateDiscount(
  codigo: string,
  totalDop: number,
): Promise<ValidateDiscountResult> {
  const code = codigo.trim().toUpperCase()

  if (code.length < 4) {
    return { valid: false, message: 'Código demasiado corto.' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('codigos_descuento')
    .select('id, porcentaje, descripcion, monto_minimo, activo, usado, fecha_fin')
    .eq('codigo', code)
    .maybeSingle()

  if (error) {
    console.error('[validateDiscount] Supabase error:', error.message)
    return { valid: false, message: 'Error al validar el código. Intenta de nuevo.' }
  }

  if (!data) {
    return { valid: false, message: 'Código no encontrado.' }
  }

  if (!data.activo) {
    return { valid: false, message: 'Este código está inactivo.' }
  }

  if (data.usado) {
    return { valid: false, message: 'Este código ya fue utilizado.' }
  }

  if (data.fecha_fin && data.fecha_fin < today) {
    return { valid: false, message: 'Este código ha vencido.' }
  }

  const montoMinimo = Number(data.monto_minimo ?? 0)
  if (montoMinimo > 0 && totalDop < montoMinimo) {
    return {
      valid: false,
      message: `Este código requiere una compra mínima de RD$ ${montoMinimo.toLocaleString('es-DO')}.`,
    }
  }

  return {
    valid: true,
    porcentaje:  Number(data.porcentaje),
    descripcion: data.descripcion as string | null,
  }
}
