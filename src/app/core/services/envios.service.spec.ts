import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EnviosService, Envio, CrearEnvioRequest } from './envios.service';
import { environment } from '../../../environments/environment';

describe('EnviosService', () => {
  let service: EnviosService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/bff/envios`;

  const envioMock: Envio = {
    id: 1,
    codigoSeguimiento: 'RE-2026-001',
    rutRemitente: '15678901-2',
    rutDestinatario: '18234567-8',
    direccionOrigen: 'Av. Providencia 1234, Santiago',
    direccionDestino: 'Calle Los Aromos 456, Maipu',
    pesoKg: 2.5,
    estado: 'CREADO',
    fechaCreacion: '2026-10-18T23:22:43.735Z',
    fechaActualizacion: '2026-10-18T23:22:43.735Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EnviosService]
    });

    service = TestBed.inject(EnviosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('listar', () => {
    it('debe solicitar lista de envios sin filtros', () => {
      service.listar().subscribe((envios) => {
        expect(envios.length).toBe(1);
        expect(envios[0].codigoSeguimiento).toBe('RE-2026-001');
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      req.flush([envioMock]);
    });

    it('debe aplicar parametros de filtro cuando se proporcionan', () => {
      service.listar({ estado: 'CREADO', fechaDesde: '2026-10-01', fechaHasta: '2026-10-20' })
        .subscribe((envios) => {
          expect(envios).toBeDefined();
        });

      const req = httpMock.expectOne(
        (r) => r.url === baseUrl &&
          r.params.get('estado') === 'CREADO' &&
          r.params.get('fechaDesde') === '2026-10-01T00:00:00' &&
          r.params.get('fechaHasta') === '2026-10-20T23:59:59'
      );
      expect(req.request.method).toBe('GET');
      req.flush([envioMock]);
    });
  });

  describe('crear', () => {
    it('debe enviar POST con el payload para crear un envio', () => {
      const nuevo: CrearEnvioRequest = {
        codigoSeguimiento: 'RE-2026-002',
        rutRemitente: '11111111-1',
        rutDestinatario: '22222222-2',
        direccionOrigen: 'Origen A',
        direccionDestino: 'Destino B',
        pesoKg: 3.5
      };

      service.crear(nuevo).subscribe((res) => {
        expect(res.id).toBe(2);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(nuevo);
      req.flush({ ...envioMock, id: 2, codigoSeguimiento: 'RE-2026-002' });
    });
  });

  describe('actualizarEstado', () => {
    it('debe enviar PUT a /api/bff/envios/:id/estado', () => {
      service.actualizarEstado(1, 'ACEPTADO').subscribe((res) => {
        expect(res.estado).toBe('ACEPTADO');
      });

      const req = httpMock.expectOne(`${baseUrl}/1/estado`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ estado: 'ACEPTADO' });
      req.flush({ ...envioMock, estado: 'ACEPTADO' });
    });
  });

  describe('solicitarEtiqueta', () => {
    it('debe enviar POST a /api/bff/envios/:id/etiqueta para encolar en RabbitMQ', () => {
      let completado = false;
      service.solicitarEtiqueta(1).subscribe(() => {
        completado = true;
      });

      const req = httpMock.expectOne(`${baseUrl}/1/etiqueta`);
      expect(req.request.method).toBe('POST');
      req.flush(null, { status: 202, statusText: 'Accepted' });
      expect(completado).toBeTrue();
    });
  });
});
