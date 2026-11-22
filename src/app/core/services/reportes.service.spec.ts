import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  KpisResumen,
  RendimientoCourier,
  ReportesService,
  TopServicio
} from './reportes.service';
import { environment } from '../../../environments/environment';

describe('ReportesService', () => {
  let service: ReportesService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/bff/reportes`;

  const mockKpis: KpisResumen = {
    leadTimePromedioHoras: 5.26,
    tasaCumplimiento: 100.0,
    totalEnvios: 8,
    totalActivos: 6,
    totalEntregados: 2,
    totalCancelados: 0,
    distribucionPorEstado: {
      CREADO: 5,
      ACEPTADO: 1,
      EN_BODEGA: 0,
      EN_RUTA: 0,
      ENTREGADO: 2,
      CANCELADO: 0
    },
    volumenPorHora: [
      { hora: '14:00', cantidad: 5 },
      { hora: '17:00', cantidad: 3 }
    ]
  };

  const mockTopServicios: TopServicio[] = [
    { servicioNombre: 'Envio Express 24h', cantidadEnvios: 8, porcentajeTotal: 100.0 }
  ];

  const mockRendimiento: RendimientoCourier[] = [
    {
      usuarioEmail: 'courier_santiago@rutaexpress.cl',
      usuarioRol: 'COURIER',
      totalGestionados: 10,
      totalEntregados: 9,
      totalCancelados: 1,
      tasaEfectividad: 90.0
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReportesService
      ]
    });

    service = TestBed.inject(ReportesService);
    httpMock = TestBed.inject(HttpTestingController);

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('access_token');
    }
  });

  afterEach(() => {
    httpMock.verify();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('access_token');
    }
  });

  it('debe crearse correctamente el servicio de reportes', () => {
    expect(service).toBeTruthy();
  });

  it('debe consultar KPIs exitosamente desde la API REST', () => {
    service.obtenerKpis('historico').subscribe(kpis => {
      expect(kpis.totalEnvios).toBe(8);
      expect(kpis.leadTimePromedioHoras).toBe(5.26);
      expect(kpis.distribucionPorEstado['CREADO']).toBe(5);
    });

    const req = httpMock.expectOne(`${baseUrl}/kpis?rango=historico`);
    expect(req.request.method).toBe('GET');
    req.flush(mockKpis);
  });

  it('debe enviar cabecera Authorization Bearer si existe token en sessionStorage', () => {
    sessionStorage.setItem('access_token', 'jwt-test-token-reportes');

    service.obtenerKpis('ultimas24h').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/kpis?rango=ultimas24h`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-test-token-reportes');
    req.flush(mockKpis);
  });

  it('debe retornar KPIs de contingencia si la API falla con error HTTP 500', () => {
    service.obtenerKpis('ultimas24h').subscribe(kpis => {
      expect(kpis).toBeTruthy();
      expect(kpis.totalEnvios).toBeGreaterThan(0);
      expect(kpis.volumenPorHora.length).toBeGreaterThan(0);
      expect(service.origenDatos).toBe('CONTINGENCIA');
    });

    const req = httpMock.expectOne(`${baseUrl}/kpis?rango=ultimas24h`);
    req.flush('Error interno', { status: 500, statusText: 'Internal Server Error' });
  });

  it('debe obtener top servicios exitosamente desde la API REST', () => {
    service.obtenerTopServicios('ultimos7dias').subscribe(servicios => {
      expect(servicios.length).toBe(1);
      expect(servicios[0].servicioNombre).toBe('Envio Express 24h');
      expect(servicios[0].porcentajeTotal).toBe(100.0);
    });

    const req = httpMock.expectOne(`${baseUrl}/top-servicios?rango=ultimos7dias`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTopServicios);
  });

  it('debe retornar top servicios de contingencia si la API falla', () => {
    service.obtenerTopServicios('ultimos7dias').subscribe(servicios => {
      expect(servicios.length).toBeGreaterThan(0);
      expect(servicios[0].servicioNombre).toBeDefined();
    });

    const req = httpMock.expectOne(`${baseUrl}/top-servicios?rango=ultimos7dias`);
    req.flush('Fallo de red', { status: 503, statusText: 'Service Unavailable' });
  });

  it('debe obtener rendimiento de couriers exitosamente', () => {
    service.obtenerRendimientoCouriers().subscribe(couriers => {
      expect(couriers.length).toBe(1);
      expect(couriers[0].usuarioEmail).toBe('courier_santiago@rutaexpress.cl');
    });

    const req = httpMock.expectOne(`${baseUrl}/rendimiento-couriers`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRendimiento);
  });

  it('debe retornar rendimiento de couriers de contingencia ante error', () => {
    service.obtenerRendimientoCouriers().subscribe(couriers => {
      expect(couriers.length).toBeGreaterThan(0);
      expect(couriers[0].usuarioRol).toBeDefined();
    });

    const req = httpMock.expectOne(`${baseUrl}/rendimiento-couriers`);
    req.flush('Error 404', { status: 404, statusText: 'Not Found' });
  });

  it('debe retornar datasets de contingencia validos para todos los rangos', () => {
    const r24 = service.obtenerKpisContingencia('ultimas24h');
    const r7d = service.obtenerKpisContingencia('ultimos7dias');
    const rMes = service.obtenerKpisContingencia('ultimomes');

    expect(r24.volumenPorHora.length).toBeGreaterThan(0);
    expect(r7d.volumenPorHora.length).toBeGreaterThan(0);
    expect(rMes.volumenPorHora.length).toBeGreaterThan(0);
  });
});
