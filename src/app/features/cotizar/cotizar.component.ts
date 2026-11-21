import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';

import {
  AVISO_REFERENCIAL,
  CotizacionPublica,
  PublicoService,
  ServicioPublico,
  SucursalPublica
} from '../../core/services/publico.service';
import { Comuna, Region } from '../../core/services/envios.service';
import {
  ErrorTraducido,
  traducirErrorHttp
} from '../../core/utils/errores-http.util';
import { formatearClp } from '../../core/utils/formato.util';
import { describirServicio } from '../../core/utils/servicio.util';
import { medidasCompletasONinguna } from '../../core/utils/medidas.validator';
import { AyudaPlegableComponent } from '../../shared/components/ayuda-plegable/ayuda-plegable.component';

@Component({
  selector: 'app-cotizar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AyudaPlegableComponent
  ],
  templateUrl: './cotizar.component.html',
  styleUrls: ['./cotizar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CotizarComponent implements OnInit {
  private readonly publicoService = inject(PublicoService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly sucursales = signal<SucursalPublica[]>([]);
  readonly servicios = signal<ServicioPublico[]>([]);
  readonly regiones = signal<Region[]>([]);
  readonly comunasDestino = signal<Comuna[]>([]);

  readonly cargando = signal<boolean>(false);
  readonly resultado = signal<CotizacionPublica | null>(null);
  readonly errorTraducido = signal<ErrorTraducido | null>(null);
  readonly segundosEspera = signal<number>(0);

  private cuentaRegresivaSub?: Subscription;

  readonly formulario: FormGroup = this.fb.group({
    sucursalOrigenId: [0, [Validators.required, Validators.min(1)]],
    servicioId: [0, [Validators.required, Validators.min(1)]],
    idRegion: [0, [Validators.required, Validators.min(1)]],
    idComunaDestino: [0, [Validators.required, Validators.min(1)]],
    pesoKg: [null, [Validators.required, Validators.min(0.01), Validators.max(500)]],
    medidas: this.fb.group(
      {
        largoCm: [null, [Validators.min(1), Validators.max(300), Validators.pattern(/^\d+$/)]],
        anchoCm: [null, [Validators.min(1), Validators.max(300), Validators.pattern(/^\d+$/)]],
        altoCm: [null, [Validators.min(1), Validators.max(300), Validators.pattern(/^\d+$/)]]
      },
      { validators: [medidasCompletasONinguna] }
    )
  });

  readonly botonDeshabilitado = computed(() => {
    return this.cargando() || this.segundosEspera() > 0;
  });

  constructor() {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.resultado()) {
          this.resultado.set(null);
        }
        if (this.errorTraducido()) {
          this.errorTraducido.set(null);
        }
      });
  }

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  private cargarDatosIniciales(): void {
    this.publicoService.obtenerSucursales().subscribe({
      next: (data) => this.sucursales.set(data),
      error: (err) => this.errorTraducido.set(traducirErrorHttp(err, 'cotizacion'))
    });

    this.publicoService.obtenerServicios().subscribe({
      next: (listaServicios) => {
        this.servicios.set(listaServicios);
        this.evaluarParametroServicio(listaServicios);
      },
      error: (err) => this.errorTraducido.set(traducirErrorHttp(err, 'cotizacion'))
    });

    this.publicoService.obtenerRegiones().subscribe({
      next: (data) => this.regiones.set(data),
      error: (err) => this.errorTraducido.set(traducirErrorHttp(err, 'cotizacion'))
    });
  }

  private evaluarParametroServicio(lista: ServicioPublico[]): void {
    const param = this.route.snapshot.queryParamMap.get('servicioId');
    if (!param) return;

    if (/^\d+$/.test(param.trim())) {
      const id = parseInt(param.trim(), 10);
      if (id > 0 && lista.some((s) => s.id === id)) {
        this.formulario.patchValue({ servicioId: id });
      }
    }
  }

  onRegionChange(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const region = this.regiones().find((r) => r.idRegion === id);
    this.comunasDestino.set(region ? region.comunas : []);
    this.formulario.patchValue({ idComunaDestino: 0 });
  }

  describirServicio(s: ServicioPublico): string {
    return describirServicio(s);
  }

  formatearMonto(v: number): string {
    return formatearClp(v);
  }

  obtenerAviso(): string {
    const res = this.resultado();
    if (!res) return '';
    return res.aviso && res.aviso.trim() !== '' ? res.aviso : AVISO_REFERENCIAL;
  }

  formatearFechaChile(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  cotizar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const v = this.formulario.getRawValue();
    const consulta = {
      servicioId: Number(v.servicioId),
      sucursalOrigenId: Number(v.sucursalOrigenId),
      idComunaDestino: Number(v.idComunaDestino),
      pesoKg: Number(v.pesoKg),
      largoCm: v.medidas.largoCm ? Number(v.medidas.largoCm) : null,
      anchoCm: v.medidas.anchoCm ? Number(v.medidas.anchoCm) : null,
      altoCm: v.medidas.altoCm ? Number(v.medidas.altoCm) : null
    };

    this.cargando.set(true);
    this.errorTraducido.set(null);

    this.publicoService.cotizar(consulta).subscribe({
      next: (res) => {
        this.cargando.set(false);
        this.resultado.set(res);
      },
      error: (err) => {
        this.cargando.set(false);
        const error = traducirErrorHttp(err, 'cotizacion');
        this.errorTraducido.set(error);
        if (error.reintentarEnSegundos && error.reintentarEnSegundos > 0) {
          this.iniciarCuentaRegresiva(error.reintentarEnSegundos);
        }
      }
    });
  }

  private iniciarCuentaRegresiva(segundos: number): void {
    this.cuentaRegresivaSub?.unsubscribe();
    this.segundosEspera.set(segundos);

    this.cuentaRegresivaSub = interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const actual = this.segundosEspera();
        if (actual <= 1) {
          this.segundosEspera.set(0);
          this.cuentaRegresivaSub?.unsubscribe();
        } else {
          this.segundosEspera.set(actual - 1);
        }
      });
  }
}
