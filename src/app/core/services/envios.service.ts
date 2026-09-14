import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
}

export interface FiltrosEnvios {
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EnviosService {

  private readonly apiUrl = `${environment.apiUrl}/api/bff/envios`;

  constructor(private http: HttpClient) {}

  listar(filtros: FiltrosEnvios = {}): Observable<Envio[]> {
    let params = new HttpParams();

    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }

    if (filtros.fechaDesde) {
      params = params.set(
        'fechaDesde',
        `${filtros.fechaDesde}T00:00:00`
      );
    }

    if (filtros.fechaHasta) {
      params = params.set(
        'fechaHasta',
        `${filtros.fechaHasta}T23:59:59`
      );
    }

    return this.http.get<Envio[]>(this.apiUrl, { params });
  }
}
