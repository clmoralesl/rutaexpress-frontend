import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  ActualizarServicioDto,
  CatalogoService,
  CotizacionResultado,
  CrearServicioDto,
  ServicioCatalogo
} from '../../core/services/catalogo.service';
import { EmptyStateComponent } from '../../shared/feedback/empty-state.component';
import { NotificationService } from '../../shared/feedback/notification.service';
import { SkeletonComponent } from '../../shared/feedback/skeleton.component';
import { ToastComponent } from '../../shared/feedback/toast.component';

@Component({
  selector: 'app-catalogo',
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
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.scss']
})
export class CatalogoComponent implements OnInit {

  // Estado reactivo principal
  readonly servicios = signal<ServicioCatalogo[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly guardando = signal<boolean>(false);
  readonly origenDatos = signal<'ORACLE_DB' | 'CONTINGENCIA'>('CONTINGENCIA');

  // Filtros de busqueda y exploracion
  readonly terminoBusqueda = signal<string>('');
  readonly filtroVehiculo = signal<string>('TODOS');
  readonly filtroEstado = signal<string>('TODOS');

  // Modal reactivo de creacion / edicion
  readonly modalVisible = signal<boolean>(false);
  readonly modoEdicion = signal<boolean>(false);
  readonly servicioEnEdicionId = signal<number | null>(null);
  servicioForm!: FormGroup;

  // Tarifador interactivo
  readonly cotizacionServicioId = signal<number>(1);
  readonly cotizacionPeso = signal<number>(2.5);
  readonly cotizacionLargo = signal<number | null>(null);
  readonly cotizacionAncho = signal<number | null>(null);
  readonly cotizacionAlto = signal<number | null>(null);
  readonly incluirDimensiones = signal<boolean>(false);

  // KPIs calculados
  readonly totalServiciosActivos = computed(() =>
    this.servicios().filter(s => s.activo).length
  );

  readonly capacidadTotalRed = computed(() =>
    this.servicios().reduce((acc, s) => acc + (s.activo ? s.capacidadMaximaDiaria : 0), 0)
  );

  readonly cuposDisponiblesTotales = computed(() =>
    this.servicios().reduce((acc, s) => acc + (s.activo ? s.capacidadDisponible : 0), 0)
  );

  readonly cuposOcupadosTotales = computed(() =>
    this.capacidadTotalRed() - this.cuposDisponiblesTotales()
  );

  readonly porcentajeDisponibilidadGlobal = computed(() => {
    const total = this.capacidadTotalRed();
    return total > 0 ? Number(((this.cuposDisponiblesTotales() / total) * 100).toFixed(1)) : 0;
  });

  // Lista filtrada reactiva
  readonly serviciosFiltrados = computed(() => {
    const termino = this.terminoBusqueda().trim().toLowerCase();
    const vehiculo = this.filtroVehiculo();
    const estado = this.filtroEstado();

    return this.servicios().filter(servicio => {
      const coincideTermino =
        !termino ||
        servicio.codigo.toLowerCase().includes(termino) ||
        servicio.nombre.toLowerCase().includes(termino) ||
        servicio.descripcion.toLowerCase().includes(termino);

      const coincideVehiculo =
        vehiculo === 'TODOS' || servicio.tipoVehiculo === vehiculo;

      const coincideEstado =
        estado === 'TODOS' ||
        (estado === 'ACTIVO' && servicio.activo) ||
        (estado === 'INACTIVO' && !servicio.activo);

      return coincideTermino && coincideVehiculo && coincideEstado;
    });
  });

  // Cotizacion reactiva en tiempo real
  readonly cotizacionActual = computed<CotizacionResultado | null>(() => {
    const sId = this.cotizacionServicioId();
    const peso = this.cotizacionPeso();
    const largo = this.incluirDimensiones() ? this.cotizacionLargo() ?? undefined : undefined;
    const ancho = this.incluirDimensiones() ? this.cotizacionAncho() ?? undefined : undefined;
    const alto = this.incluirDimensiones() ? this.cotizacionAlto() ?? undefined : undefined;

    return this.catalogoService.calcularCotizacion(
      {
        servicioId: sId,
        pesoKg: peso,
        largoCm: largo,
        anchoCm: ancho,
        altoCm: alto
      },
      this.servicios()
    );
  });

  constructor(
    private readonly catalogoService: CatalogoService,
    readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly fb: FormBuilder
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    // Carga inicial inmediata con contingencia para evitar estado vacio mientras responde el servidor
    this.servicios.set(this.catalogoService.obtenerServiciosContingencia());
    this.actualizarServicioCotizacionPorDefecto();
    this.cargarServicios();
  }

  private inicializarFormulario(): void {
    this.servicioForm = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(50)]],
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      tipoVehiculo: ['FURGON', [Validators.required]],
      tarifaBase: [3000, [Validators.required, Validators.min(0)]],
      precioPorKg: [500, [Validators.required, Validators.min(0)]],
      capacidadMaximaDiaria: [50, [Validators.required, Validators.min(1)]],
      activo: [true]
    });
  }

  cargarServicios(): void {
    this.cargando.set(true);
    this.catalogoService.listarServicios().subscribe({
      next: lista => {
        if (lista && lista.length > 0) {
          this.servicios.set(lista);
          this.origenDatos.set('ORACLE_DB');
        } else {
          this.servicios.set(this.catalogoService.obtenerServiciosContingencia());
          this.origenDatos.set('CONTINGENCIA');
        }
        this.cargando.set(false);
        this.actualizarServicioCotizacionPorDefecto();
      },
      error: () => {
        this.servicios.set(this.catalogoService.obtenerServiciosContingencia());
        this.origenDatos.set('CONTINGENCIA');
        this.cargando.set(false);
        this.actualizarServicioCotizacionPorDefecto();
        this.notificationService.error('No fue posible sincronizar el catalogo con el servidor. Se cargaron datos de contingencia.');
      }
    });
  }

  private actualizarServicioCotizacionPorDefecto(): void {
    const lista = this.servicios();
    if (lista.length > 0 && !lista.some(s => s.id === this.cotizacionServicioId())) {
      this.cotizacionServicioId.set(lista[0].id);
    }
  }

  esAdmin(): boolean {
    return this.authService.tieneRol('ROLE_ADMIN');
  }

  calcularPorcentajeDisponible(servicio: ServicioCatalogo): number {
    if (!servicio.capacidadMaximaDiaria || servicio.capacidadMaximaDiaria <= 0) {
      return 0;
    }
    return Number(((servicio.capacidadDisponible / servicio.capacidadMaximaDiaria) * 100).toFixed(0));
  }

  obtenerNivelCapacidad(servicio: ServicioCatalogo): 'normal' | 'advertencia' | 'critica' {
    const porcentaje = this.calcularPorcentajeDisponible(servicio);
    if (porcentaje < 20) {
      return 'critica';
    }
    if (porcentaje < 40) {
      return 'advertencia';
    }
    return 'normal';
  }

  abrirModalCrear(): void {
    if (!this.esAdmin()) {
      this.notificationService.warning('Accion restringida: Se requiere rol de Administrador (ROLE_ADMIN) para crear servicios.');
      return;
    }

    this.modoEdicion.set(false);
    this.servicioEnEdicionId.set(null);
    this.servicioForm.reset({
      codigo: '',
      nombre: '',
      descripcion: '',
      tipoVehiculo: 'FURGON',
      tarifaBase: 3000,
      precioPorKg: 500,
      capacidadMaximaDiaria: 50,
      activo: true
    });
    this.servicioForm.get('codigo')?.enable();
    this.modalVisible.set(true);
  }

  abrirModalEditar(servicio: ServicioCatalogo): void {
    if (!this.esAdmin()) {
      this.notificationService.warning('Accion restringida: Se requiere rol de Administrador (ROLE_ADMIN) para editar tarifas o servicios.');
      return;
    }

    this.modoEdicion.set(true);
    this.servicioEnEdicionId.set(servicio.id);
    this.servicioForm.patchValue({
      codigo: servicio.codigo,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      tipoVehiculo: servicio.tipoVehiculo,
      tarifaBase: servicio.tarifaBase,
      precioPorKg: servicio.precioPorKg,
      capacidadMaximaDiaria: servicio.capacidadMaximaDiaria,
      activo: servicio.activo
    });
    this.servicioForm.get('codigo')?.disable();
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.servicioForm.reset();
  }

  guardarServicio(): void {
    if (this.servicioForm.invalid) {
      this.servicioForm.markAllAsTouched();
      this.notificationService.error('Revise los campos obligatorios del formulario.');
      return;
    }

    this.guardando.set(true);
    const formVal = this.servicioForm.getRawValue();

    if (this.modoEdicion()) {
      const id = this.servicioEnEdicionId()!;
      const dto: ActualizarServicioDto = {
        nombre: formVal.nombre,
        descripcion: formVal.descripcion,
        tipoVehiculo: formVal.tipoVehiculo,
        tarifaBase: formVal.tarifaBase,
        precioPorKg: formVal.precioPorKg,
        capacidadMaximaDiaria: formVal.capacidadMaximaDiaria,
        activo: formVal.activo
      };

      this.catalogoService.actualizarServicio(id, dto).subscribe({
        next: actualizado => {
          this.guardando.set(false);
          this.cerrarModal();
          this.notificationService.success(`Servicio "${actualizado.nombre}" actualizado exitosamente.`);
          this.cargarServicios();
        },
        error: err => {
          this.guardando.set(false);
          this.notificationService.error(err.message || 'Error al actualizar el servicio.');
        }
      });
    } else {
      const dto: CrearServicioDto = {
        codigo: formVal.codigo,
        nombre: formVal.nombre,
        descripcion: formVal.descripcion,
        tipoVehiculo: formVal.tipoVehiculo,
        tarifaBase: formVal.tarifaBase,
        precioPorKg: formVal.precioPorKg,
        capacidadMaximaDiaria: formVal.capacidadMaximaDiaria
      };

      this.catalogoService.crearServicio(dto).subscribe({
        next: creado => {
          this.guardando.set(false);
          this.cerrarModal();
          this.notificationService.success(`Servicio "${creado.nombre}" incorporado al catalogo.`);
          this.cargarServicios();
        },
        error: err => {
          this.guardando.set(false);
          this.notificationService.error(err.message || 'Error al crear el servicio.');
        }
      });
    }
  }

  seleccionarServicioParaCotizar(servicio: ServicioCatalogo): void {
    this.cotizacionServicioId.set(servicio.id);
    const elemento = document.getElementById('seccion-tarifador');
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' });
    }
    this.notificationService.info(`Servicio "${servicio.nombre}" seleccionado en la calculadora de cotizaciones.`);
  }

  ajustarPeso(incremento: number): void {
    const actual = this.cotizacionPeso();
    const nuevo = Math.max(0.1, Number((actual + incremento).toFixed(1)));
    this.cotizacionPeso.set(nuevo);
  }

  fijarPeso(peso: number): void {
    this.cotizacionPeso.set(peso);
  }

  copiarCotizacion(): void {
    const cot = this.cotizacionActual();
    if (!cot) return;

    const texto = [
      `--- COTIZACION RUTAEXPRESS ---`,
      `Servicio: ${cot.servicio.nombre} (${cot.servicio.tipoVehiculo})`,
      `Peso Facturado: ${cot.pesoFacturadoKg} kg`,
      cot.pesoVolumetricoKg > 0 ? `(Real: ${cot.pesoRealKg} kg | Volumetrico: ${cot.pesoVolumetricoKg} kg)` : '',
      `Tarifa Base: ${this.formatearMoneda(cot.tarifaBase)}`,
      `Recargo por Kilo: ${this.formatearMoneda(cot.costoVariablePeso)}`,
      `TOTAL ESTIMADO: ${this.formatearMoneda(cot.costoTotalEstimado)}`,
      `Disponibilidad: ${cot.servicio.capacidadDisponible > 0 ? 'Cupos Disponibles' : 'Capacidad Agotada'}`
    ].filter(Boolean).join('\n');

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(texto).then(() => {
        this.notificationService.success('Detalle de cotizacion copiado al portapapeles.');
      });
    }
  }

  formatearMoneda(monto: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(monto || 0);
  }

  obtenerEtiquetaVehiculo(tipo: string): string {
    switch (tipo?.toUpperCase()) {
      case 'MOTO':
        return 'Motocicleta Urbana';
      case 'FURGON':
        return 'Furgon Utilitario';
      case 'CAMION':
        return 'Camion de Carga';
      case 'BICICLETA':
        return 'Ciclo Reparto';
      default:
        return tipo || 'Vehiculo Estandar';
    }
  }
}
