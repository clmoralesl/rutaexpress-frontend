import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  CatalogoService,
  CrearServicioDto,
  ActualizarServicioDto,
  CotizacionRequest,
  ServicioCatalogo
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
      descripcion: 'Entrega garantizada en menos de 24 horas',
      tipoVehiculo: 'FURGON',
      tarifaBase: 5000,
      precioPorKg: 1200,
      capacidadMaximaDiaria: 100,
      capacidadDisponible: 85,
      activo: true
    },
    {
      id: 2,
      codigo: 'ESTANDAR',
      nombre: 'Envio Estandar 48-72 Horas',
      descripcion: 'Distribucion economica',
      tipoVehiculo: 'FURGON',
      tarifaBase: 2490,
      precioPorKg: 490,
      capacidadMaximaDiaria: 120,
      capacidadDisponible: 10,
      activo: true
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CatalogoService
      ]
    });

    service = TestBed.inject(CatalogoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente el servicio', () => {
    expect(service).toBeTruthy();
  });

  it('debe retornar lista de contingencia con los 4 servicios por defecto', () => {
    const contingencia = service.obtenerServiciosContingencia();
    expect(contingencia.length).toBe(4);
    expect(contingencia[0].codigo).toBe('EXPRESS-24H');
  });

  it('debe listar servicios exitosamente desde la API', () => {
    service.listarServicios().subscribe(servicios => {
      expect(servicios.length).toBe(2);
      expect(servicios[0].codigo).toBe('EXPRESS-24H');
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockServicios);
  });

  it('debe responder con catalogo de contingencia si la API falla', () => {
    service.listarServicios().subscribe(servicios => {
      expect(servicios.length).toBeGreaterThan(0);
      expect(servicios[0].codigo).toBe('EXPRESS-24H');
    });

    const req = httpMock.expectOne(apiUrl);
    req.flush('Error de conexion', { status: 500, statusText: 'Internal Server Error' });
  });

  it('debe crear un nuevo servicio via POST', () => {
    const nuevoDto: CrearServicioDto = {
      codigo: 'SAME-DAY',
      nombre: 'Entrega Mismo Dia',
      descripcion: 'Despacho urgente',
      tipoVehiculo: 'MOTO',
      tarifaBase: 6000,
      precioPorKg: 1500,
      capacidadMaximaDiaria: 40
    };

    const respuestaServicio: ServicioCatalogo = {
      id: 5,
      codigo: nuevoDto.codigo,
      nombre: nuevoDto.nombre,
      descripcion: nuevoDto.descripcion ?? '',
      tipoVehiculo: nuevoDto.tipoVehiculo,
      tarifaBase: nuevoDto.tarifaBase,
      precioPorKg: nuevoDto.precioPorKg,
      capacidadMaximaDiaria: nuevoDto.capacidadMaximaDiaria,
      capacidadDisponible: 40,
      activo: true
    };

    service.crearServicio(nuevoDto).subscribe(resultado => {
      expect(resultado.id).toBe(5);
      expect(resultado.codigo).toBe('SAME-DAY');
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevoDto);
    req.flush(respuestaServicio);
  });

  it('debe actualizar un servicio existente via PUT', () => {
    const actualizacion: ActualizarServicioDto = {
      nombre: 'Envio Express Actualizado',
      tarifaBase: 5500,
      precioPorKg: 1300,
      capacidadMaximaDiaria: 120,
      activo: true
    };

    const respuestaActualizada: ServicioCatalogo = {
      ...mockServicios[0],
      ...actualizacion
    };

    service.actualizarServicio(1, actualizacion).subscribe(resultado => {
      expect(resultado.tarifaBase).toBe(5500);
      expect(resultado.nombre).toBe('Envio Express Actualizado');
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(respuestaActualizada);
  });

  describe('Motor de Tarifacion y Cotizaciones', () => {
    it('debe calcular cotizacion basada en peso real cuando no hay dimensiones', () => {
      const peticion: CotizacionRequest = {
        servicioId: 1,
        pesoKg: 3.0
      };

      const resultado = service.calcularCotizacion(peticion, mockServicios);
      expect(resultado).not.toBeNull();
      // tarifaBase (5000) + pesoFacturado (3.0 * 1200 = 3600) = 8600
      expect(resultado!.pesoRealKg).toBe(3.0);
      expect(resultado!.pesoVolumetricoKg).toBe(0);
      expect(resultado!.pesoFacturadoKg).toBe(3.0);
      expect(resultado!.tarifaBase).toBe(5000);
      expect(resultado!.costoVariablePeso).toBe(3600);
      expect(resultado!.costoTotalEstimado).toBe(8600);
    });

    it('debe calcular peso volumetrico (L x A x H / 5000) y usar el mayor entre real y volumetrico', () => {
      // 50 x 40 x 30 = 60000 / 5000 = 12 kg volumetrico vs 2.5 kg real
      const peticion: CotizacionRequest = {
        servicioId: 1,
        pesoKg: 2.5,
        largoCm: 50,
        anchoCm: 40,
        altoCm: 30
      };

      const resultado = service.calcularCotizacion(peticion, mockServicios);
      expect(resultado).not.toBeNull();
      expect(resultado!.pesoRealKg).toBe(2.5);
      expect(resultado!.pesoVolumetricoKg).toBe(12);
      expect(resultado!.pesoFacturadoKg).toBe(12);
      // tarifaBase (5000) + (12 * 1200 = 14400) = 19400
      expect(resultado!.costoVariablePeso).toBe(14400);
      expect(resultado!.costoTotalEstimado).toBe(19400);
    });

    it('debe retornar null si el servicio solicitado no existe en la lista', () => {
      const peticion: CotizacionRequest = {
        servicioId: 999,
        pesoKg: 5
      };

      const resultado = service.calcularCotizacion(peticion, mockServicios);
      expect(resultado).toBeNull();
    });
  });
});
