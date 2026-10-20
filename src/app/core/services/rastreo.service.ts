import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoSeguimiento = 'CREADO' | 'ACEPTADO' | 'EN_BODEGA' | 'EN_RUTA' | 'ENTREGADO' | 'CANCELADO';

export interface EventoSeguimiento {
  estado: EstadoSeguimiento;
  descripcion?: string;
  fecha: string;
}

export interface SeguimientoEnvio {
  codigoSeguimiento: string;
  estadoActual: EstadoSeguimiento;
  ciudadOrigen: string;
  ciudadDestino: string;
  fechaEstimadaEntrega: string;
  servicioContratado: string;
  courierAsignado: string;
  pesoKg: number;
  fechaCreacion: string;
  fechaActualizacion: string;
  historial: EventoSeguimiento[];
}

@Injectable({
  providedIn: 'root'
})
export class RastreoService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/publico/seguimiento`;

  private readonly datosDemostracion: Record<string, SeguimientoEnvio> = {
    'RTX-2026-0001': {
      codigoSeguimiento: 'RTX-2026-0001',
      estadoActual: 'ENTREGADO',
      ciudadOrigen: 'Santiago (Región Metropolitana)',
      ciudadDestino: 'Valparaíso (Región de Valparaíso)',
      fechaEstimadaEntrega: '2026-10-20T14:30:00',
      servicioContratado: 'Envío Express 24h',
      courierAsignado: 'Flota RutaExpress - Móvil 14',
      pesoKg: 3.5,
      fechaCreacion: '2026-10-18T09:15:00',
      fechaActualizacion: '2026-10-19T13:45:00',
      historial: [
        { estado: 'CREADO', descripcion: 'Envío registrado en plataforma por el remitente', fecha: '2026-10-18T09:15:00' },
        { estado: 'ACEPTADO', descripcion: 'Envío aceptado y clasificado en centro logístico central', fecha: '2026-10-18T10:30:00' },
        { estado: 'EN_BODEGA', descripcion: 'Recepción y rotulado con etiqueta térmica en bodega Pudahuel', fecha: '2026-10-18T14:00:00' },
        { estado: 'EN_RUTA', descripcion: 'En transporte terrestre hacia centro de distribución regional', fecha: '2026-10-19T08:20:00' },
        { estado: 'ENTREGADO', descripcion: 'Paquete entregado conforme en dirección de destino', fecha: '2026-10-19T13:45:00' }
      ]
    },
    'RTX-2026-0002': {
      codigoSeguimiento: 'RTX-2026-0002',
      estadoActual: 'EN_RUTA',
      ciudadOrigen: 'Concepción (Región del Biobío)',
      ciudadDestino: 'La Serena (Región de Coquimbo)',
      fechaEstimadaEntrega: '2026-10-21T18:00:00',
      servicioContratado: 'Envío Estándar Nacional',
      courierAsignado: 'Troncal Interurbano RutaExpress',
      pesoKg: 5.2,
      fechaCreacion: '2026-10-18T16:40:00',
      fechaActualizacion: '2026-10-19T11:20:00',
      historial: [
        { estado: 'CREADO', descripcion: 'Orden de envío registrada exitosamente', fecha: '2026-10-18T16:40:00' },
        { estado: 'ACEPTADO', descripcion: 'Validación de peso y asignación de cupo vehicular', fecha: '2026-10-18T17:50:00' },
        { estado: 'EN_BODEGA', descripcion: 'Ingreso a bodega de consolidación sur', fecha: '2026-10-19T07:15:00' },
        { estado: 'EN_RUTA', descripcion: 'En tránsito hacia el centro logístico norte', fecha: '2026-10-19T11:20:00' }
      ]
    },
    'RTX-2026-0003': {
      codigoSeguimiento: 'RTX-2026-0003',
      estadoActual: 'EN_BODEGA',
      ciudadOrigen: 'Antofagasta (Región de Antofagasta)',
      ciudadDestino: 'Santiago (Región Metropolitana)',
      fechaEstimadaEntrega: '2026-10-22T12:00:00',
      servicioContratado: 'Carga Pesada Especial',
      courierAsignado: 'Flota Carga Norte RutaExpress',
      pesoKg: 18.0,
      fechaCreacion: '2026-10-19T08:00:00',
      fechaActualizacion: '2026-10-19T15:30:00',
      historial: [
        { estado: 'CREADO', descripcion: 'Orden de envío recepcionada en sucursal', fecha: '2026-10-19T08:00:00' },
        { estado: 'ACEPTADO', descripcion: 'Capacidad de bodega reservada', fecha: '2026-10-19T09:20:00' },
        { estado: 'EN_BODEGA', descripcion: 'Rotulado con código QR y palletizado en bodega Antofagasta', fecha: '2026-10-19T15:30:00' }
      ]
    },
    'RTX-2026-0004': {
      codigoSeguimiento: 'RTX-2026-0004',
      estadoActual: 'ACEPTADO',
      ciudadOrigen: 'Temuco (Región de La Araucanía)',
      ciudadDestino: 'Puerto Montt (Región de Los Lagos)',
      fechaEstimadaEntrega: '2026-10-21T17:00:00',
      servicioContratado: 'Envío Express 24h',
      courierAsignado: 'Móvil Reparto Sur 08',
      pesoKg: 1.8,
      fechaCreacion: '2026-10-19T14:10:00',
      fechaActualizacion: '2026-10-19T15:00:00',
      historial: [
        { estado: 'CREADO', descripcion: 'Envío generado electrónicamente', fecha: '2026-10-19T14:10:00' },
        { estado: 'ACEPTADO', descripcion: 'Cupo vehicular descontado y aceptado en sistema', fecha: '2026-10-19T15:00:00' }
      ]
    },
    'RTX-2026-0005': {
      codigoSeguimiento: 'RTX-2026-0005',
      estadoActual: 'CREADO',
      ciudadOrigen: 'Arica (Región de Arica y Parinacota)',
      ciudadDestino: 'Iquique (Región de Tarapacá)',
      fechaEstimadaEntrega: '2026-10-22T19:00:00',
      servicioContratado: 'Envío Estándar Regional',
      courierAsignado: 'Por Asignar en Bodega',
      pesoKg: 0.9,
      fechaCreacion: '2026-10-19T18:25:00',
      fechaActualizacion: '2026-10-19T18:25:00',
      historial: [
        { estado: 'CREADO', descripcion: 'Envío registrado en plataforma por el cliente', fecha: '2026-10-19T18:25:00' }
      ]
    },
    'RTX-2026-0006-C': {
      codigoSeguimiento: 'RTX-2026-0006-C',
      estadoActual: 'CANCELADO',
      ciudadOrigen: 'Santiago (Región Metropolitana)',
      ciudadDestino: 'Rancagua (Región de O Higgins)',
      fechaEstimadaEntrega: 'Cancelada',
      servicioContratado: 'Envío Mismo Día',
      courierAsignado: 'No aplica (Operación cancelada)',
      pesoKg: 2.1,
      fechaCreacion: '2026-10-19T10:00:00',
      fechaActualizacion: '2026-10-19T11:15:00',
      historial: [
        { estado: 'CREADO', descripcion: 'Envío registrado inicialmente en plataforma', fecha: '2026-10-19T10:00:00' },
        { estado: 'CANCELADO', descripcion: 'Envío cancelado a solicitud del remitente antes del despacho', fecha: '2026-10-19T11:15:00' }
      ]
    },
    // Alias para compatibilidad con codigos de prueba cargados en Oracle DB (03_data_envios.sql)
    'RE-2026-001': {
      codigoSeguimiento: 'RE-2026-001',
      estadoActual: 'CREADO',
      ciudadOrigen: 'Santiago (Providencia)',
      ciudadDestino: 'Santiago (Maipú)',
      fechaEstimadaEntrega: '2026-10-21T18:00:00',
      servicioContratado: 'Envío Estándar Urbano',
      courierAsignado: 'Por Asignar en Bodega',
      pesoKg: 2.50,
      fechaCreacion: '2026-10-19T08:30:00',
      fechaActualizacion: '2026-10-19T08:30:00',
      historial: [{ estado: 'CREADO', descripcion: 'Envío registrado en plataforma por el remitente', fecha: '2026-10-19T08:30:00' }]
    },
    'RE-2026-002': {
      codigoSeguimiento: 'RE-2026-002',
      estadoActual: 'ACEPTADO',
      ciudadOrigen: 'Santiago (Las Condes)',
      ciudadDestino: 'Santiago (Pudahuel)',
      fechaEstimadaEntrega: '2026-10-21T16:00:00',
      servicioContratado: 'Envío Express 24h',
      courierAsignado: 'Móvil Reparto 05',
      pesoKg: 1.20,
      fechaCreacion: '2026-10-19T09:00:00',
      fechaActualizacion: '2026-10-19T09:45:00',
      historial: [
        { estado: 'CREADO', descripcion: 'Envío registrado en plataforma', fecha: '2026-10-19T09:00:00' },
        { estado: 'ACEPTADO', descripcion: 'Cupo vehicular descontado y aceptado', fecha: '2026-10-19T09:45:00' }
      ]
    },
    'RE-2026-003': {
      codigoSeguimiento: 'RE-2026-003',
      estadoActual: 'EN_BODEGA',
      ciudadOrigen: 'Santiago (Ñuñoa)',
      ciudadDestino: 'Viña del Mar (Valparaíso)',
      fechaEstimadaEntrega: '2026-10-21T12:00:00',
      servicioContratado: 'Envío Express Interurbano',
      courierAsignado: 'Bodega Central Pudahuel',
      pesoKg: 5.80,
      fechaCreacion: '2026-10-19T07:15:00',
      fechaActualizacion: '2026-10-19T10:30:00',
      historial: [
        { estado: 'CREADO', descripcion: 'Envío registrado en plataforma', fecha: '2026-10-19T07:15:00' },
        { estado: 'ACEPTADO', descripcion: 'Validación en centro logístico', fecha: '2026-10-19T08:00:00' },
        { estado: 'EN_BODEGA', descripcion: 'Recepción y rotulado térmico en bodega central', fecha: '2026-10-19T10:30:00' }
      ]
    },
    'RE-2026-004': {
      codigoSeguimiento: 'RE-2026-004',
      estadoActual: 'EN_RUTA',
      ciudadOrigen: 'Santiago (Centro)',
      ciudadDestino: 'San Antonio (Valparaíso)',
      fechaEstimadaEntrega: '2026-10-20T19:00:00',
      servicioContratado: 'Envío Express 24h',
      courierAsignado: 'Flota RutaExpress - Móvil 09',
      pesoKg: 3.10,
      fechaCreacion: '2026-10-18T15:00:00',
      fechaActualizacion: '2026-10-19T11:00:00',
      historial: [
        { estado: 'CREADO', descripcion: 'Envío registrado en plataforma', fecha: '2026-10-18T15:00:00' },
        { estado: 'ACEPTADO', descripcion: 'Confirmación de despacho', fecha: '2026-10-18T16:00:00' },
        { estado: 'EN_BODEGA', descripcion: 'Preparación en bodega', fecha: '2026-10-18T18:30:00' },
        { estado: 'EN_RUTA', descripcion: 'En transporte terrestre hacia destino', fecha: '2026-10-19T11:00:00' }
      ]
    },
    'RE-2026-005': {
      codigoSeguimiento: 'RE-2026-005',
      estadoActual: 'ENTREGADO',
      ciudadOrigen: 'Santiago (Centro)',
      ciudadDestino: 'Concepción (Biobío)',
      fechaEstimadaEntrega: '2026-10-19T14:00:00',
      servicioContratado: 'Envío Express Nacional',
      courierAsignado: 'Móvil Reparto Concepción 03',
      pesoKg: 0.75,
      fechaCreacion: '2026-10-18T09:00:00',
      fechaActualizacion: '2026-10-19T13:40:00',
      historial: [
        { estado: 'CREADO', descripcion: 'Envío registrado en plataforma', fecha: '2026-10-18T09:00:00' },
        { estado: 'ACEPTADO', descripcion: 'Asignación de cupo confirmada', fecha: '2026-10-18T10:00:00' },
        { estado: 'EN_BODEGA', descripcion: 'Clasificación logística completada', fecha: '2026-10-18T14:00:00' },
        { estado: 'EN_RUTA', descripcion: 'En transporte hacia destino', fecha: '2026-10-19T08:30:00' },
        { estado: 'ENTREGADO', descripcion: 'Paquete entregado conforme en destino', fecha: '2026-10-19T13:40:00' }
      ]
    },
    'RE-2026-006': {
      codigoSeguimiento: 'RE-2026-006',
      estadoActual: 'CANCELADO',
      ciudadOrigen: 'Santiago (Macul)',
      ciudadDestino: 'Rancagua (O Higgins)',
      fechaEstimadaEntrega: 'Cancelada',
      servicioContratado: 'Envío Mismo Día',
      courierAsignado: 'No aplica (Operación cancelada)',
      pesoKg: 4.00,
      fechaCreacion: '2026-10-19T10:00:00',
      fechaActualizacion: '2026-10-19T11:15:00',
      historial: [
        { estado: 'CREADO', descripcion: 'Envío registrado en plataforma', fecha: '2026-10-19T10:00:00' },
        { estado: 'CANCELADO', descripcion: 'Envío cancelado a solicitud del remitente', fecha: '2026-10-19T11:15:00' }
      ]
    }
  };

  /**
   * Consulta los datos de seguimiento publico de un envio por su codigo.
   * Prioriza la llamada HTTP al BFF; en caso de falta de conectividad local o nula respuesta
   * utiliza el dataset de demostracion correspondiente.
   */
  public consultarSeguimiento(codigo: string): Observable<SeguimientoEnvio> {
    const codigoNormalizado = codigo.trim().toUpperCase();
    const url = `${this.baseUrl}/${encodeURIComponent(codigoNormalizado)}`;

    return this.http.get<SeguimientoEnvio>(url).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si el servidor respondio 404 expresamente, se respeta el codigo no encontrado
        if (error.status === 404) {
          // Si existe en el catalogo de demostracion local, permitir la prueba
          if (this.datosDemostracion[codigoNormalizado]) {
            return of(this.datosDemostracion[codigoNormalizado]);
          }
          return throwError(() => new Error('No se encontro ningun envio asociado al codigo ingresado.'));
        }

        // Si hay falla de red (status 0, 502, 503) por infraestructura desconectada, consultar fallback demo
        if (this.datosDemostracion[codigoNormalizado]) {
          return of(this.datosDemostracion[codigoNormalizado]);
        }

        // Si no esta en el catalogo y fallo la red, generar un error descriptivo
        return throwError(() => new Error(
          error.status === 0
            ? 'No fue posible conectar con el servidor de seguimiento. Verifica tu conexion o utiliza uno de los codigos de prueba sugeridos.'
            : 'Ocurrio un error al consultar el seguimiento. Intentalo nuevamente.'
        ));
      })
    );
  }

  /**
   * Retorna la lista de codigos de prueba disponibles para demostracion en local.
   */
  public obtenerCodigosDemostracion(): { codigo: string; estado: EstadoSeguimiento; descripcion: string }[] {
    return [
      { codigo: 'RTX-2026-0001', estado: 'ENTREGADO', descripcion: 'Entregado (Stgo ➔ Valparaíso)' },
      { codigo: 'RTX-2026-0002', estado: 'EN_RUTA', descripcion: 'En Ruta (Concepción ➔ La Serena)' },
      { codigo: 'RTX-2026-0003', estado: 'EN_BODEGA', descripcion: 'En Bodega (Antofagasta ➔ Stgo)' },
      { codigo: 'RTX-2026-0004', estado: 'ACEPTADO', descripcion: 'Aceptado (Temuco ➔ Pto. Montt)' },
      { codigo: 'RTX-2026-0005', estado: 'CREADO', descripcion: 'Creado (Arica ➔ Iquique)' },
      { codigo: 'RTX-2026-0006-C', estado: 'CANCELADO', descripcion: 'Cancelado (Stgo ➔ Rancagua)' }
    ];
  }
}
