import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  CatalogoService,
  ServicioCatalogo,
  CrearServicioDto,
  ActualizarServicioDto
} from './catalogo.service';
import { environment } from '../../../environments/environment';

describe('CatalogoService', () => {
  let service: CatalogoService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/api/bff/catalogo/servicios`;

  const mockServicios: ServicioCatalogo[] = [
    {
      id: 1,
      codigo: 'EXPRESS-24H',
      nombre: 'Envio Express 24 Horas',
      descripcion: 'Entrega en 24 horas habiles.',
      tipoVehiculo: 'FURGON',
      tarifaBase: 5000,
      precioPorKg: 1200,
      capacidadMaximaDiaria: 100,
      capacidadDisponible: 95,
      activo: true,
      fechaCreacion: '2026-10-19T04:41:50',
      fechaActualizacion: '2026-10-19T04:41:54'
    },
    {
      id: 2,
      codigo: 'ESTANDAR',
      nombre: 'Envio Estandar 48-72 Horas',
      descripcion: 'Distribucion economica.',
      tipoVehiculo: 'FURGON',
      tarifaBase: 2490,
      precioPorKg: 490,
      capacidadMaximaDiaria: 120,
      capacidadDisponible: 120,
      activo: true,
      fechaCreacion: '2026-10-20T01:41:02',
      fechaActualizacion: '2026-10-20T01:41:02'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CatalogoService]
    });
    service = TestBed.inject(CatalogoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe retornar lista de servicios del backend por peticion HTTP GET', () => {
    service.listarServicios().subscribe(servicios => {
      expect(servicios.length).toBe(2);
      expect(servicios[0].codigo).toBe('EXPRESS-24H');
      expect(servicios[1].codigo).toBe('ESTANDAR');
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockServicios);
  });

  it('debe responder con catalogo de contingencia si el servidor falla (resiliencia offline)', () => {
    service.listarServicios().subscribe(servicios => {
      expect(servicios).toBeDefined();
      expect(servicios.length).toBeGreaterThan(0);
      expect(servicios.some(s => s.codigo === 'EXPRESS-24H')).toBeTrue();
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush('Error de conexion con BFF', { status: 503, statusText: 'Service Unavailable' });
  });

  it('debe obtener un servicio especifico por su identificador', () => {
    service.obtenerPorId(1).subscribe(servicio => {
      expect(servicio).toBeDefined();
      expect(servicio?.id).toBe(1);
      expect(servicio?.nombre).toBe('Envio Express 24 Horas');
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockServicios[0]);
  });

  it('debe registrar un nuevo servicio enviando peticion POST', () => {
    const nuevoServicio: CrearServicioDto = {
      codigo: 'MISMO_DIA',
      nombre: 'Envio Mismo Dia',
      descripcion: 'Despacho urgente',
      tipoVehiculo: 'MOTO',
      tarifaBase: 5490,
      precioPorKg: 1190,
      capacidadMaximaDiaria: 30
    };

    const respuestaServidor: ServicioCatalogo = {
      id: 3,
      ...nuevoServicio,
      descripcion: nuevoServicio.descripcion || '',
      capacidadDisponible: 30,
      activo: true,
      fechaCreacion: '2026-10-23T10:00:00',
      fechaActualizacion: '2026-10-23T10:00:00'
    };

    service.crearServicio(nuevoServicio).subscribe(resultado => {
      expect(resultado.id).toBe(3);
      expect(resultado.codigo).toBe('MISMO_DIA');
      expect(resultado.activo).toBeTrue();
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevoServicio);
    req.flush(respuestaServidor);
  });

  it('debe actualizar tarifas y capacidad de un servicio mediante PUT', () => {
    const actualizacion: ActualizarServicioDto = {
      nombre: 'Envio Express Actualizado',
      tarifaBase: 5500
    };

    const respuestaActualizada: ServicioCatalogo = {
      ...mockServicios[0],
      nombre: 'Envio Express Actualizado',
      tarifaBase: 5500
    };

    service.actualizarServicio(1, actualizacion).subscribe(resultado => {
      expect(resultado.tarifaBase).toBe(5500);
      expect(resultado.nombre).toBe('Envio Express Actualizado');
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(respuestaActualizada);
  });
});
