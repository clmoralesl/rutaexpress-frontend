import { NotificationService } from '../../shared/feedback/notification.service';
import { SkeletonComponent } from '../../shared/feedback/skeleton.component';
import { EmptyStateComponent } from '../../shared/feedback/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/feedback/confirm-dialog.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import {
  Comuna,
  CrearEnvioRequest,
  Envio,
  EnviosService,
  FiltrosEnvios,
  Region
} from '../../core/services/envios.service';
import { SesionService } from '../../core/auth/sesion.service';
import { EtiquetaModalComponent } from './components/etiqueta-modal/etiqueta-modal.component';

@Component({
  selector: 'app-shipments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SkeletonComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    EtiquetaModalComponent
  ],
  templateUrl: './shipments.html',
  styleUrl: './shipments.css'
})
export class Shipments implements OnInit {

  envios: Envio[] = [];
  regiones: Region[] = [];
  comunasOrigen: Comuna[] = [];
  comunasDestino: Comuna[] = [];

  confirmacionVisible = false;
  envioPendiente: Envio | null = null;
  estadoPendiente = '';
  cargando = false;
  cargandoRegiones = false;
  creandoEnvio = false;
  codigoCreadoReciente = '';
  error = '';
  mensaje = '';

  etiquetaModalVisible = false;
  envioSeleccionadoEtiqueta: Envio | null = null;
  encoladoRabbitMQ = false;

  estado = '';
  fechaDesde = '';
  fechaHasta = '';

  readonly estados = [
    'CREADO',
    'ACEPTADO',
    'EN_BODEGA',
    'EN_RUTA',
    'ENTREGADO',
    'CANCELADO'
  ];

  readonly transiciones: Record<string, string[]> = {
    CREADO: ['ACEPTADO', 'CANCELADO'],
    ACEPTADO: ['EN_BODEGA', 'CANCELADO'],
    EN_BODEGA: ['EN_RUTA', 'CANCELADO'],
    EN_RUTA: ['ENTREGADO'],
    ENTREGADO: [],
    CANCELADO: []
  };

  formularioEnvio;

  constructor(
    private enviosService: EnviosService,
    private sesionService: SesionService,
    private fb: FormBuilder,
    private notifications: NotificationService
  ) {
    this.formularioEnvio = this.fb.nonNullable.group({
      rutRemitente: ['', Validators.required],
      rutDestinatario: ['', Validators.required],
      pesoKg: [0, [Validators.required, Validators.min(0.01)]],
      origen: this.fb.nonNullable.group({
        idRegion: [0, [Validators.required, Validators.min(1)]],
        idComuna: [0, [Validators.required, Validators.min(1)]],
        calle: ['', [Validators.required, Validators.maxLength(120)]],
        numero: ['', [Validators.required, Validators.maxLength(20)]],
        complemento: ['']
      }),
      destino: this.fb.nonNullable.group({
        idRegion: [0, [Validators.required, Validators.min(1)]],
        idComuna: [0, [Validators.required, Validators.min(1)]],
        calle: ['', [Validators.required, Validators.maxLength(120)]],
        numero: ['', [Validators.required, Validators.maxLength(20)]],
        complemento: ['']
      })
    });
  }

  ngOnInit(): void {
    this.cargarRegiones();
    this.cargarEnvios();
  }

  cargarRegiones(): void {
    this.cargandoRegiones = true;
    this.enviosService.obtenerRegiones().subscribe({
      next: (regiones) => {
        this.regiones = regiones;
        this.cargandoRegiones = false;
      },
      error: () => {
        this.cargandoRegiones = false;
        this.notifications.warning('No fue posible cargar el catálogo de regiones.');
      }
    });
  }

  onRegionOrigenChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const idRegion = Number(select.value);
    const region = this.regiones.find(r => r.idRegion === idRegion);
    this.comunasOrigen = region ? region.comunas : [];
    this.formularioEnvio.controls.origen.controls.idComuna.setValue(0);
  }

  onRegionDestinoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const idRegion = Number(select.value);
    const region = this.regiones.find(r => r.idRegion === idRegion);
    this.comunasDestino = region ? region.comunas : [];
    this.formularioEnvio.controls.destino.controls.idComuna.setValue(0);
  }

  toggleSinNumeroOrigen(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.formularioEnvio.controls.origen.controls.numero.setValue('S/N');
    } else if (this.formularioEnvio.controls.origen.controls.numero.value === 'S/N') {
      this.formularioEnvio.controls.origen.controls.numero.setValue('');
    }
  }

  toggleSinNumeroDestino(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.formularioEnvio.controls.destino.controls.numero.setValue('S/N');
    } else if (this.formularioEnvio.controls.destino.controls.numero.value === 'S/N') {
      this.formularioEnvio.controls.destino.controls.numero.setValue('');
    }
  }

  puedeCrear(): boolean {
    return this.sesionService.tieneRol('ADMIN', 'DESPACHADOR', 'CLIENTE');
  }

  puedeGestionarEstados(): boolean {
    return this.sesionService.tieneRol('ADMIN', 'DESPACHADOR');
  }

  puedeImprimirEtiqueta(): boolean {
    return this.sesionService.tieneRol('ADMIN', 'DESPACHADOR', 'OPERADOR');
  }

  verSoloPropios(): boolean {
    return (
      this.sesionService.tieneRol('CLIENTE') &&
      !this.sesionService.tieneRol('ADMIN', 'DESPACHADOR', 'OPERADOR')
    );
  }

  tituloPagina(): string {
    return this.verSoloPropios() ? 'Mis envíos' : 'Gestión de envíos';
  }

  tituloListado(): string {
    return this.verSoloPropios() ? 'Mis envíos registrados' : 'Listado de envíos';
  }

  mensajeVacio(): string {
    return this.verSoloPropios()
      ? 'Aún no tienes envíos registrados.'
      : 'No hay envíos con estos filtros.';
  }

  obtenerTransiciones(estadoActual: string): string[] {
    return this.transiciones[estadoActual] ?? [];
  }

  cargarEnvios(): void {
    this.cargando = true;
    this.error = '';

    const filtros: FiltrosEnvios = {
      estado: this.estado || undefined,
      fechaDesde: this.fechaDesde || undefined,
      fechaHasta: this.fechaHasta || undefined
    };

    this.enviosService.listar(filtros).subscribe({
      next: (envios) => {
        this.envios = envios;
        this.cargando = false;
      },
      error: (err) => {
        this.envios = [];
        this.cargando = false;
        if (err?.status === 403) {
          this.error = 'No tienes permisos para consultar estos envíos.';
        } else if (err?.status === 404) {
          this.error = 'No se encontraron envíos para el criterio consultado.';
        } else {
          this.error = 'No fue posible cargar los envíos.';
        }
        this.notifications.error(this.error);
      }
    });
  }

  crearEnvio(): void {
    this.error = '';
    this.mensaje = '';

    if (this.formularioEnvio.invalid) {
      this.formularioEnvio.markAllAsTouched();
      this.error = 'Completa correctamente todos los campos obligatorios del envío y las direcciones.';
      this.notifications.warning(this.error);
      return;
    }

    const formVal = this.formularioEnvio.getRawValue();
    const request: CrearEnvioRequest = {
      rutRemitente: formVal.rutRemitente.trim(),
      rutDestinatario: formVal.rutDestinatario.trim(),
      pesoKg: formVal.pesoKg,
      origen: {
        calle: formVal.origen.calle.trim(),
        numero: formVal.origen.numero.trim(),
        complemento: formVal.origen.complemento?.trim() || null,
        idComuna: Number(formVal.origen.idComuna)
      },
      destino: {
        calle: formVal.destino.calle.trim(),
        numero: formVal.destino.numero.trim(),
        complemento: formVal.destino.complemento?.trim() || null,
        idComuna: Number(formVal.destino.idComuna)
      }
    };

    this.creandoEnvio = true;
    this.enviosService.crear(request).subscribe({
      next: (nuevoEnvio) => {
        this.creandoEnvio = false;
        this.codigoCreadoReciente = nuevoEnvio.codigoSeguimiento;
        const msg = `Envío registrado exitosamente. Código institucional asignado: ${nuevoEnvio.codigoSeguimiento}`;
        this.mensaje = msg;
        this.notifications.success(msg);
        this.formularioEnvio.reset({
          rutRemitente: '',
          rutDestinatario: '',
          pesoKg: 0,
          origen: {
            idRegion: 0,
            idComuna: 0,
            calle: '',
            numero: '',
            complemento: ''
          },
          destino: {
            idRegion: 0,
            idComuna: 0,
            calle: '',
            numero: '',
            complemento: ''
          }
        });
        this.comunasOrigen = [];
        this.comunasDestino = [];
        this.cargarEnvios();
      },
      error: (err) => {
        this.creandoEnvio = false;
        const errorMsg = err?.error?.mensaje || 'No fue posible crear el envío.';
        this.notifications.error(errorMsg);
        this.error = errorMsg;
      }
    });
  }

  actualizarEstado(envio: Envio, nuevoEstado: string): void {
    this.envioPendiente = envio;
    this.estadoPendiente = nuevoEstado;
    this.confirmacionVisible = true;
  }

  cancelarCambio(): void {
    this.confirmacionVisible = false;
    this.envioPendiente = null;
  }

  confirmarCambio(): void {
    const envio = this.envioPendiente;
    const nuevoEstado = this.estadoPendiente;
    this.cancelarCambio();
    if (!envio) return;
    this.error = '';
    this.mensaje = '';

    this.enviosService.actualizarEstado(envio.id, nuevoEstado).subscribe({
      next: () => {
        this.mensaje = `Estado actualizado a ${nuevoEstado}.`;
        this.notifications.success(this.mensaje);
        this.cargarEnvios();
      },
      error: () => {
        this.notifications.error('No fue posible actualizar el estado del envío.');
        this.error = 'No fue posible actualizar el estado del envío.';
      }
    });
  }

  limpiarFiltros(): void {
    this.estado = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.cargarEnvios();
  }

  abrirEtiqueta(envio: Envio): void {
    this.envioSeleccionadoEtiqueta = envio;
    this.encoladoRabbitMQ = false;
    this.etiquetaModalVisible = true;

    // Disparar procesamiento asincrono hacia RabbitMQ (cola q.cmd.label)
    this.enviosService.solicitarEtiqueta(envio.id).subscribe({
      next: () => {
        this.encoladoRabbitMQ = true;
        this.notifications.info(`Comando de rotulado para ${envio.codigoSeguimiento} registrado en RabbitMQ.`);
      },
      error: () => {
        this.encoladoRabbitMQ = false;
      }
    });
  }

  cerrarEtiqueta(): void {
    this.etiquetaModalVisible = false;
    this.envioSeleccionadoEtiqueta = null;
  }

  reintentarEncolado(envio: Envio): void {
    this.enviosService.solicitarEtiqueta(envio.id).subscribe({
      next: () => {
        this.encoladoRabbitMQ = true;
        this.notifications.success(`Comando despachado a la cola RabbitMQ.`);
      },
      error: () => {
        this.encoladoRabbitMQ = false;
        this.notifications.warning(`No fue posible reencolar la solicitud en este momento.`);
      }
    });
  }
}
