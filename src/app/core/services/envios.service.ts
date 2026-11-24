import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { obtenerApiUrl } from '../config/config-ejecucion';

export interface Comuna {
  idComuna: number;
  nombre: string;
}

export interface Region {
  idRegion: number;
  nombre: string;
  comunas: Comuna[];
}

export interface DireccionRequest {
  calle: string;
  numero: string;
  complemento?: string | null;
  idComuna: number;
}

export interface Medidas {
  largoCm: number;
  anchoCm: number;
  altoCm: number;
}

export interface InstantaneaPrecio {
  zona: string;
  factorZona: number;
  tarifaBase: number;
  precioPorKg: number;
  pesoFacturableKg: number;
  totalClp: number;
}

export interface DetallePreregistro {
  sucursalOrigenId: number | null;
  servicioId: number | null;
  medidasDeclaradas: Medidas | null;
  precioEstimado: InstantaneaPrecio | null;
  pesoVerificadoKg: number | null;
  medidasVerificadas: Medidas | null;
  precioFinal: InstantaneaPrecio | null;
  fechaAceptacion: string | null;
}

export interface Envio {
  id: number;
  codigoSeguimiento: string;
  rutRemitente: string;
  rutDestinatario: string;
  direccionOrigen: string;
  direccionDestino: string;
  pesoKg: number;
  estado: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  servicioNombre?: string;
  remitenteNombre?: string;
  destinatarioNombre?: string;
  creadoPorEmail?: string | null;
  preregistro?: DetallePreregistro | null;
}

export interface FiltrosEnvios {
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface CrearEnvioRequest {
  rutRemitente: string;
  rutDestinatario: string;
  sucursalOrigenId: number;
  servicioId: number;
  destino: DireccionRequest;
  pesoKg: number;
  largoCm?: number;
  anchoCm?: number;
  altoCm?: number;
  remitenteEmail?: string;
}

export interface AceptarEnvioRequest {
  pesoVerificadoKg: number;
  largoCm?: number;
  anchoCm?: number;
  altoCm?: number;
  observacion?: string;
}

export interface ActualizarEstadoRequest {
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class EnviosService {
  private readonly apiUrl = `${obtenerApiUrl()}/api/bff/envios`;

  constructor(private readonly http: HttpClient) {}

  obtenerRegiones(): Observable<Region[]> {
    return this.http.get<Region[]>(`${this.apiUrl}/geografia/regiones`);
  }

  listar(filtros: FiltrosEnvios = {}): Observable<Envio[]> {
    let params = new HttpParams();

    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }

    if (filtros.fechaDesde) {
      params = params.set('fechaDesde', `${filtros.fechaDesde}T00:00:00`);
    }

    if (filtros.fechaHasta) {
      params = params.set('fechaHasta', `${filtros.fechaHasta}T23:59:59`);
    }

    return this.http.get<Envio[]>(this.apiUrl, { params });
  }

  crear(request: CrearEnvioRequest): Observable<Envio> {
    return this.http.post<Envio>(this.apiUrl, request);
  }

  aceptar(id: number, request: AceptarEnvioRequest): Observable<Envio> {
    return this.http.post<Envio>(`${this.apiUrl}/${id}/aceptacion`, request);
  }

  actualizarEstado(id: number, estado: string): Observable<Envio> {
    const request: ActualizarEstadoRequest = { estado };

    return this.http.put<Envio>(
      `${this.apiUrl}/${id}/estado`,
      request
    );
  }

  solicitarEtiqueta(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/etiqueta`, {});
  }
}
