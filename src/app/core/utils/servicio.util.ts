import { ServicioPublico } from '../services/publico.service';
import { formatearClp } from './formato.util';

/**
 * Genera la descripción amigable de un servicio logístico para selectores públicos.
 * Incluye nombre, tarifa base, precio por kg y detalles como plazo y límites físicos si están disponibles.
 */
export function describirServicio(s: ServicioPublico): string {
  const base = `${s.nombre} - Tarifa base ${formatearClp(s.tarifaBase)} + ${formatearClp(s.precioPorKg)}/kg`;
  const detalles: string[] = [];

  if (s.plazoMinDias && s.plazoMaxDias) {
    detalles.push(`Plazo: ${s.plazoMinDias}-${s.plazoMaxDias} días hábiles`);
  }
  if (s.pesoMaximoKg) {
    detalles.push(`hasta ${s.pesoMaximoKg} kg`);
  }
  if (s.ladoMaximoCm) {
    detalles.push(`lado máximo ${s.ladoMaximoCm} cm`);
  }

  if (detalles.length > 0) {
    return `${base} (${detalles.join(', ')})`;
  }

  return `${base} (Plazo y límites se informan al cotizar)`;
}
