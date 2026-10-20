import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  AuditoriaService,
  EventoAuditoria,
  FiltrosConsultaAuditoria,
  PaginaAuditoria,
  TimelineEnvio
} from './auditoria.service';
import { environment } from '../../../environments/environment';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/bff/auditoria`;

  const mockEvento: EventoAuditoria = {
    id: 101,
    eventoId: 'test-uuid-001',
    envioId: 4,
    codigoSeguimiento: 'RE-LIVE-001',
    estadoAnterior: 'EN_RUTA',
    estadoNuevo: 'ENTREGADO',
    usuarioEmail: 'courier_santiago@rutaexpress.cl',
    usuarioRol: 'COURIER',
    fechaEvento: '2026-10-18T21:52:18',
    fechaRegistro: '2026-10-20T02:37:31',
    detalles: {
      pesoKg: 3.5,
      firmaReceptor: 'Constanza Morales'
    }
  };

  const mockPagina: PaginaAuditoria = {
    content: [mockEvento],
    totalElements: 1,
    totalPages: 1,
    size: 20,
    number: 0
  };

  const mockTimeline: TimelineEnvio = {
    envioId: 4,
    codigoSeguimiento: 'RE-LIVE-001',
    totalEventos: 1,
    timeline: [mockEvento]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuditoriaService
      ]
    });

    service = TestBed.inject(AuditoriaService);
    httpMock = TestBed.inject(HttpTestingController);

    // Limpieza de sessionStorage para evitar efectos secundarios
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

  it('debe crearse correctamente el servicio de auditoria', () => {
    expect(service).toBeTruthy();
  });

  it('debe retornar lista de contingencia con los eventos por defecto', () => {
    const contingencia = service.obtenerEventosContingencia();
    expect(contingencia.length).toBeGreaterThan(0);
    expect(contingencia[0].codigoSeguimiento).toBeDefined();
    expect(contingencia[0].eventoId).toBeDefined();
  });

  it('debe construir timeline de contingencia ordenado cronologicamente para un envio existente', () => {
    const timeline = service.obtenerTimelineContingencia(4);
    expect(timeline.envioId).toBe(4);
    expect(timeline.codigoSeguimiento).toBe('RE-LIVE-001');
    expect(timeline.timeline.length).toBeGreaterThan(0);

    // Verificar orden cronologico ascendente
    for (let i = 0; i < timeline.timeline.length - 1; i++) {
      const fechaActual = new Date(timeline.timeline[i].fechaEvento).getTime();
      const fechaSiguiente = new Date(timeline.timeline[i + 1].fechaEvento).getTime();
      expect(fechaActual).toBeLessThanOrEqual(fechaSiguiente);
    }
  });

  it('debe construir timeline de contingencia vacio si el envio no existe en contingencia', () => {
    const timeline = service.obtenerTimelineContingencia(99999);
    expect(timeline.envioId).toBe(99999);
    expect(timeline.codigoSeguimiento).toBe('RTX-ENV-99999');
    expect(timeline.totalEventos).toBe(0);
    expect(timeline.timeline.length).toBe(0);
  });

  it('debe listar eventos exitosamente desde la API REST', () => {
    service.listarEventos().subscribe(res => {
      expect(res.content.length).toBe(1);
      expect(res.content[0].eventoId).toBe('test-uuid-001');
      expect(res.totalElements).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/eventos`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPagina);
  });

  it('debe aplicar parametros de consulta en listarEventos', () => {
    const filtros: FiltrosConsultaAuditoria = {
      usuario: 'courier_santiago@rutaexpress.cl',
      fechaDesde: '2026-10-18T00:00:00',
      fechaHasta: '2026-10-19T23:59:59',
      estadoNuevo: 'ENTREGADO',
      page: 1,
      size: 10
    };

    service.listarEventos(filtros).subscribe(res => {
      expect(res.content.length).toBe(1);
    });

    const req = httpMock.expectOne(request => {
      return request.url === `${baseUrl}/eventos` &&
        request.params.get('usuario') === 'courier_santiago@rutaexpress.cl' &&
        request.params.get('fechaDesde') === '2026-10-18T00:00:00' &&
        request.params.get('fechaHasta') === '2026-10-19T23:59:59' &&
        request.params.get('estadoNuevo') === 'ENTREGADO' &&
        request.params.get('page') === '1' &&
        request.params.get('size') === '10';
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockPagina);
  });

  it('debe incluir cabecera Authorization Bearer si existe token en sessionStorage', () => {
    sessionStorage.setItem('access_token', 'test-jwt-token-12345');

    service.listarEventos().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/eventos`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-jwt-token-12345');
    req.flush(mockPagina);
  });

  it('debe retornar datos de contingencia filtrados si la API REST falla con error HTTP 500', () => {
    const filtros: FiltrosConsultaAuditoria = {
      estadoNuevo: 'ENTREGADO'
    };

    service.listarEventos(filtros).subscribe(res => {
      expect(res).toBeTruthy();
      expect(res.content.length).toBeGreaterThan(0);
      res.content.forEach(e => {
        expect(e.estadoNuevo).toBe('ENTREGADO');
      });
    });

    const req = httpMock.expectOne(request => request.url === `${baseUrl}/eventos`);
    req.flush('Error interno del servidor', { status: 500, statusText: 'Internal Server Error' });
  });

  it('debe retornar contingencia si la API retorna contenido vacio', () => {
    const paginaVacia: PaginaAuditoria = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0
    };

    service.listarEventos().subscribe(res => {
      expect(res).toBeTruthy();
      expect(res.content.length).toBeGreaterThan(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/eventos`);
    req.flush(paginaVacia);
  });

  it('debe obtener timeline por envio desde la API REST', () => {
    service.obtenerTimelinePorEnvio(4).subscribe(res => {
      expect(res.envioId).toBe(4);
      expect(res.codigoSeguimiento).toBe('RE-LIVE-001');
      expect(res.totalEventos).toBe(1);
      expect(res.timeline.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/envios/4`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTimeline);
  });

  it('debe retornar timeline de contingencia si la API REST de timeline falla', () => {
    service.obtenerTimelinePorEnvio(4).subscribe(res => {
      expect(res).toBeTruthy();
      expect(res.envioId).toBe(4);
      expect(res.timeline.length).toBeGreaterThan(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/envios/4`);
    req.flush('No encontrado', { status: 404, statusText: 'Not Found' });
  });
});
