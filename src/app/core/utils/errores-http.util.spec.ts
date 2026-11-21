import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { traducirErrorHttp, leerRetryAfter, ESPERA_POR_DEFECTO_SEGUNDOS } from './errores-http.util';

const err = (status: number, error: unknown, headers?: Record<string, string>) =>
  new HttpErrorResponse({ status, error, headers: new HttpHeaders(headers ?? {}) });

describe('traducirErrorHttp', () => {
  it('400 del BFF con errores como arreglo', () => {
    const r = traducirErrorHttp(err(400, { mensaje: 'Parametros de cotizacion invalidos', errores: ['pesoKg debe ser mayor que 0'] }), 'cotizacion');
    expect(r.mensaje).toBe('Revisa los datos ingresados.');
    expect(r.detalles).toEqual(['pesoKg debe ser mayor que 0']);
  });
  it('400 de envios con errores como mapa', () => {
    const r = traducirErrorHttp(err(400, { mensaje: 'Error de validación en la solicitud', errores: { pesoKg: 'El peso no puede superar 500 kg' } }), 'preregistro');
    expect(r.detalles).toEqual(['El peso no puede superar 500 kg']);
  });
  it('400 sin errores usa el mensaje del servidor', () => {
    expect(traducirErrorHttp(err(400, { mensaje: 'Transicion invalida de ACEPTADO a ACEPTADO' }), 'aceptacion').mensaje)
      .toBe('Transicion invalida de ACEPTADO a ACEPTADO');
  });
  it('404 del catalogo con campo error', () => {
    expect(traducirErrorHttp(err(404, { error: 'SUCURSAL_NO_ENCONTRADA', mensaje: 'x' }), 'cotizacion').mensaje)
      .toContain('La sucursal seleccionada ya no existe');
  });
  it('422 PESO_EXCEDE_LIMITE incluye el limite', () => {
    expect(traducirErrorHttp(err(422, { codigo: 'PESO_EXCEDE_LIMITE', mensaje: 'x', limite: 30 }), 'cotizacion').mensaje)
      .toBe('El peso supera el máximo permitido por este servicio. Máximo: 30 kg.');
  });
  it('422 con codigo desconocido usa el mensaje del servidor si es corto', () => {
    expect(traducirErrorHttp(err(422, { codigo: 'OTRO', mensaje: 'Regla nueva' }), 'cotizacion').mensaje).toBe('Regla nueva');
    expect(traducirErrorHttp(err(422, { codigo: 'OTRO', mensaje: 'a'.repeat(201) }), 'cotizacion').mensaje)
      .toBe('La solicitud no cumple las reglas del servicio.');
  });
  it('429 toma Retry-After', () => {
    const r = traducirErrorHttp(err(429, { codigo: 'LIMITE_TASA_EXCEDIDO' }, { 'Retry-After': '7' }), 'cotizacion');
    expect(r.reintentarEnSegundos).toBe(7);
    expect(r.mensaje).toContain('7 segundos');
  });
  it('429 sin Retry-After legible espera el valor por omision', () => {
    expect(traducirErrorHttp(err(429, null), 'cotizacion').reintentarEnSegundos).toBe(ESPERA_POR_DEFECTO_SEGUNDOS);
  });
  it('409 ENVIO_BLOQUEADO y 409 sin codigo', () => {
    expect(traducirErrorHttp(err(409, { codigo: 'ENVIO_BLOQUEADO', mensaje: 'x' }), 'aceptacion').mensaje).toContain('Otra persona');
    expect(traducirErrorHttp(err(409, { mensaje: 'Capacidad agotada para el servicio' }), 'aceptacion').mensaje)
      .toBe('Capacidad agotada para el servicio');
  });
  it('503 y status 0', () => {
    expect(traducirErrorHttp(err(503, { codigo: 'CATALOGO_NO_DISPONIBLE' }), 'preregistro').mensaje).toContain('tarifas no está disponible');
    expect(traducirErrorHttp(err(0, null), 'cotizacion').mensaje).toContain('No fue posible conectar');
  });
});

describe('leerRetryAfter', () => {
  it('acota a 1..300 y rechaza fechas o texto', () => {
    expect(leerRetryAfter('0')).toBe(1);
    expect(leerRetryAfter('9999')).toBe(300);
    expect(leerRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT')).toBe(ESPERA_POR_DEFECTO_SEGUNDOS);
    expect(leerRetryAfter(null)).toBe(ESPERA_POR_DEFECTO_SEGUNDOS);
  });
});
