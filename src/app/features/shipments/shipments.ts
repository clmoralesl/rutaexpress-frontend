import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { SesionService } from '../../core/auth/sesion.service';
import {
  Comuna,
  Envio,
  EnviosService,
  FiltrosEnvios,
  Region
} from '../../core/services/envios.service';
import {
  PublicoService,
  ServicioPublico,
  SucursalPublica
} from '../../core/services/publico.service';
import { formatearClp } from '../../core/utils/formato.util';
import { describirServicio } from '../../core/utils/servicio.util';
import { traducirErrorHttp } from '../../core/utils/errores-http.util';
import { medidasCompletasONinguna } from '../../core/utils/medidas.validator';
import { construirSolicitudPreregistro } from '../../core/utils/preregistro.util';
import { ConfirmDialogComponent } from '../../shared/feedback/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/feedback/empty-state.component';
import { NotificationService } from '../../shared/feedback/notification.service';
import { SkeletonComponent } from '../../shared/feedback/skeleton.component';
import { AyudaPlegableComponent } from '../../shared/components/ayuda-plegable/ayuda-plegable.component';
import { EtiquetaModalComponent } from './components/etiqueta-modal/etiqueta-modal.component';
import { AceptacionModalComponent } from './components/aceptacion-modal/aceptacion-modal.component';

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
    EtiquetaModalComponent,
    AceptacionModalComponent,
    AyudaPlegableComponent
  ],
  templateUrl: './shipments.html',
  styleUrl: './shipments.css'
})
export class Shipments implements OnInit {
  private readonly enviosService = inject(EnviosService);
  private readonly publicoService = inject(PublicoService);
  private readonly sesionService = inject(SesionService);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  envios: Envio[] = [];
  regiones: Region[] = [];
  comunasDestino: Comuna[] = [];
  sucursales: SucursalPublica[] = [];
  servicios: ServicioPublico[] = [];

  confirmacionVisible = false;
  envioPendiente: Envio | null = null;
  estadoPendiente = '';
  cargando = false;
  cargandoCatalogos = false;
  catalogosNoDisponibles = false;
  creandoEnvio = false;
  codigoCreadoReciente = '';
  resumenPreregistroReciente: { codigo: string; sucursal: string; precioEstimado: string } | null = null;
  error = '';
  mensaje = '';

  etiquetaModalVisible = false;
  envioSeleccionadoEtiqueta: Envio | null = null;
  encoladoRabbitMQ = false;

  aceptacionModalVisible = false;
  envioSeleccionadoAceptacion: Envio | null = null;

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
    CREADO: ['CANCELADO'],
    ACEPTADO: ['EN_BODEGA', 'CANCELADO'],
    EN_BODEGA: ['EN_RUTA', 'CANCELADO'],
    EN_RUTA: ['ENTREGADO'],
    ENTREGADO: [],
    CANCELADO: []
  };

  formularioEnvio: FormGroup;

  constructor() {
    this.formularioEnvio = this.fb.group({
      rutRemitente: ['', Validators.required],
      rutDestinatario: ['', Validators.required],
      sucursalOrigenId: [0, [Validators.required, Validators.min(1)]],
      servicioId: [0, [Validators.required, Validators.min(1)]],
      pesoKg: [0, [Validators.required, Validators.min(0.01), Validators.max(500)]],
      medidas: this.fb.group(
        {
          largoCm: [null, [Validators.min(1), Validators.max(300), Validators.pattern(/^\d+$/)]],
          anchoCm: [null, [Validators.min(1), Validators.max(300), Validators.pattern(/^\d+$/)]],
          altoCm: [null, [Validators.min(1), Validators.max(300), Validators.pattern(/^\d+$/)]]
        },
        { validators: [medidasCompletasONinguna] }
      ),
      remitenteEmail: [''],
      destino: this.fb.group({
        idRegion: [0, [Validators.required, Validators.min(1)]],
        idComuna: [0, [Validators.required, Validators.min(1)]],
        calle: ['', [Validators.required, Validators.maxLength(120)]],
        numero: ['', [Validators.required, Validators.maxLength(20)]],
        complemento: ['']
      })
    });
  }

  ngOnInit(): void {
    this.configurarValidacionRemitenteEmail();
    this.cargarCatalogos();
    this.cargarEnvios();
  }

  esPersonal(): boolean {
    return this.sesionService.tieneRol('ADMIN', 'DESPACHADOR');
  }

  configurarValidacionRemitenteEmail(): void {
    const emailControl = this.formularioEnvio.get('remitenteEmail');
    if (this.esPersonal()) {
      emailControl?.setValidators([
        Validators.required,
        Validators.email,
        Validators.maxLength(254)
      ]);
    } else {
      emailControl?.clearValidators();
    }
    emailControl?.updateValueAndValidity();
  }

  cargarCatalogos(): void {
    this.cargandoCatalogos = true;

    this.publicoService.obtenerSucursales().subscribe({
      next: (sucursales) => {
        this.sucursales = sucursales;
      },
      error: () => {
        this.catalogosNoDisponibles = true;
        this.notifications.warning('No fue posible cargar las sucursales de origen.');
      }
    });

    this.publicoService.obtenerServicios().subscribe({
      next: (servicios) => {
        this.servicios = servicios;
        this.evaluarParametroServicio(servicios);
      },
      error: () => {
        this.catalogosNoDisponibles = true;
        this.notifications.warning('No fue posible cargar el catálogo de servicios.');
      }
    });

    this.enviosService.obtenerRegiones().subscribe({
      next: (regiones) => {
        this.regiones = regiones;
        this.cargandoCatalogos = false;
      },
      error: () => {
        this.cargandoCatalogos = false;
        this.notifications.warning('No fue posible cargar el catálogo de regiones.');
      }
    });
  }

  private evaluarParametroServicio(servicios: ServicioPublico[]): void {
    const param = this.route.snapshot.queryParamMap.get('servicioId');
    if (!param) return;

    if (/^\d+$/.test(param.trim())) {
      const id = parseInt(param.trim(), 10);
      if (id > 0 && servicios.some((s) => s.id === id)) {
        this.formularioEnvio.patchValue({ servicioId: id });
      }
    }
  }

  describirServicio(s: ServicioPublico): string {
    return describirServicio(s);
  }

  formatearMonto(monto: number | undefined | null): string {
    return formatearClp(monto || 0);
  }

  mostrarPrecioEnvio(envio: Envio): string {
    if (envio.preregistro?.precioFinal) {
      return this.formatearMonto(envio.preregistro.precioFinal.totalClp);
    }
    if (envio.preregistro?.precioEstimado) {
      return `${this.formatearMonto(envio.preregistro.precioEstimado.totalClp)} (estimado)`;
    }
    return '-';
  }

  onRegionDestinoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const idRegion = Number(select.value);
    const region = this.regiones.find((r) => r.idRegion === idRegion);
    this.comunasDestino = region ? region.comunas : [];
    this.formularioEnvio.get('destino.idComuna')?.setValue(0);
  }

  toggleSinNumeroDestino(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const numControl = this.formularioEnvio.get('destino.numero');
    if (checkbox.checked) {
      numControl?.setValue('S/N');
    } else if (numControl?.value === 'S/N') {
      numControl?.setValue('');
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
      this.error = 'Completa correctamente todos los campos obligatorios del envío.';
      this.notifications.warning(this.error);
      return;
    }

    const formVal = this.formularioEnvio.getRawValue();
    const request = construirSolicitudPreregistro(formVal, this.esPersonal());

    this.creandoEnvio = true;
    this.enviosService.crear(request).subscribe({
      next: (nuevoEnvio) => {
        this.creandoEnvio = false;
        this.codigoCreadoReciente = nuevoEnvio.codigoSeguimiento;

        const sucursalNombre = this.sucursales.find(
          (s) => s.id === Number(formVal.sucursalOrigenId)
        )?.nombre || `Sucursal #${formVal.sucursalOrigenId}`;

        const precioEstTexto = nuevoEnvio.preregistro?.precioEstimado
          ? this.formatearMonto(nuevoEnvio.preregistro.precioEstimado.totalClp)
          : 'Precio estimado no disponible';

        this.resumenPreregistroReciente = {
          codigo: nuevoEnvio.codigoSeguimiento,
          sucursal: sucursalNombre,
          precioEstimado: precioEstTexto
        };

        const msg = `Envío pre-registrado exitosamente. Código asignado: ${nuevoEnvio.codigoSeguimiento}`;
        this.mensaje = msg;
        this.notifications.success(msg);

        this.formularioEnvio.reset({
          rutRemitente: '',
          rutDestinatario: '',
          sucursalOrigenId: 0,
          servicioId: 0,
          pesoKg: 0,
          medidas: { largoCm: null, anchoCm: null, altoCm: null },
          remitenteEmail: '',
          destino: {
            idRegion: 0,
            idComuna: 0,
            calle: '',
            numero: '',
            complemento: ''
          }
        });
        this.comunasDestino = [];
        this.cargarEnvios();
      },
      error: (err) => {
        this.creandoEnvio = false;
        const t = traducirErrorHttp(err, 'preregistro');
        this.error = t.detalles.length > 0 ? `${t.mensaje} ${t.detalles.join(' ')}` : t.mensaje;
        this.notifications.error(this.error);
      }
    });
  }

  abrirAceptacion(envio: Envio): void {
    this.envioSeleccionadoAceptacion = envio;
    this.aceptacionModalVisible = true;
  }

  cerrarAceptacion(): void {
    this.aceptacionModalVisible = false;
    this.envioSeleccionadoAceptacion = null;
  }

  alAceptarEnvio(): void {
    this.cargarEnvios();
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
