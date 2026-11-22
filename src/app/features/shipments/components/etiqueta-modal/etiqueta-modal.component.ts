import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Envio } from '../../../../core/services/envios.service';
import { generarCodigoBarrasSvg, generarQrSvg } from '../../../../core/utils/etiqueta.util';

@Component({
  selector: 'app-etiqueta-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './etiqueta-modal.component.html',
  styleUrl: './etiqueta-modal.component.scss'
})
export class EtiquetaModalComponent implements OnChanges {

  @Input() visible = false;
  @Input() envio: Envio | null = null;
  @Input() encoladoRabbitMQ = false;

  @Output() cerrar = new EventEmitter<void>();
  @Output() reintentarEncolado = new EventEmitter<Envio>();

  codigoBarrasSvg: SafeHtml | null = null;
  qrSvg: SafeHtml | null = null;
  urlSeguimiento = '';
  fechaEmision = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['envio'] || changes['visible']) && this.envio) {
      this.actualizarGraficosEtiqueta();
    }
  }

  actualizarGraficosEtiqueta(): void {
    if (!this.envio) {
      this.codigoBarrasSvg = null;
      this.qrSvg = null;
      return;
    }

    const codigo = this.envio.codigoSeguimiento || 'RTX-000000';
    this.fechaEmision = new Date().toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const host = typeof window !== 'undefined' ? window.location.origin : 'https://rutaexpress.cl';
    this.urlSeguimiento = `${host}/rastreo/${codigo}`;

    const rawBarcodeSvg = generarCodigoBarrasSvg(codigo, 340, 56, true);
    this.codigoBarrasSvg = this.sanitizer.bypassSecurityTrustHtml(rawBarcodeSvg);

    const rawQrSvg = generarQrSvg(this.urlSeguimiento, 140);
    this.qrSvg = this.sanitizer.bypassSecurityTrustHtml(rawQrSvg);
  }

  obtenerServicioEstimado(): string {
    if (this.envio?.servicioNombre) {
      return this.envio.servicioNombre.toUpperCase();
    }
    if (this.envio && this.envio.pesoKg > 5) {
      return 'EXPRESS CARGA CONSOLIDADA';
    }
    return 'EXPRESS ESTANDAR 24H';
  }

  imprimir(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  solicitarReencolado(): void {
    if (this.envio) {
      this.reintentarEncolado.emit(this.envio);
    }
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }
}
