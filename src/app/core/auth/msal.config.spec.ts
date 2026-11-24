import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MSAL_INTERCEPTOR_CONFIG, MsalBroadcastService, MsalInterceptor, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { of } from 'rxjs';
import { inicializarConfigEjecucion, reiniciarConfigEjecucionParaPruebas } from '../config/config-ejecucion';
import { msalInterceptorConfigFactory } from './msal.config';

const GW = 'https://abc123.execute-api.us-east-1.amazonaws.com';

describe('msalInterceptorConfigFactory con el Gateway en tiempo de ejecucion', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;

  beforeEach(() => {
    inicializarConfigEjecucion({ apiUrl: `${GW}/` });
    const registro = { verbose() {}, info() {}, infoPii() {}, warning() {}, error() {} };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
        { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: msalInterceptorConfigFactory },
        { provide: MsalService, useValue: {
            getLogger: () => registro,
            instance: { getActiveAccount: () => ({ homeAccountId: 'cuenta-prueba' }), getAllAccounts: () => [] },
            acquireTokenSilent: () => of({ accessToken: 'token-prueba' })
        } },
        { provide: MsalBroadcastService, useValue: { inProgress$: of(InteractionStatus.None) } }
      ]
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controlador.verify();
    reiniciarConfigEjecucionParaPruebas();
  });

  it('adjuntaTokenAEnviosEnElGateway', () => {
    http.get(`${GW}/api/bff/envios`).subscribe();
    expect(controlador.expectOne(`${GW}/api/bff/envios`).request.headers.get('Authorization')).toBe('Bearer token-prueba');
  });

  it('noAdjuntaTokenAPublicoEnElGateway', () => {
    http.get(`${GW}/api/publico/seguimiento/RE-1`).subscribe();
    expect(controlador.expectOne(`${GW}/api/publico/seguimiento/RE-1`).request.headers.has('Authorization')).toBeFalse();
  });

  it('noAdjuntaTokenAUnOrigenAjeno', () => {
    http.get('https://ajeno.example.test/api/bff/envios').subscribe();
    expect(controlador.expectOne('https://ajeno.example.test/api/bff/envios').request.headers.has('Authorization')).toBeFalse();
  });

  it('clavesUsanElOrigenSinDobleBarra', () => {
    const claves = [...msalInterceptorConfigFactory().protectedResourceMap.keys()];
    expect(claves.every(c => c.startsWith(`${GW}/api/`))).toBeTrue();
    expect(claves[0]).toBe(`${GW}/api/publico/*`);
  });
});
