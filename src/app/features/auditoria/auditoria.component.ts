import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  AuditoriaService,
  EventoAuditoria,
  FiltrosConsultaAuditoria,
  TimelineEnvio
} from '../../core/services/auditoria.service';
import { EmptyStateComponent } from '../../shared/feedback/empty-state.component';
import { NotificationService } from '../../shared/feedback/notification.service';
import { SkeletonComponent } from '../../shared/feedback/skeleton.component';
import { ToastComponent } from '../../shared/feedback/toast.component';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SkeletonComponent,
    EmptyStateComponent,
    ToastComponent
  ],
  templateUrl: './auditoria.component.html',
  styleUrls: ['./auditoria.component.scss']
})
export class AuditoriaComponent implements OnInit {

  // Modo de visualizacion: 'GLOBAL' para el flujo completo paginado, 'ENVIO' para trazabilidad forense
  readonly modoVista = signal<'GLOBAL' | 'ENVIO'>('GLOBAL');

  // Estado del flujo global
  readonly eventos = signal<EventoAuditoria[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly origenDatos = signal<'ORACLE_DB' | 'CONTINGENCIA'>('CONTINGENCIA');

  // Paginacion
  readonly paginaActual = signal<number>(0);
  readonly tamanoPagina = signal<number>(20);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(1);

  // Filtros de busqueda
  readonly filtroUsuario = signal<string>('');
  readonly filtroEstadoNuevo = signal<string>('TODOS');
  readonly filtroFechaDesde = signal<string>('');
  readonly filtroFechaHasta = signal<string>('');
  readonly busquedaEnvio = signal<string>('');

  // Estado de vista forense por envio especifico
  readonly timelineEnvio = signal<TimelineEnvio | null>(null);
  readonly envioSeleccionadoId = signal<number | null>(null);
  readonly cargandoTimeline = signal<boolean>(false);

  // Control de expansion de detalles tecnicos y visor JSON
  readonly detallesExpandidos = signal<Set<number>>(new Set());
  readonly modoJsonCrudo = signal<Set<number>>(new Set());

  // KPIs computados en tiempo real
  readonly totalEventosKPI = computed(() =>
    this.totalElementos() > 0 ? this.totalElementos() : this.eventos().length
  );

  readonly totalEnviosUnicos = computed(() => {
    const ids = new Set(this.eventos().map(e => e.envioId));
    return ids.size;
  });

  readonly totalUsuariosAuditados = computed(() => {
    const usuarios = new Set(this.eventos().map(e => e.usuarioEmail));
    return usuarios.size;
  });

  readonly totalEntregados = computed(() =>
    this.eventos().filter(e => e.estadoNuevo === 'ENTREGADO').length
  );

  readonly totalCancelados = computed(() =>
    this.eventos().filter(e => e.estadoNuevo === 'CANCELADO').length
  );

  constructor(
    private readonly auditoriaService: AuditoriaService,
    readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Verificar si se paso un parametro de ruta :envioId
    this.route.paramMap.subscribe(params => {
      const envioIdParam = params.get('envioId');
      if (envioIdParam) {
        const id = parseInt(envioIdParam, 10);
        if (!isNaN(id)) {
          this.inspeccionarEnvio(id);
          return;
        }
      }
      this.cargarEventos();
    });
  }

  /**
   * Carga la lista paginada de eventos aplicando los filtros actuales.
   */
  cargarEventos(pagina: number = 0): void {
    this.cargando.set(true);
    this.paginaActual.set(pagina);

    const filtros: FiltrosConsultaAuditoria = {
      usuario: this.filtroUsuario().trim() || undefined,
      fechaDesde: this.filtroFechaDesde() || undefined,
      fechaHasta: this.filtroFechaHasta() || undefined,
      estadoNuevo: this.filtroEstadoNuevo() !== 'TODOS' ? this.filtroEstadoNuevo() : undefined,
      page: pagina,
      size: this.tamanoPagina()
    };

    this.auditoriaService.listarEventos(filtros).subscribe({
      next: respuesta => {
        this.eventos.set(respuesta.content);
        this.totalElementos.set(respuesta.totalElements);
        this.totalPaginas.set(respuesta.totalPages);
        this.origenDatos.set(this.auditoriaService.origenDatos);
        this.cargando.set(false);
      },
      error: () => {
        const fallback = this.auditoriaService.obtenerEventosContingencia();
        this.eventos.set(fallback);
        this.totalElementos.set(fallback.length);
        this.totalPaginas.set(1);
        this.origenDatos.set('CONTINGENCIA');
        this.cargando.set(false);
        this.notificationService.warning('Operando con dataset de contingencia local.');
      }
    });
  }

  /**
   * Limpia todos los filtros y reinicia la consulta en pagina 0.
   */
  limpiarFiltros(): void {
    this.filtroUsuario.set('');
    this.filtroEstadoNuevo.set('TODOS');
    this.filtroFechaDesde.set('');
    this.filtroFechaHasta.set('');
    this.busquedaEnvio.set('');
    this.cargarEventos(0);
  }

  /**
   * Cambia a la inspeccion forense de un envio particular.
   */
  inspeccionarEnvio(envioId: number): void {
    this.modoVista.set('ENVIO');
    this.envioSeleccionadoId.set(envioId);
    this.cargandoTimeline.set(true);

    this.auditoriaService.obtenerTimelinePorEnvio(envioId).subscribe({
      next: timeline => {
        this.timelineEnvio.set(timeline);
        this.origenDatos.set(this.auditoriaService.origenDatos);
        this.cargandoTimeline.set(false);
      },
      error: () => {
        const fallback = this.auditoriaService.obtenerTimelineContingencia(envioId);
        this.timelineEnvio.set(fallback);
        this.origenDatos.set('CONTINGENCIA');
        this.cargandoTimeline.set(false);
      }
    });
  }

  /**
   * Retorna a la vista del flujo global de eventos.
   */
  volverAlFlujoGlobal(): void {
    this.modoVista.set('GLOBAL');
    this.timelineEnvio.set(null);
    this.envioSeleccionadoId.set(null);
    if (this.eventos().length === 0) {
      this.cargarEventos(0);
    }
  }

  /**
   * Ejecuta busqueda rapida de un envio por ID o codigo de seguimiento.
   */
  buscarEnvioPorInput(): void {
    const valor = this.busquedaEnvio().trim();
    if (!valor) return;

    // Si es un numero entero, buscar por envioId directamente
    const posibleId = parseInt(valor, 10);
    if (!isNaN(posibleId) && posibleId.toString() === valor) {
      this.inspeccionarEnvio(posibleId);
      return;
    }

    // Si es un codigo de seguimiento, buscar en los eventos cargados o contingencia
    const eventoEncontrado = this.eventos().find(
      e => e.codigoSeguimiento.toLowerCase() === valor.toLowerCase()
    );

    if (eventoEncontrado) {
      this.inspeccionarEnvio(eventoEncontrado.envioId);
    } else {
      // Buscar en contingencia
      const contingencia = this.auditoriaService.obtenerEventosContingencia();
      const match = contingencia.find(
        e => e.codigoSeguimiento.toLowerCase() === valor.toLowerCase()
      );
      if (match) {
        this.inspeccionarEnvio(match.envioId);
      } else {
        this.notificationService.info(`No se encontro ningun envio con el codigo o ID: ${valor}`);
      }
    }
  }

  /**
   * Alterna la visualizacion expandida de metadatos tecnicos de un evento.
   */
  alternarDetalles(eventoId: number): void {
    const actuales = new Set(this.detallesExpandidos());
    if (actuales.has(eventoId)) {
      actuales.delete(eventoId);
    } else {
      actuales.add(eventoId);
    }
    this.detallesExpandidos.set(actuales);
  }

  /**
   * Alterna entre vista estructurada y visor JSON crudo.
   */
  alternarJsonCrudo(eventoId: number): void {
    const actuales = new Set(this.modoJsonCrudo());
    if (actuales.has(eventoId)) {
      actuales.delete(eventoId);
    } else {
      actuales.add(eventoId);
    }
    this.modoJsonCrudo.set(actuales);
  }

  /**
   * Copia texto al portapapeles con confirmacion en pantalla.
   */
  copiarAlPortapapeles(texto: string, mensajeConfirmacion: string): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(texto).then(() => {
        this.notificationService.success(mensajeConfirmacion);
      });
    }
  }

  /**
   * Determina la clase CSS para el badge de un estado logistico.
   */
  obtenerClaseEstado(estado: string | null): string {
    if (!estado) return 'estado-inicio';
    switch (estado.toUpperCase()) {
      case 'CREADO':
        return 'estado-creado';
      case 'ACEPTADO':
        return 'estado-aceptado';
      case 'EN_BODEGA':
        return 'estado-en-bodega';
      case 'EN_RUTA':
        return 'estado-en-ruta';
      case 'ENTREGADO':
        return 'estado-entregado';
      case 'CANCELADO':
        return 'estado-cancelado';
      default:
        return 'estado-generico';
    }
  }

  /**
   * Retorna una descripcion legible en espanol de un estado logistico.
   */
  obtenerEtiquetaEstado(estado: string | null): string {
    if (!estado) return 'Inicio';
    switch (estado.toUpperCase()) {
      case 'CREADO':
        return 'Creado';
      case 'ACEPTADO':
        return 'Aceptado';
      case 'EN_BODEGA':
        return 'En Bodega';
      case 'EN_RUTA':
        return 'En Ruta';
      case 'ENTREGADO':
        return 'Entregado';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return estado;
    }
  }

  /**
   * Formatea un timestamp ISO a formato legible en espanol sin librerias externas.
   */
  formatearFecha(fechaIso: string): string {
    if (!fechaIso) return 'Sin fecha';
    try {
      const d = new Date(fechaIso);
      if (isNaN(d.getTime())) return fechaIso;

      const opciones: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      return d.toLocaleDateString('es-CL', opciones);
    } catch {
      return fechaIso;
    }
  }

  /**
   * Valida si el evento contiene detalles tecnicos para mostrar.
   */
  tieneDetalles(evento: EventoAuditoria): boolean {
    return !!evento.detalles && Object.keys(evento.detalles).length > 0;
  }

  /**
   * Transforma los campos del mapa de detalles a pares legibles clave-valor.
   */
  obtenerClavesDetalle(evento: EventoAuditoria): { clave: string; etiqueta: string; valor: string }[] {
    if (!this.tieneDetalles(evento)) return [];

    const etiquetasAmigables: Record<string, string> = {
      pesoKg: 'Peso del envio',
      direccionOrigen: 'Direccion de Origen',
      direccionDestino: 'Direccion de Destino',
      rutRemitente: 'RUT Remitente',
      rutDestinatario: 'RUT Destinatario',
      firmaReceptor: 'Firma de Recepcion',
      tiempoTransitoMinutos: 'Tiempo en Transito (minutos)',
      vehiculoAsignado: 'Vehiculo Asignado',
      patente: 'Patente del Vehiculo',
      conductor: 'Conductor Asignado',
      rutaPlanificada: 'Ruta Planificada',
      ubicacionAlmacen: 'Ubicacion en Bodega',
      operadorTurno: 'Operador de Turno',
      temperaturaControlada: 'Temperatura de Control',
      motivoCancelacion: 'Motivo de Cancelacion',
      solicitante: 'Usuario Solicitante',
      penalidadCobrada: 'Penalidad de Cancelacion',
      notificacionClienteEnviada: 'Notificacion al Cliente'
    };

    return Object.entries(evento.detalles).map(([clave, valor]) => {
      let valorFormateado = String(valor);
      if (typeof valor === 'boolean') {
        valorFormateado = valor ? 'Si' : 'No';
      } else if (clave === 'pesoKg') {
        valorFormateado = `${valor} kg`;
      }
      return {
        clave,
        etiqueta: etiquetasAmigables[clave] || clave,
        valor: valorFormateado
      };
    });
  }

  /**
   * Serializa los detalles a formato JSON con sangria limpia.
   */
  obtenerJsonFormateado(evento: EventoAuditoria): string {
    return JSON.stringify(evento.detalles, null, 2);
  }

  /**
   * Determina si el usuario actual posee permisos de administracion o auditoria.
   */
  esAdminOAuditor(): boolean {
    return this.authService.tieneRol('ROLE_ADMIN', 'ROLE_AUDITOR');
  }

  /**
   * Cambia de pagina en la paginacion del flujo global.
   */
  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.cargarEventos(nuevaPagina);
    }
  }
}
