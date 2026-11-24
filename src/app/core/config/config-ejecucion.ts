import { environment } from '../../../environments/environment';

export interface FuenteConfigEjecucion { apiUrl?: unknown; }

declare global {
  interface Window { __RUTAEXPRESS_CONFIG__?: FuenteConfigEjecucion; }
}

export class ConfigEjecucionError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ConfigEjecucionError';
  }
}

const PATRON_ORIGEN = /^(https:\/\/[A-Za-z0-9.-]+(:\d{1,5})?|http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?)$/;

export function normalizarApiUrl(valor: unknown): string {
  if (typeof valor !== 'string') {
    throw new ConfigEjecucionError('La configuracion no define apiUrl.');
  }
  const sinBarra = valor.trim().replace(/\/+$/, '');
  if (sinBarra === '') return '';
  if (!PATRON_ORIGEN.test(sinBarra)) {
    throw new ConfigEjecucionError('apiUrl invalida: se esperaba https://<host> sin ruta.');
  }
  return sinBarra;
}

export function resolverApiUrl(
  fuente: FuenteConfigEjecucion | undefined | null,
  obligatoria: boolean,
  respaldo: string
): string {
  if (fuente === undefined || fuente === null) {
    if (obligatoria) {
      throw new ConfigEjecucionError('No se cargo /config.js; el frontend no sabe a que API llamar.');
    }
    return normalizarApiUrl(respaldo);
  }
  return normalizarApiUrl(fuente.apiUrl);
}

let apiUrlResuelta: string | undefined;

export function inicializarConfigEjecucion(
  fuente: FuenteConfigEjecucion | undefined =
    typeof window !== 'undefined' ? window.__RUTAEXPRESS_CONFIG__ : undefined
): string {
  apiUrlResuelta = resolverApiUrl(fuente, environment.configEjecucionObligatoria, environment.apiUrl);
  return apiUrlResuelta;
}

export function obtenerApiUrl(): string {
  return apiUrlResuelta ?? inicializarConfigEjecucion();
}

export function reiniciarConfigEjecucionParaPruebas(): void {
  apiUrlResuelta = undefined;
}

export function mostrarErrorConfiguracion(doc: Document, error: unknown): void {
  const detalle = error instanceof Error ? error.message : String(error);
  const aviso = doc.createElement('main');
  aviso.setAttribute('role', 'alert');
  aviso.textContent = `RutaExpress no pudo cargar su configuracion. ${detalle}`;
  doc.body.replaceChildren(aviso);
}
