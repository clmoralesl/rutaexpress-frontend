import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  AceptarEnvioRequest,
  Envio,
  EnviosService
} from '../../../../core/services/envios.service';
import {
  ErrorTraducido,
  traducirErrorHttp
} from '../../../../core/utils/errores-http.util';
import { formatearClp } from '../../../../core/utils/formato.util';
import {
  medidasCompletasONinguna,
  medidasParaEnviar
} from '../../../../core/utils/medidas.validator';

@Component({
  selector: 'app-aceptacion-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './aceptacion-modal.component.html',
  styleUrls: ['./aceptacion-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AceptacionModalComponent implements OnInit, AfterViewInit {
  private readonly enviosService = inject(EnviosService);
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) envio!: Envio;
  @Output() aceptado = new EventEmitter<Envio>();
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('inputPeso') inputPeso?: ElementRef<HTMLInputElement>;

  readonly guardando = signal<boolean>(false);
  readonly envioActualizado = signal<Envio | null>(null);
  readonly errorTraducido = signal<ErrorTraducido | null>(null);

  formulario!: FormGroup;

  ngOnInit(): void {
    const declaradas = this.envio.preregistro?.medidasDeclaradas;

    this.formulario = this.fb.group({
      pesoVerificadoKg: [
        this.envio.pesoKg,
        [Validators.required, Validators.min(0.01), Validators.max(500)]
      ],
      medidas: this.fb.group(
        {
          largoCm: [declaradas?.largoCm ?? null, [Validators.min(1), Validators.max(300), Validators.pattern(/^\d+$/)]],
          anchoCm: [declaradas?.anchoCm ?? null, [Validators.min(1), Validators.max(300), Validators.pattern(/^\d+$/)]],
          altoCm: [declaradas?.altoCm ?? null, [Validators.min(1), Validators.max(300), Validators.pattern(/^\d+$/)]]
        },
        { validators: [medidasCompletasONinguna] }
      ),
      observacion: ['', [Validators.maxLength(500)]]
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.inputPeso?.nativeElement?.focus();
    }, 0);
  }

  @HostListener('window:keydown.escape')
  manejarEscape(): void {
    this.cerrarModal();
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }

  formatearMonto(v: number | undefined | null): string {
    return formatearClp(v || 0);
  }

  calcularDiferenciaEstimadoFinal(): string {
    const act = this.envioActualizado();
    if (!act?.preregistro?.precioFinal || !act?.preregistro?.precioEstimado) {
      return '';
    }
    const finalVal = act.preregistro.precioFinal.totalClp;
    const estVal = act.preregistro.precioEstimado.totalClp;
    const diff = finalVal - estVal;

    if (diff === 0) {
      return 'Sin variación respecto al precio estimado';
    } else if (diff > 0) {
      return `Diferencia de +${this.formatearMonto(diff)} sobre lo estimado`;
    } else {
      return `Diferencia de -${this.formatearMonto(Math.abs(diff))} bajo lo estimado`;
    }
  }

  enviar(): void {
    if (this.guardando()) {
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const formVal = this.formulario.getRawValue();
    const req: AceptarEnvioRequest = {
      pesoVerificadoKg: Number(formVal.pesoVerificadoKg),
      ...medidasParaEnviar(formVal.medidas)
    };

    const obs = formVal.observacion?.trim();
    if (obs) {
      req.observacion = obs;
    }

    this.guardando.set(true);
    this.errorTraducido.set(null);

    this.enviosService.aceptar(this.envio.id, req).subscribe({
      next: (actualizado) => {
        this.guardando.set(false);
        this.envioActualizado.set(actualizado);
        this.aceptado.emit(actualizado);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorTraducido.set(traducirErrorHttp(err, 'aceptacion'));
      }
    });
  }
}
