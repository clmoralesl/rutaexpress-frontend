import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PublicoService } from './publico.service';
import { inicializarConfigEjecucion, obtenerApiUrl, reiniciarConfigEjecucionParaPruebas } from '../config/config-ejecucion';

describe('PublicoService', () => {
  let service: PublicoService;
  let httpMock: HttpTestingController;
  const base = `${obtenerApiUrl()}/api/publico`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PublicoService]
    });
    service = TestBed.inject(PublicoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('cachea sucursales y no cachea el error', () => {
    service.obtenerSucursales().subscribe({ error: () => {} });
    httpMock.expectOne(`${base}/sucursales`).flush('x', { status: 503, statusText: 'x' });

    let respuesta: any;
    service.obtenerSucursales().subscribe(r => respuesta = r);
    service.obtenerSucursales().subscribe();
    httpMock.expectOne(`${base}/sucursales`).flush([]);
    expect(respuesta).toEqual([]);
  });

  it('cachea servicios y no cachea el error', () => {
    service.obtenerServicios().subscribe({ error: () => {} });
    httpMock.expectOne(`${base}/servicios`).flush('x', { status: 500, statusText: 'x' });

    let respuesta: any;
    service.obtenerServicios().subscribe(r => respuesta = r);
    service.obtenerServicios().subscribe();
    httpMock.expectOne(`${base}/servicios`).flush([]);
    expect(respuesta).toEqual([]);
  });

  it('cachea regiones y no cachea el error', () => {
    service.obtenerRegiones().subscribe({ error: () => {} });
    httpMock.expectOne(`${base}/geografia/regiones`).flush('x', { status: 500, statusText: 'x' });

    let respuesta: any;
    service.obtenerRegiones().subscribe(r => respuesta = r);
    service.obtenerRegiones().subscribe();
    httpMock.expectOne(`${base}/geografia/regiones`).flush([]);
    expect(respuesta).toEqual([]);
  });

  it('cotizar envia medidas solo si vienen las tres', () => {
    service.cotizar({
      servicioId: 1,
      sucursalOrigenId: 2,
      idComunaDestino: 13101,
      pesoKg: 3.5,
      largoCm: 10,
      anchoCm: null,
      altoCm: null
    }).subscribe();

    const req = httpMock.expectOne(r => r.url === `${base}/cotizacion`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pesoKg')).toBe('3.5');
    expect(req.request.params.has('largoCm')).toBeFalse();
    req.flush({});
  });

  it('cotizar envia medidas cuando vienen las tres completas', () => {
    service.cotizar({
      servicioId: 1,
      sucursalOrigenId: 2,
      idComunaDestino: 13101,
      pesoKg: 3.5,
      largoCm: 10,
      anchoCm: 20,
      altoCm: 30
    }).subscribe();

    const req = httpMock.expectOne(r => r.url === `${base}/cotizacion`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pesoKg')).toBe('3.5');
    expect(req.request.params.get('largoCm')).toBe('10');
    expect(req.request.params.get('anchoCm')).toBe('20');
    expect(req.request.params.get('altoCm')).toBe('30');
    req.flush({});
  });
});

describe('PublicoService con el Gateway en tiempo de ejecucion', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    reiniciarConfigEjecucionParaPruebas();
    inicializarConfigEjecucion({ apiUrl: 'https://abc123.execute-api.us-east-1.amazonaws.com' });
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PublicoService]
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    reiniciarConfigEjecucionParaPruebas();
  });

  it('llamaAlGatewayConfiguradoEnEjecucion', () => {
    const servicio = TestBed.inject(PublicoService);
    servicio.obtenerServicios().subscribe();
    httpTesting.expectOne('https://abc123.execute-api.us-east-1.amazonaws.com/api/publico/servicios').flush([]);
  });
});
