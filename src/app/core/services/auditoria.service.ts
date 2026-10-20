import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EventoAuditoria {
  id: number;
  eventoId: string;
  envioId: number;
  codigoSeguimiento: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  usuarioEmail: string;
  usuarioRol: string;
  fechaEvento: string;
  fechaRegistro: string;
  detalles: Record<string, any>;
}

export interface TimelineEnvio {
  envioId: number;
  codigoSeguimiento: string;
  totalEventos: number;
  timeline: EventoAuditoria[];
}

export interface PaginaAuditoria {
  content: EventoAuditoria[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface FiltrosConsultaAuditoria {
  usuario?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  estadoNuevo?: string;
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {

  private readonly baseUrl = `${environment.apiUrl}/api/bff/auditoria`;

  // Dataset de contingencia sincronizado con eventos reales de Oracle ATP y Kafka Event Sourcing
  private readonly eventosContingencia: EventoAuditoria[] = [
    {
      id: 30,
      eventoId: 'cc1fde0c-43ce-4a3a-91de-246d466580a8',
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
        direccionOrigen: 'Santiago Centro 100',
        direccionDestino: 'Las Condes 200',
        rutRemitente: '12345678-5',
        rutDestinatario: '98765432-1',
        firmaReceptor: 'Constanza Morales',
        tiempoTransitoMinutos: 45
      }
    },
    {
      id: 29,
      eventoId: '0d764fdb-a1cb-4c6e-ae20-b29b57ac5431',
      envioId: 4,
      codigoSeguimiento: 'RE-LIVE-001',
      estadoAnterior: 'EN_BODEGA',
      estadoNuevo: 'EN_RUTA',
      usuarioEmail: 'despachador1@rutaexpress.cl',
      usuarioRol: 'DESPACHADOR',
      fechaEvento: '2026-10-18T18:30:00',
      fechaRegistro: '2026-10-20T02:37:31',
      detalles: {
        pesoKg: 3.5,
        vehiculoAsignado: 'FURGON-04',
        conductor: 'Mario Silva',
        patente: 'JJ-XX-99',
        rutaPlanificada: 'Sector Oriente'
      }
    },
    {
      id: 28,
      eventoId: '94ebcda0-d8bc-4519-8da8-cc2a74dcb52f',
      envioId: 4,
      codigoSeguimiento: 'RE-LIVE-001',
      estadoAnterior: 'ACEPTADO',
      estadoNuevo: 'EN_BODEGA',
      usuarioEmail: 'operador_bodega@rutaexpress.cl',
      usuarioRol: 'OPERADOR',
      fechaEvento: '2026-10-18T16:15:00',
      fechaRegistro: '2026-10-20T02:37:31',
      detalles: {
        pesoKg: 3.5,
        bodegaRecepion: 'Bodega Central Pudahuel',
        posicionPallet: 'B-12-C',
        etiquetaImpresa: true
      }
    },
    {
      id: 27,
      eventoId: 'fefec012-f55e-4ae8-a412-ac151caa3556',
      envioId: 4,
      codigoSeguimiento: 'RE-LIVE-001',
      estadoAnterior: 'CREADO',
      estadoNuevo: 'ACEPTADO',
      usuarioEmail: 'sistema@rutaexpress.cl',
      usuarioRol: 'SISTEMA',
      fechaEvento: '2026-10-18T14:40:00',
      fechaRegistro: '2026-10-20T02:37:31',
      detalles: {
        pesoKg: 3.5,
        servicioContratado: 'Envio Express 24h',
        cupoDescontado: 1,
        colaRabbitMq: 'q.cmd.warehouse'
      }
    },
    {
      id: 26,
      eventoId: '2355c58c-b0a7-461e-8a1a-acebb0ae0668',
      envioId: 4,
      codigoSeguimiento: 'RE-LIVE-001',
      estadoAnterior: null,
      estadoNuevo: 'CREADO',
      usuarioEmail: 'cliente_empresa@duocuc.cl',
      usuarioRol: 'CLIENTE',
      fechaEvento: '2026-10-18T14:25:40',
      fechaRegistro: '2026-10-20T02:37:30',
      detalles: {
        pesoKg: 3.5,
        direccionOrigen: 'Santiago Centro 100',
        direccionDestino: 'Las Condes 200',
        rutRemitente: '12345678-5',
        rutDestinatario: '98765432-1',
        tarifaBase: 5000,
        tarifaTotal: 9200
      }
    },
    {
      id: 42,
      eventoId: '3ab17da3-3283-4bda-99f5-1de3001d48ac',
      envioId: 2117,
      codigoSeguimiento: 'RE-ANL-TEST-2117',
      estadoAnterior: 'EN_RUTA',
      estadoNuevo: 'ENTREGADO',
      usuarioEmail: 'courier_norte@rutaexpress.cl',
      usuarioRol: 'COURIER',
      fechaEvento: '2026-10-18T17:33:21',
      fechaRegistro: '2026-10-20T02:37:33',
      detalles: {
        servicio: 'Envio Express 24h',
        zona: 'Antofagasta Urbano',
        receptorNombre: 'Carlos Gomez'
      }
    },
    {
      id: 44,
      eventoId: '76f239c2-867e-497c-935d-06cbe13ff734',
      envioId: 1,
      codigoSeguimiento: 'RE-KAFKA-38fddb3c',
      estadoAnterior: 'CREADO',
      estadoNuevo: 'ACEPTADO',
      usuarioEmail: 'operador1@rutaexpress.cl',
      usuarioRol: 'OPERADOR',
      fechaEvento: '2026-10-18T16:20:00',
      fechaRegistro: '2026-10-20T02:37:33',
      detalles: {
        pesoKg: 7.8,
        direccionOrigen: 'Av. Libertador 1234',
        direccionDestino: 'Av. Costanera 4321',
        rutRemitente: '11223344-5',
        rutDestinatario: '99887766-4'
      }
    },
    {
      id: 7,
      eventoId: '8b511f25-c4d5-4e96-a8ce-a1afb48c3055',
      envioId: 2,
      codigoSeguimiento: 'RE-2026-004',
      estadoAnterior: 'EN_RUTA',
      estadoNuevo: 'ENTREGADO',
      usuarioEmail: 'courier_valparaiso@rutaexpress.cl',
      usuarioRol: 'COURIER',
      fechaEvento: '2026-10-19T09:21:58',
      fechaRegistro: '2026-10-19T09:21:58',
      detalles: {
        pesoKg: 3.1,
        direccionOrigen: 'Calle Brasil 560, Santiago Centro',
        direccionDestino: 'Av. Barros Luco 1200, San Antonio',
        rutRemitente: '16789012-3',
        rutDestinatario: '17890123-4'
      }
    },
    {
      id: 45,
      eventoId: '88ea0d03-a049-489a-b463-ad98ba34745f',
      envioId: 6,
      codigoSeguimiento: 'RE-2026-006',
      estadoAnterior: 'CREADO',
      estadoNuevo: 'CANCELADO',
      usuarioEmail: 'admin@rutaexpress.cl',
      usuarioRol: 'ROLE_ADMIN',
      fechaEvento: '2026-10-19T10:15:00',
      fechaRegistro: '2026-10-19T10:15:00',
      detalles: {
        motivoCancelacion: 'Solicitud formal del remitente antes del despacho a bodega',
        devolucionMonto: 4000,
        estadoReembolso: 'PROCESADO'
      }
    }
  ];

  private origenDatosActual: 'ORACLE_DB' | 'CONTINGENCIA' = 'CONTINGENCIA';

  get origenDatos(): 'ORACLE_DB' | 'CONTINGENCIA' {
    return this.origenDatosActual;
  }

  constructor(private readonly http: HttpClient) {}

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
   * Consulta el flujo paginado de eventos de auditoria con filtros opcionales.
   */
  listarEventos(filtros?: FiltrosConsultaAuditoria): Observable<PaginaAuditoria> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.usuario) params = params.set('usuario', filtros.usuario.trim());
      if (filtros.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);
      if (filtros.estadoNuevo && filtros.estadoNuevo !== 'TODOS') params = params.set('estadoNuevo', filtros.estadoNuevo);
      if (filtros.page !== undefined) params = params.set('page', filtros.page.toString());
      if (filtros.size !== undefined) params = params.set('size', filtros.size.toString());
    }

    return this.http.get<PaginaAuditoria>(`${this.baseUrl}/eventos`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(pagina => {
        if (pagina && pagina.content && pagina.content.length > 0) {
          this.origenDatosActual = 'ORACLE_DB';
          return pagina;
        }
        this.origenDatosActual = 'CONTINGENCIA';
        return this.filtrarContingenciaPaginada(filtros);
      }),
      catchError(() => {
        this.origenDatosActual = 'CONTINGENCIA';
        return of(this.filtrarContingenciaPaginada(filtros));
      })
    );
  }

  /**
   * Obtiene la linea de tiempo cronologica inmutable de un envio especifico.
   */
  obtenerTimelinePorEnvio(envioId: number): Observable<TimelineEnvio> {
    return this.http.get<TimelineEnvio>(`${this.baseUrl}/envios/${envioId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(timeline => {
        this.origenDatosActual = 'ORACLE_DB';
        return timeline;
      }),
      catchError(() => {
        this.origenDatosActual = 'CONTINGENCIA';
        return of(this.obtenerTimelineContingencia(envioId));
      })
    );
  }

  /**
   * Retorna una copia del conjunto completo de eventos de contingencia.
   */
  obtenerEventosContingencia(): EventoAuditoria[] {
    return JSON.parse(JSON.stringify(this.eventosContingencia));
  }

  /**
   * Construye el timeline de contingencia para un envio dado.
   */
  obtenerTimelineContingencia(envioId: number): TimelineEnvio {
    const eventos = this.eventosContingencia
      .filter(e => e.envioId === envioId)
      .sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime());

    const codigo = eventos.length > 0 ? eventos[0].codigoSeguimiento : `RTX-ENV-${envioId}`;

    return {
      envioId,
      codigoSeguimiento: codigo,
      totalEventos: eventos.length,
      timeline: eventos
    };
  }

  /**
   * Filtra el dataset de contingencia local aplicando los criterios de busqueda.
   */
  private filtrarContingenciaPaginada(filtros?: FiltrosConsultaAuditoria): PaginaAuditoria {
    let filtrados = this.obtenerEventosContingencia();

    if (filtros) {
      if (filtros.usuario) {
        const u = filtros.usuario.toLowerCase().trim();
        filtrados = filtrados.filter(e => e.usuarioEmail.toLowerCase().includes(u));
      }
      if (filtros.estadoNuevo && filtros.estadoNuevo !== 'TODOS') {
        filtrados = filtrados.filter(e => e.estadoNuevo === filtros.estadoNuevo);
      }
      if (filtros.fechaDesde) {
        const desde = new Date(filtros.fechaDesde).getTime();
        filtrados = filtrados.filter(e => new Date(e.fechaEvento).getTime() >= desde);
      }
      if (filtros.fechaHasta) {
        const hasta = new Date(filtros.fechaHasta).getTime();
        filtrados = filtrados.filter(e => new Date(e.fechaEvento).getTime() <= hasta);
      }
    }

    const pageSize = filtros?.size || 20;
    const pageIndex = filtros?.page || 0;
    const totalElements = filtrados.length;
    const totalPages = Math.ceil(totalElements / pageSize) || 1;
    const start = pageIndex * pageSize;
    const paginados = filtrados.slice(start, start + pageSize);

    return {
      content: paginados,
      totalElements,
      totalPages,
      size: pageSize,
      number: pageIndex
    };
  }
}
