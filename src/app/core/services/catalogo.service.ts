import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ServicioCatalogo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipoVehiculo: string;
  tarifaBase: number;
  precioPorKg: number;
  capacidadMaximaDiaria: number;
  capacidadDisponible: number;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface CrearServicioDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoVehiculo: string;
  tarifaBase: number;
  precioPorKg: number;
  capacidadMaximaDiaria: number;
}

export interface ActualizarServicioDto {
  nombre?: string;
  descripcion?: string;
  tipoVehiculo?: string;
  tarifaBase?: number;
  precioPorKg?: number;
  capacidadMaximaDiaria?: number;
  activo?: boolean;
}

export interface CotizacionRequest {
  servicioId: number;
  pesoKg: number;
  largoCm?: number;
  anchoCm?: number;
  altoCm?: number;
}

export interface CotizacionResultado {
  servicio: ServicioCatalogo;
  pesoRealKg: number;
  pesoVolumetricoKg: number;
  pesoFacturadoKg: number;
  tarifaBase: number;
  costoVariablePeso: number;
  costoTotalEstimado: number;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {

  private readonly apiUrl = `${environment.apiUrl}/api/bff/catalogo/servicios`;

  // Catalogo de contingencia inicial para ejecucion resiliente offline o en entornos de prueba
  private serviciosLocales: ServicioCatalogo[] = [
    {
      id: 1,
      codigo: 'EXPRESS-24H',
      nombre: 'Envio Express 24 Horas',
      descripcion: 'Entrega garantizada en menos de 24 horas habiles en radio urbano metropolitano.',
      tipoVehiculo: 'FURGON',
      tarifaBase: 5000,
      precioPorKg: 1200,
      capacidadMaximaDiaria: 100,
      capacidadDisponible: 99,
      activo: true,
      fechaCreacion: '2026-10-19T04:41:50',
      fechaActualizacion: '2026-10-19T04:41:54'
    },
    {
      id: 2,
      codigo: 'ESTANDAR',
      nombre: 'Envio Estandar 48-72 Horas',
      descripcion: 'Distribucion economica para encomiendas no urgentes con cobertura interurbana.',
      tipoVehiculo: 'FURGON',
      tarifaBase: 2490,
      precioPorKg: 490,
      capacidadMaximaDiaria: 120,
      capacidadDisponible: 120,
      activo: true,
      fechaCreacion: '2026-10-20T01:41:02',
      fechaActualizacion: '2026-10-20T01:41:02'
    },
    {
      id: 3,
      codigo: 'MISMO_DIA',
      nombre: 'Entrega Mismo Dia (Same Day)',
      descripcion: 'Despacho prioritario para compras realizadas antes de las 13:00 horas.',
      tipoVehiculo: 'MOTO',
      tarifaBase: 5490,
      precioPorKg: 1190,
      capacidadMaximaDiaria: 30,
      capacidadDisponible: 30,
      activo: true,
      fechaCreacion: '2026-10-20T01:41:12',
      fechaActualizacion: '2026-10-20T01:41:12'
    },
    {
      id: 4,
      codigo: 'CARGA_PESADA',
      nombre: 'Transporte de Carga Pesada y Paletizada',
      descripcion: 'Transporte especializado para bultos mayores a 30 kg o mercaderia volumetrica.',
      tipoVehiculo: 'CAMION',
      tarifaBase: 14990,
      precioPorKg: 350,
      capacidadMaximaDiaria: 15,
      capacidadDisponible: 15,
      activo: true,
      fechaCreacion: '2026-10-20T01:41:12',
      fechaActualizacion: '2026-10-20T01:41:12'
    }
  ];

  constructor(private readonly http: HttpClient) {}

  /**
   * Retorna una copia del catalogo de contingencia garantizado.
   */
  obtenerServiciosContingencia(): ServicioCatalogo[] {
    return JSON.parse(JSON.stringify(this.serviciosLocales));
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('access_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  }

  /**
   * Consulta el listado de servicios del catalogo a traves del BFF con respaldo local.
   */
  listarServicios(): Observable<ServicioCatalogo[]> {
    return this.http.get<ServicioCatalogo[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      map(servicios => {
        if (servicios && Array.isArray(servicios) && servicios.length > 0) {
          this.serviciosLocales = servicios;
          return servicios;
        }
        return this.obtenerServiciosContingencia();
      }),
      catchError(() => {
        // En caso de modo offline, contingencia o falta de token, responde con el estado local
        return of(this.obtenerServiciosContingencia());
      })
    );
  }

  /**
   * Obtiene el detalle de un servicio por su identificador.
   */
  obtenerPorId(id: number): Observable<ServicioCatalogo | undefined> {
    return this.http.get<ServicioCatalogo>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      catchError(() => of(this.serviciosLocales.find(s => s.id === id)))
    );
  }

  /**
   * Registra un nuevo servicio en el catalogo logistico.
   */
  crearServicio(dto: CrearServicioDto): Observable<ServicioCatalogo> {
    return this.http.post<ServicioCatalogo>(this.apiUrl, dto, { headers: this.getHeaders() }).pipe(
      map(nuevo => {
        this.serviciosLocales.push(nuevo);
        return nuevo;
      }),
      catchError(() => {
        // Fallback local: asigna ID secuencial y almacena en memoria
        const nuevoLocal: ServicioCatalogo = {
          id: this.serviciosLocales.length > 0 ? Math.max(...this.serviciosLocales.map(s => s.id)) + 1 : 1,
          codigo: dto.codigo.trim().toUpperCase(),
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() ?? '',
          tipoVehiculo: dto.tipoVehiculo,
          tarifaBase: Number(dto.tarifaBase),
          precioPorKg: Number(dto.precioPorKg),
          capacidadMaximaDiaria: Number(dto.capacidadMaximaDiaria),
          capacidadDisponible: Number(dto.capacidadMaximaDiaria),
          activo: true,
          fechaCreacion: new Date().toISOString(),
          fechaActualizacion: new Date().toISOString()
        };
        this.serviciosLocales.push(nuevoLocal);
        return of(nuevoLocal);
      })
    );
  }

  /**
   * Actualiza tarifas o capacidad de un servicio existente.
   */
  actualizarServicio(id: number, dto: ActualizarServicioDto): Observable<ServicioCatalogo> {
    return this.http.put<ServicioCatalogo>(`${this.apiUrl}/${id}`, dto, { headers: this.getHeaders() }).pipe(
      map(actualizado => {
        const index = this.serviciosLocales.findIndex(s => s.id === id);
        if (index !== -1) {
          this.serviciosLocales[index] = actualizado;
        }
        return actualizado;
      }),
      catchError(() => {
        // Fallback local de edicion
        const servicioExistente = this.serviciosLocales.find(s => s.id === id);
        if (servicioExistente) {
          if (dto.nombre !== undefined) servicioExistente.nombre = dto.nombre.trim();
          if (dto.descripcion !== undefined) servicioExistente.descripcion = dto.descripcion.trim();
          if (dto.tipoVehiculo !== undefined) servicioExistente.tipoVehiculo = dto.tipoVehiculo;
          if (dto.tarifaBase !== undefined) servicioExistente.tarifaBase = Number(dto.tarifaBase);
          if (dto.precioPorKg !== undefined) servicioExistente.precioPorKg = Number(dto.precioPorKg);
          if (dto.capacidadMaximaDiaria !== undefined) {
            const diferencia = Number(dto.capacidadMaximaDiaria) - servicioExistente.capacidadMaximaDiaria;
            servicioExistente.capacidadMaximaDiaria = Number(dto.capacidadMaximaDiaria);
            servicioExistente.capacidadDisponible = Math.max(0, servicioExistente.capacidadDisponible + diferencia);
          }
          if (dto.activo !== undefined) servicioExistente.activo = dto.activo;
          servicioExistente.fechaActualizacion = new Date().toISOString();
          return of(servicioExistente);
        }
        throw new Error('Servicio no encontrado');
      })
    );
  }

  /**
   * Motor de tarifacion y calculo de cotizaciones.
   * Aplica la formula logistica estandar con soporte para peso volumetrico:
   * Peso Volumetrico (kg) = (Largo x Ancho x Alto) / 5000
   * Peso Facturable = Max(Peso Real, Peso Volumetrico)
   * Costo Total = Tarifa Base + (Peso Facturable * Precio por Kg)
   */
  calcularCotizacion(request: CotizacionRequest, servicios: ServicioCatalogo[]): CotizacionResultado | null {
    const servicio = servicios.find(s => s.id === request.servicioId);
    if (!servicio) {
      return null;
    }

    const pesoReal = Math.max(0.1, Number(request.pesoKg) || 0.1);
    let pesoVolumetrico = 0;

    if (request.largoCm && request.anchoCm && request.altoCm) {
      const largo = Math.max(1, Number(request.largoCm));
      const ancho = Math.max(1, Number(request.anchoCm));
      const alto = Math.max(1, Number(request.altoCm));
      pesoVolumetrico = Number(((largo * ancho * alto) / 5000).toFixed(2));
    }

    const pesoFacturado = Number(Math.max(pesoReal, pesoVolumetrico).toFixed(2));
    const tarifaBase = Number(servicio.tarifaBase);
    const costoVariablePeso = Number((pesoFacturado * Number(servicio.precioPorKg)).toFixed(0));
    const costoTotalEstimado = tarifaBase + costoVariablePeso;

    return {
      servicio,
      pesoRealKg: pesoReal,
      pesoVolumetricoKg: pesoVolumetrico,
      pesoFacturadoKg: pesoFacturado,
      tarifaBase,
      costoVariablePeso,
      costoTotalEstimado
    };
  }
}
