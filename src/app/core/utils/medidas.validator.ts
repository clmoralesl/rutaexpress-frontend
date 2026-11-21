import { AbstractControl, ValidationErrors } from '@angular/forms';

export const CAMPOS_MEDIDAS = ['largoCm', 'anchoCm', 'altoCm'] as const;

export interface ValorMedidas {
  largoCm: number | null;
  anchoCm: number | null;
  altoCm: number | null;
}

const informado = (v: unknown): boolean => v !== null && v !== undefined && v !== '';

export function medidasCompletasONinguna(grupo: AbstractControl): ValidationErrors | null {
  const n = CAMPOS_MEDIDAS.filter(c => informado(grupo.get(c)?.value)).length;
  return n === 0 || n === 3 ? null : { medidasIncompletas: true };
}

export function medidasParaEnviar(m: ValorMedidas): Partial<Record<typeof CAMPOS_MEDIDAS[number], number>> {
  return CAMPOS_MEDIDAS.every(c => informado(m[c]))
    ? { largoCm: Number(m.largoCm), anchoCm: Number(m.anchoCm), altoCm: Number(m.altoCm) }
    : {};
}
