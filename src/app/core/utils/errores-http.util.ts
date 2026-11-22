import { HttpErrorResponse } from '@angular/common/http';

export type ContextoError = 'cotizacion' | 'preregistro' | 'aceptacion';
export interface ErrorTraducido { mensaje: string; detalles: string[]; reintentarEnSegundos: number | null; }

export const ESPERA_POR_DEFECTO_SEGUNDOS = 60;
export const ESPERA_MAXIMA_SEGUNDOS = 300;
const LARGO_MAXIMO_MENSAJE_SERVIDOR = 200;
const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Intenta nuevamente en unos minutos.';

const MENSAJES_POR_CODIGO: Record<string, string> = {
  SUCURSAL_INACTIVA: 'La sucursal seleccionada no está recibiendo envíos. Elige otra sucursal.',
  SUCURSAL_NO_ENCONTRADA: 'La sucursal seleccionada ya no existe. Actualiza la página y elige otra.',
  SERVICIO_INACTIVO: 'El servicio seleccionado no está disponible. Elige otro servicio.',
  RECURSO_NO_ENCONTRADO: 'El servicio seleccionado ya no existe. Actualiza la página y elige otro.',
  COMUNA_NO_CUBIERTA: 'El servicio seleccionado no llega a la comuna de destino. Prueba con otro servicio.',
  PESO_EXCEDE_LIMITE: 'El peso supera el máximo permitido por este servicio.',
  DIMENSION_EXCEDE_LIMITE: 'Las medidas superan el máximo permitido por este servicio.',
  ENVIO_SIN_SERVICIO: 'Este envío se registró antes del pre-registro con sucursal y servicio; no admite aceptación.',
  ENVIO_SIN_PRECIO_FINAL: 'El envío debe aceptarse en la sucursal antes de avanzar.',
  ENVIO_BLOQUEADO: 'Otra persona está modificando este envío. Espera unos segundos e intenta nuevamente.',
  CATALOGO_NO_DISPONIBLE: 'El servicio de tarifas no está disponible en este momento. Intenta nuevamente en unos minutos.'
};
const UNIDAD_LIMITE: Record<string, string> = { PESO_EXCEDE_LIMITE: 'kg', DIMENSION_EXCEDE_LIMITE: 'cm' };

export function leerRetryAfter(valor: string | null): number {
  if (valor === null || !/^\d+$/.test(valor.trim())) return ESPERA_POR_DEFECTO_SEGUNDOS;
  return Math.min(ESPERA_MAXIMA_SEGUNDOS, Math.max(1, parseInt(valor.trim(), 10)));
}

function extraerDetalles(errores: unknown): string[] {
  const valores = Array.isArray(errores) ? errores : (errores && typeof errores === 'object' ? Object.values(errores) : []);
  return valores.filter((v): v is string => typeof v === 'string').slice(0, 10);
}

function mensajeServidor(cuerpo: Record<string, unknown>, porDefecto: string): string {
  const m = cuerpo['mensaje'];
  return typeof m === 'string' && m.trim() !== '' && m.length <= LARGO_MAXIMO_MENSAJE_SERVIDOR ? m : porDefecto;
}

function simple(mensaje: string): ErrorTraducido { return { mensaje, detalles: [], reintentarEnSegundos: null }; }

export function traducirErrorHttp(error: unknown, contexto: ContextoError): ErrorTraducido {
  if (!(error instanceof HttpErrorResponse)) return simple(MENSAJE_GENERICO);
  const cuerpo: Record<string, unknown> = error.error && typeof error.error === 'object' ? error.error : {};
  const codigo = typeof cuerpo['codigo'] === 'string' ? cuerpo['codigo'] : (typeof cuerpo['error'] === 'string' ? cuerpo['error'] : null);

  switch (error.status) {
    case 0: return simple('No fue posible conectar con RutaExpress. Revisa tu conexión e intenta nuevamente.');
    case 401: return simple('Tu sesión expiró. Inicia sesión nuevamente.');
    case 403: return simple('Tu perfil no tiene permiso para realizar esta acción.');
    case 429: {
      const segundos = leerRetryAfter(error.headers?.get('Retry-After') ?? null);
      return { mensaje: `Realizaste muchas consultas seguidas. Intenta nuevamente en ${segundos} segundos.`, detalles: [], reintentarEnSegundos: segundos };
    }
    case 503: return simple(MENSAJES_POR_CODIGO['CATALOGO_NO_DISPONIBLE']);
  }
  if (codigo && MENSAJES_POR_CODIGO[codigo]) {
    const limite = cuerpo['limite'];
    const unidad = UNIDAD_LIMITE[codigo];
    return simple(unidad && typeof limite === 'number' ? `${MENSAJES_POR_CODIGO[codigo]} Máximo: ${limite} ${unidad}.` : MENSAJES_POR_CODIGO[codigo]);
  }
  if (error.status === 400) {
    const detalles = extraerDetalles(cuerpo['errores']);
    return detalles.length > 0
      ? { mensaje: 'Revisa los datos ingresados.', detalles, reintentarEnSegundos: null }
      : simple(mensajeServidor(cuerpo, 'Revisa los datos ingresados.'));
  }
  if (error.status === 404) {
    return simple(contexto === 'aceptacion' ? 'El envío no existe o ya no está disponible.' : 'No encontramos la información solicitada. Actualiza la página e intenta nuevamente.');
  }
  if (error.status === 409 || error.status === 422) return simple(mensajeServidor(cuerpo, 'La solicitud no cumple las reglas del servicio.'));
  return simple(MENSAJE_GENERICO);
}
