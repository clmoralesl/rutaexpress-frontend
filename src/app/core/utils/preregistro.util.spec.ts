import { construirSolicitudPreregistro, ValorPreregistro } from './preregistro.util';

const base: ValorPreregistro = {
  rutRemitente: ' 11111111-1 ',
  rutDestinatario: '22222222-2',
  sucursalOrigenId: 2,
  servicioId: 1,
  pesoKg: 3.5,
  medidas: { largoCm: 30, anchoCm: 20, altoCm: 10 },
  remitenteEmail: ' cliente@correo.cl ',
  destino: { idComuna: 13101, calle: 'Alameda', numero: '100', complemento: '' }
};

describe('construirSolicitudPreregistro', () => {
  it('no incluye origen ni direccionOrigen y lleva sucursal y servicio', () => {
    const s = construirSolicitudPreregistro(base, false) as unknown as Record<string, unknown>;
    expect('origen' in s).toBeFalse();
    expect('direccionOrigen' in s).toBeFalse();
    expect(s['sucursalOrigenId']).toBe(2);
    expect(s['servicioId']).toBe(1);
    expect(s['rutRemitente']).toBe('11111111-1');
  });

  it('CLIENTE no envia remitenteEmail', () => {
    expect('remitenteEmail' in construirSolicitudPreregistro(base, false)).toBeFalse();
  });

  it('personal envia remitenteEmail recortado', () => {
    expect(construirSolicitudPreregistro(base, true).remitenteEmail).toBe('cliente@correo.cl');
  });

  it('medidas incompletas no se envian', () => {
    const s = construirSolicitudPreregistro({ ...base, medidas: { largoCm: 30, anchoCm: null, altoCm: null } }, false);
    expect('largoCm' in s).toBeFalse();
  });
});
