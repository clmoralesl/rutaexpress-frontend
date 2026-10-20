import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  KpisResumen,
  RangoTemporal,
  RendimientoCourier,
  ReportesService,
  TopServicio,
  VolumenHoraItem
} from '../../core/services/reportes.service';
import { EmptyStateComponent } from '../../shared/feedback/empty-state.component';
import { NotificationService } from '../../shared/feedback/notification.service';
import { SkeletonComponent } from '../../shared/feedback/skeleton.component';
import { ToastComponent } from '../../shared/feedback/toast.component';

export interface SegmentoDona {
  estado: string;
  etiqueta: string;
  cantidad: number;
  porcentaje: number;
  color: string;
  pathD: string;
}

export interface PuntoGraficoVolumen {
  x: number;
  y: number;
  barX: number;
  barY: number;
  barWidth: number;
  barHeight: number;
  item: VolumenHoraItem;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SkeletonComponent,
    ToastComponent
  ],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent implements OnInit {

  // Rango de tiempo seleccionado
  readonly rangoSeleccionado = signal<RangoTemporal>('ultimas24h');

  // Estado reactivo principal
  readonly kpis = signal<KpisResumen | null>(null);
  readonly topServicios = signal<TopServicio[]>([]);
  readonly rendimientoCouriers = signal<RendimientoCourier[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly origenDatos = signal<'MOTOR_ANALITICO' | 'CONTINGENCIA'>('CONTINGENCIA');

  // Control interactivo de segmentos
  readonly estadoSeleccionado = signal<string | null>(null);
  readonly puntoSeleccionadoVolumen = signal<VolumenHoraItem | null>(null);

  // Paleta de colores para estados logisticos
  private readonly coloresEstados: Record<string, string> = {
    CREADO: '#94a3b8',
    ACEPTADO: '#38bdf8',
    EN_BODEGA: '#f59e0b',
    EN_RUTA: '#8b5cf6',
    ENTREGADO: '#10b981',
    CANCELADO: '#ef4444'
  };

  // KPIs formateados computados
  readonly leadTimeFormateado = computed(() => {
    const k = this.kpis();
    if (!k || k.leadTimePromedioHoras === null || k.leadTimePromedioHoras === undefined) return '0.0 hrs';
    return `${k.leadTimePromedioHoras.toFixed(1)} hrs`;
  });

  readonly tasaCumplimientoFormateada = computed(() => {
    const k = this.kpis();
    if (!k || k.tasaCumplimiento === null || k.tasaCumplimiento === undefined) return '0.0%';
    return `${k.tasaCumplimiento.toFixed(1)}%`;
  });

  readonly facturacionEstimadaFormateada = computed(() => {
    const k = this.kpis();
    if (!k) return '$0';
    // Estimacion de tarifa promedio de $4.850 por envio entregado
    const totalEstimado = k.totalEntregados * 4850;
    return `$${totalEstimado.toLocaleString('es-CL')}`;
  });

  // Calculo de segmentos para el Grafico 2 (Dona de Distribucion de Estados)
  readonly segmentosDona = computed<SegmentoDona[]>(() => {
    const k = this.kpis();
    if (!k || !k.distribucionPorEstado) return [];

    const estados = Object.entries(k.distribucionPorEstado);
    const total = estados.reduce((sum, [, cant]) => sum + cant, 0);

    if (total === 0) return [];

    const cx = 140;
    const cy = 140;
    const rExterior = 105;
    const rInterior = 62;

    let anguloInicio = -Math.PI / 2;
    const segmentos: SegmentoDona[] = [];

    for (const [estado, cantidad] of estados) {
      if (cantidad <= 0) continue;

      const fraccion = cantidad / total;
      const anguloDelta = fraccion * 2 * Math.PI;
      const anguloFin = anguloInicio + anguloDelta;
      const porcentaje = Number((fraccion * 100).toFixed(1));
      const color = this.coloresEstados[estado.toUpperCase()] || '#cbd5e1';

      let pathD = '';
      // Si un solo estado tiene el 100%
      if (fraccion >= 0.999) {
        pathD = `
          M ${cx} ${cy - rExterior}
          A ${rExterior} ${rExterior} 0 1 1 ${cx} ${cy + rExterior}
          A ${rExterior} ${rExterior} 0 1 1 ${cx} ${cy - rExterior}
          M ${cx} ${cy - rInterior}
          A ${rInterior} ${rInterior} 0 1 0 ${cx} ${cy + rInterior}
          A ${rInterior} ${rInterior} 0 1 0 ${cx} ${cy - rInterior}
          Z
        `;
      } else {
        const x1Ext = cx + rExterior * Math.cos(anguloInicio);
        const y1Ext = cy + rExterior * Math.sin(anguloInicio);
        const x2Ext = cx + rExterior * Math.cos(anguloFin);
        const y2Ext = cy + rExterior * Math.sin(anguloFin);

        const x1Int = cx + rInterior * Math.cos(anguloFin);
        const y1Int = cy + rInterior * Math.sin(anguloFin);
        const x2Int = cx + rInterior * Math.cos(anguloInicio);
        const y2Int = cy + rInterior * Math.sin(anguloInicio);

        const largeArc = anguloDelta > Math.PI ? 1 : 0;

        pathD = `
          M ${x1Ext.toFixed(2)} ${y1Ext.toFixed(2)}
          A ${rExterior} ${rExterior} 0 ${largeArc} 1 ${x2Ext.toFixed(2)} ${y2Ext.toFixed(2)}
          L ${x1Int.toFixed(2)} ${y1Int.toFixed(2)}
          A ${rInterior} ${rInterior} 0 ${largeArc} 0 ${x2Int.toFixed(2)} ${y2Int.toFixed(2)}
          Z
        `;
      }

      segmentos.push({
        estado,
        etiqueta: this.obtenerEtiquetaEstado(estado),
        cantidad,
        porcentaje,
        color,
        pathD
      });

      anguloInicio = anguloFin;
    }

    return segmentos;
  });

  // Calculo de puntos, barras y curva para Grafico 1 (Volumen de Envíos por Hora)
  readonly datosGraficoVolumen = computed(() => {
    const k = this.kpis();
    if (!k || !k.volumenPorHora || k.volumenPorHora.length === 0) {
      return {
        puntos: [],
        pathLinea: '',
        pathArea: '',
        maxValor: 10,
        lineasGuia: [
          { valor: 10, y: 20 },
          { valor: 5, y: 112 },
          { valor: 0, y: 205 }
        ]
      };
    }

    const items = k.volumenPorHora;
    const maxCant = Math.max(...items.map(i => i.cantidad), 5);
    // Redondear maxValor al siguiente multiplo superior para escala limpia
    const maxValor = Math.ceil(maxCant * 1.15);

    const anchoTotal = 620;
    const altoTotal = 240;
    const padIzq = 45;
    const padDer = 20;
    const padSup = 20;
    const padInf = 35;

    const anchoGrafico = anchoTotal - padIzq - padDer;
    const altoGrafico = altoTotal - padSup - padInf;
    const pasoX = items.length > 1 ? anchoGrafico / (items.length - 1) : anchoGrafico / 2;

    const puntos: PuntoGraficoVolumen[] = items.map((item, index) => {
      const x = padIzq + (items.length > 1 ? index * pasoX : anchoGrafico / 2);
      const ratioY = item.cantidad / maxValor;
      const y = altoTotal - padInf - ratioY * altoGrafico;

      const barWidth = Math.max(8, Math.min(24, pasoX * 0.45));
      const barHeight = ratioY * altoGrafico;
      const barX = x - barWidth / 2;
      const barY = altoTotal - padInf - barHeight;

      return {
        x,
        y,
        barX,
        barY,
        barWidth,
        barHeight,
        item
      };
    });

    // Construccion de curva suave Bézier
    let pathLinea = '';
    let pathArea = '';

    if (puntos.length > 0) {
      pathLinea = `M ${puntos[0].x.toFixed(1)} ${puntos[0].y.toFixed(1)}`;
      for (let i = 0; i < puntos.length - 1; i++) {
        const pActual = puntos[i];
        const pSiguiente = puntos[i + 1];
        const cx1 = pActual.x + (pSiguiente.x - pActual.x) / 2;
        const cy1 = pActual.y;
        const cx2 = cx1;
        const cy2 = pSiguiente.y;
        pathLinea += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${pSiguiente.x.toFixed(1)} ${pSiguiente.y.toFixed(1)}`;
      }

      const yBase = altoTotal - padInf;
      pathArea = `${pathLinea} L ${puntos[puntos.length - 1].x.toFixed(1)} ${yBase} L ${puntos[0].x.toFixed(1)} ${yBase} Z`;
    }

    const lineasGuia = [
      { valor: maxValor, y: padSup },
      { valor: Math.round(maxValor / 2), y: padSup + altoGrafico / 2 },
      { valor: 0, y: altoTotal - padInf }
    ];

    return {
      puntos,
      pathLinea,
      pathArea,
      maxValor,
      lineasGuia
    };
  });

  constructor(
    private readonly reportesService: ReportesService,
    readonly authService: AuthService,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.cargarReportes(this.rangoSeleccionado());
  }

  /**
   * Carga los datos analiticos sincronizados segun el rango temporal seleccionado.
   */
  cargarReportes(rango: RangoTemporal): void {
    this.cargando.set(true);
    this.rangoSeleccionado.set(rango);

    this.reportesService.obtenerKpis(rango).subscribe({
      next: kpis => {
        this.kpis.set(kpis);
        this.origenDatos.set(this.reportesService.origenDatos);
        this.cargando.set(false);
      },
      error: () => {
        this.kpis.set(this.reportesService.obtenerKpisContingencia(rango));
        this.origenDatos.set('CONTINGENCIA');
        this.cargando.set(false);
      }
    });

    this.reportesService.obtenerTopServicios(rango).subscribe({
      next: top => this.topServicios.set(top),
      error: () => this.topServicios.set(this.reportesService.obtenerTopServiciosContingencia())
    });

    this.reportesService.obtenerRendimientoCouriers().subscribe({
      next: couriers => this.rendimientoCouriers.set(couriers),
      error: () => this.rendimientoCouriers.set(this.reportesService.obtenerRendimientoCouriersContingencia())
    });
  }

  /**
   * Cambia el rango temporal activo y refresca las visualizaciones.
   */
  cambiarRango(nuevoRango: RangoTemporal): void {
    if (this.rangoSeleccionado() !== nuevoRango) {
      this.cargarReportes(nuevoRango);
    }
  }

  /**
   * Retorna una etiqueta amigable en espanol del rango temporal.
   */
  obtenerEtiquetaRango(rango: RangoTemporal): string {
    switch (rango) {
      case 'ultimas24h':
        return 'Ultimas 24 Horas';
      case 'ultimos7dias':
        return 'Ultimos 7 Dias';
      case 'ultimomes':
        return 'Ultimo Mes';
      case 'historico':
        return 'Historico / Todo';
      default:
        return rango;
    }
  }

  /**
   * Retorna una etiqueta amigable en espanol del estado logistico.
   */
  obtenerEtiquetaEstado(estado: string): string {
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
   * Obtiene el color representativo de un estado logistico.
   */
  obtenerColorEstado(estado: string): string {
    return this.coloresEstados[estado.toUpperCase()] || '#94a3b8';
  }

  /**
   * Valida si el usuario actual posee permisos de visualizacion analitica o gerencial.
   */
  esAdminOOperador(): boolean {
    return this.authService.tieneRol('ROLE_ADMIN', 'ROLE_AUDITOR', 'ROLE_OPERADOR');
  }
}
