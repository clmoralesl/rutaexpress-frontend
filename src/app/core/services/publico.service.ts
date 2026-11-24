import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { obtenerApiUrl } from '../config/config-ejecucion';
import { Region } from './envios.service';

export interface SucursalPublica {
  id: number;
  nombre: string;
  calle: string;
  numero: string;
  complemento: string | null;
  idComuna: number;
  horario: string | null;
}

export interface ServicioPublico {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tarifaBase: number;
  precioPorKg: number;
  // D9: aun no los expone el BFF; se muestran si llegan
  pesoMaximoKg?: number | null;
  ladoMaximoCm?: number | null;
  plazoMinDias?: number | null;
  plazoMaxDias?: number | null;
}

export interface CotizacionPublica {
  servicioId: number;
  servicioCodigo: string;
  sucursalOrigenId: number;
  zona: string;
  factorZona: number;
  tarifaBase: number;
  precioPorKg: number;
  pesoVolumetricoKg: number;
  pesoFacturableKg: number;
  totalClp: number;
  plazoMinDias: number | null;
  plazoMaxDias: number | null;
  direccionSucursal: SucursalPublica;
  aviso: string;
  calculadaEn: string;
  validaHasta: string;
}

export interface ConsultaCotizacion {
  servicioId: number;
  sucursalOrigenId: number;
  idComunaDestino: number;
  pesoKg: number;
  largoCm?: number | null;
  anchoCm?: number | null;
  altoCm?: number | null;
}

export const AVISO_REFERENCIAL = 'Valor referencial. El precio final se confirma al pesar y medir el paquete en la sucursal. No constituye una oferta ni reserva de capacidad.';

@Injectable({
  providedIn: 'root'
})
export class PublicoService {
  private readonly apiUrl = `${obtenerApiUrl()}/api/publico`;

  private sucursales$?: Observable<SucursalPublica[]>;
  private servicios$?: Observable<ServicioPublico[]>;
  private regiones$?: Observable<Region[]>;

  constructor(private readonly http: HttpClient) {}

  obtenerSucursales(): Observable<SucursalPublica[]> {
    if (!this.sucursales$) {
      this.sucursales$ = this.http.get<SucursalPublica[]>(`${this.apiUrl}/sucursales`).pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError(err => {
          this.sucursales$ = undefined;
          return throwError(() => err);
        })
      );
    }
    return this.sucursales$;
  }

  obtenerServicios(): Observable<ServicioPublico[]> {
    if (!this.servicios$) {
      this.servicios$ = this.http.get<ServicioPublico[]>(`${this.apiUrl}/servicios`).pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError(err => {
          this.servicios$ = undefined;
          return throwError(() => err);
        })
      );
    }
    return this.servicios$;
  }

  obtenerRegiones(): Observable<Region[]> {
    if (!this.regiones$) {
      this.regiones$ = this.http.get<Region[]>(`${this.apiUrl}/geografia/regiones`).pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError(err => {
          this.regiones$ = undefined;
          return throwError(() => err);
        })
      );
    }
    return this.regiones$;
  }

  cotizar(consulta: ConsultaCotizacion): Observable<CotizacionPublica> {
    let params = new HttpParams()
      .set('servicioId', consulta.servicioId.toString())
      .set('sucursalOrigenId', consulta.sucursalOrigenId.toString())
      .set('idComunaDestino', consulta.idComunaDestino.toString())
      .set('pesoKg', consulta.pesoKg.toString());

    const informado = (v: unknown) => v !== null && v !== undefined && v !== '';
    if (informado(consulta.largoCm) && informado(consulta.anchoCm) && informado(consulta.altoCm)) {
      params = params
        .set('largoCm', consulta.largoCm!.toString())
        .set('anchoCm', consulta.anchoCm!.toString())
        .set('altoCm', consulta.altoCm!.toString());
    }

    return this.http.get<CotizacionPublica>(`${this.apiUrl}/cotizacion`, { params });
  }
}
