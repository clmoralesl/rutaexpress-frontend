import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from '../../shared/feedback/notification.service';
import { SkeletonComponent } from '../../shared/feedback/skeleton.component';
import { QrCodeUtil } from '../../shared/utils/qr-code.util';
import {
  EstadoSeguimiento,
  RastreoService,
  SeguimientoEnvio
} from '../../core/services/rastreo.service';

interface PasoDefinicion {
  codigo: EstadoSeguimiento;
  nombre: string;
  subtitulo: string;
}

@Component({
  selector: 'app-rastreo',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './rastreo.component.html',
  styleUrl: './rastreo.component.scss'
})
export class RastreoComponent implements OnInit {

  private readonly rastreoService = inject(RastreoService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  codigo = signal('');
  cargando = signal(false);
  mensajeError = signal('');
  seguimiento = signal<SeguimientoEnvio | null>(null);
  qrSvg = signal<SafeHtml | null>(null);
  urlSeguimiento = signal('');

  readonly pasos: PasoDefinicion[] = [
    { codigo: 'CREADO', nombre: '1. Creado', subtitulo: 'Registro inicial' },
    { codigo: 'ACEPTADO', nombre: '2. Aceptado', subtitulo: 'Cupo confirmado' },
    { codigo: 'EN_BODEGA', nombre: '3. En Bodega', subtitulo: 'Clasificación y QR' },
    { codigo: 'EN_RUTA', nombre: '4. En Ruta', subtitulo: 'En despacho' },
    { codigo: 'ENTREGADO', nombre: '5. Entregado', subtitulo: 'Recepción conforme' }
  ];

  readonly codigosDemostracion = this.rastreoService.obtenerCodigosDemostracion();

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const codigoParam = params.get('codigo');
      if (codigoParam) {
        this.codigo.set(codigoParam);
        this.buscar();
        return;
      }

      this.route.queryParamMap.subscribe(queryParams => {
        const codigoQuery = queryParams.get('codigo');
        if (codigoQuery) {
          this.codigo.set(codigoQuery);
          this.buscar();
        }
      });
    });
  }

  buscar(): void {
    const codigoLimpio = this.codigo().trim().toUpperCase();

    this.mensajeError.set('');
    this.seguimiento.set(null);
    this.qrSvg.set(null);

    if (!codigoLimpio) {
      this.mensajeError.set('Por favor, ingresa un código de seguimiento.');
      return;
    }

    if (!/^[A-Z0-9-]{4,50}$/.test(codigoLimpio)) {
      this.mensajeError.set('El formato del código no es válido. Debe contener entre 4 y 50 caracteres alfanuméricos.');
      return;
    }

    this.cargando.set(true);

    this.rastreoService.consultarSeguimiento(codigoLimpio).subscribe({
      next: (resultado: SeguimientoEnvio) => {
        this.seguimiento.set(resultado);
        this.cargando.set(false);

        // Generar URL publica canonica y Codigo QR vectorial SVG
        const origin = window.location.origin;
        const urlCompleta = `${origin}/rastreo/${encodeURIComponent(resultado.codigoSeguimiento)}`;
        this.urlSeguimiento.set(urlCompleta);

        const svgString = QrCodeUtil.generarSvg(urlCompleta, 190);
        this.qrSvg.set(this.sanitizer.bypassSecurityTrustHtml(svgString));

        // Actualizar URL sin recargar para compartir facilmente
        this.router.navigate(['/rastreo', resultado.codigoSeguimiento], { replaceUrl: true });
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.mensajeError.set(error.message || 'No fue posible consultar el seguimiento. Inténtalo nuevamente.');
      }
    });
  }

  seleccionarEjemplo(codigoEjemplo: string): void {
    this.codigo.set(codigoEjemplo);
    this.buscar();
  }

  copiarEnlace(): void {
    const url = this.urlSeguimiento();
    if (!url) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.notificationService.success('Enlace de seguimiento copiado al portapapeles.');
      }).catch(() => {
        this.copiarFallback(url);
      });
    } else {
      this.copiarFallback(url);
    }
  }

  private copiarFallback(texto: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = texto;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.notificationService.success('Enlace de seguimiento copiado al portapapeles.');
    } catch {
      this.notificationService.error('No se pudo copiar el enlace.');
    }
    document.body.removeChild(textArea);
  }

  imprimir(): void {
    window.print();
  }

  indicePasoActual(): number {
    const seg = this.seguimiento();
    if (!seg || seg.estadoActual === 'CANCELADO') {
      return -1;
    }
    return this.pasos.findIndex(p => p.codigo === seg.estadoActual);
  }

  estaCompletado(indicePaso: number): boolean {
    const actual = this.indicePasoActual();
    return actual >= 0 && actual >= indicePaso;
  }

  esPasoActual(codigoPaso: EstadoSeguimiento): boolean {
    return this.seguimiento()?.estadoActual === codigoPaso;
  }

  obtenerClaseBadge(estado: EstadoSeguimiento): string {
    switch (estado) {
      case 'ENTREGADO':
        return 'badge-exito';
      case 'EN_RUTA':
        return 'badge-progreso';
      case 'EN_BODEGA':
      case 'ACEPTADO':
      case 'CREADO':
        return 'badge-info';
      case 'CANCELADO':
        return 'badge-peligro';
      default:
        return 'badge-neutro';
    }
  }

  obtenerTextoBadge(estado: EstadoSeguimiento): string {
    switch (estado) {
      case 'ENTREGADO': return 'Entregado';
      case 'EN_RUTA': return 'En Ruta';
      case 'EN_BODEGA': return 'En Bodega';
      case 'ACEPTADO': return 'Aceptado';
      case 'CREADO': return 'Creado';
      case 'CANCELADO': return 'Cancelado';
      default: return estado;
    }
  }
}
