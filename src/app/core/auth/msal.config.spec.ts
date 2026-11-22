import { environment } from '../../../environments/environment';
import { msalInterceptorConfigFactory } from './msal.config';

describe('msalInterceptorConfigFactory', () => {
  const mapa = () => msalInterceptorConfigFactory().protectedResourceMap;

  it('excluyePublicoDelToken', () => {
    expect(mapa().has(`${environment.apiUrl}/api/publico/*`)).toBeTrue();
    expect(mapa().get(`${environment.apiUrl}/api/publico/*`)).toBeNull();
    expect([...mapa().keys()][0]).toBe(`${environment.apiUrl}/api/publico/*`);
  });

  it('mantieneTokenParaApi', () => {
    expect(mapa().get(`${environment.apiUrl}/api/*`)).toEqual(environment.azure.scopes);
  });
});
