import {
  ConfigEjecucionError, mostrarErrorConfiguracion, normalizarApiUrl, resolverApiUrl
} from './config-ejecucion';

const GW = 'https://abc123.execute-api.us-east-1.amazonaws.com';

describe('normalizarApiUrl', () => {
  it('quitaBarrasFinales', () => expect(normalizarApiUrl(`${GW}//`)).toBe(GW));
  it('aceptaVacioComoMismoOrigen', () => expect(normalizarApiUrl('')).toBe(''));
  it('aceptaHttpSoloEnLocalhost', () => expect(normalizarApiUrl('http://localhost:8080')).toBe('http://localhost:8080'));
  for (const invalida of [
    'http://abc123.execute-api.us-east-1.amazonaws.com',
    `${GW}/prod`, `${GW}?x=1`, `${GW}#a`, 'https://usuario@abc.example.test',
    'javascript:alert(1)', `${GW} otra`, `${GW}\nalert(1)`
  ]) {
    it(`rechaza ${JSON.stringify(invalida)}`, () =>
      expect(() => normalizarApiUrl(invalida)).toThrowError(ConfigEjecucionError));
  }
  it('rechazaValorQueNoEsTexto', () => {
    expect(() => normalizarApiUrl(undefined)).toThrowError(ConfigEjecucionError);
    expect(() => normalizarApiUrl(42)).toThrowError(ConfigEjecucionError);
  });
});

describe('resolverApiUrl', () => {
  it('fallaSiFaltaConfigEnProduccion', () =>
    expect(() => resolverApiUrl(undefined, true, 'http://localhost:8080')).toThrowError(ConfigEjecucionError));
  it('usaRespaldoSiFaltaConfigFueraDeProduccion', () =>
    expect(resolverApiUrl(undefined, false, 'http://localhost:8080/')).toBe('http://localhost:8080'));
  it('mismoOrigenExplicitoPrevaleceSobreRespaldo', () =>
    expect(resolverApiUrl({ apiUrl: '' }, true, 'http://localhost:8080')).toBe(''));
  it('configSinApiUrlEsError', () =>
    expect(() => resolverApiUrl({}, true, '')).toThrowError(ConfigEjecucionError));
  it('usaElGatewayConfigurado', () =>
    expect(resolverApiUrl({ apiUrl: `${GW}/` }, true, 'http://localhost:8080')).toBe(GW));
});

describe('mostrarErrorConfiguracion', () => {
  it('muestraElMensajeComoTexto', () => {
    const doc = document.implementation.createHTMLDocument('prueba');
    mostrarErrorConfiguracion(doc, new Error('<img src=x onerror=alert(1)>'));
    expect(doc.querySelector('img')).toBeNull();
    expect(doc.querySelector('[role="alert"]')?.textContent).toContain('<img src=x');
  });
});
