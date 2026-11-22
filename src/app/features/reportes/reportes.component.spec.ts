import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ReportesComponent } from './reportes.component';
import {
  KpisResumen,
  RendimientoCourier,
  ReportesService,
  TopServicio
} from '../../core/services/reportes.service';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../shared/feedback/notification.service';

describe('ReportesComponent', () => {
  let component: ReportesComponent;
  let fixture: ComponentFixture<ReportesComponent>;
  let reportesService: jasmine.SpyObj<ReportesService>;
  let authService: jasmine.SpyObj<AuthService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockKpis: KpisResumen = {
    leadTimePromedioHoras: 5.26,
    tasaCumplimiento: 97.4,
    totalEnvios: 8,
    totalActivos: 6,
    totalEntregados: 2,
    totalCancelados: 0,
    distribucionPorEstado: {
      CREADO: 5,
      ACEPTADO: 1,
      EN_BODEGA: 0,
      EN_RUTA: 0,
      ENTREGADO: 2,
      CANCELADO: 0
    },
    volumenPorHora: [
      { hora: '14:00', cantidad: 5 },
      { hora: '17:00', cantidad: 3 }
    ]
  };

  const mockTopServicios: TopServicio[] = [
    { servicioNombre: 'Envio Express 24 Horas', cantidadEnvios: 5, porcentajeTotal: 62.5 },
    { servicioNombre: 'Envio Estandar 48-72 Horas', cantidadEnvios: 3, porcentajeTotal: 37.5 }
  ];

  const mockRendimiento: RendimientoCourier[] = [
    {
      usuarioEmail: 'courier_santiago@rutaexpress.cl',
      usuarioRol: 'COURIER',
      totalGestionados: 12,
      totalEntregados: 11,
      totalCancelados: 1,
      tasaEfectividad: 91.7
    }
  ];

  beforeEach(async () => {
    const repSpy = jasmine.createSpyObj('ReportesService', [
      'obtenerKpis',
      'obtenerTopServicios',
      'obtenerRendimientoCouriers',
      'obtenerKpisContingencia',
      'obtenerTopServiciosContingencia',
      'obtenerRendimientoCouriersContingencia'
    ], {
      origenDatos: 'MOTOR_ANALITICO'
    });

    repSpy.obtenerKpis.and.returnValue(of(mockKpis));
    repSpy.obtenerTopServicios.and.returnValue(of(mockTopServicios));
    repSpy.obtenerRendimientoCouriers.and.returnValue(of(mockRendimiento));
    repSpy.obtenerKpisContingencia.and.returnValue(mockKpis);
    repSpy.obtenerTopServiciosContingencia.and.returnValue(mockTopServicios);
    repSpy.obtenerRendimientoCouriersContingencia.and.returnValue(mockRendimiento);

    const authSpy = jasmine.createSpyObj('AuthService', ['tieneRol', 'obtenerRolActivo']);
    authSpy.tieneRol.and.returnValue(true);
    authSpy.obtenerRolActivo.and.returnValue('ROLE_ADMIN');

    const notifSpy = jasmine.createSpyObj('NotificationService', ['success', 'warning', 'error', 'info', 'dismiss']);
    (notifSpy as any).messages = signal([]);

    await TestBed.configureTestingModule({
      imports: [ReportesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ReportesService, useValue: repSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: notifSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportesComponent);
    component = fixture.componentInstance;
    reportesService = TestBed.inject(ReportesService) as jasmine.SpyObj<ReportesService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    fixture.detectChanges();
  });

  it('debe crearse correctamente el componente de reportes', () => {
    expect(component).toBeTruthy();
    expect(component.rangoSeleccionado()).toBe('ultimas24h');
  });

  it('debe cargar los reportes iniciales y formatear KPIs correctamente', () => {
    expect(reportesService.obtenerKpis).toHaveBeenCalledWith('ultimas24h');
    expect(reportesService.obtenerTopServicios).toHaveBeenCalledWith('ultimas24h');
    expect(reportesService.obtenerRendimientoCouriers).toHaveBeenCalled();

    expect(component.leadTimeFormateado()).toBe('5.3 hrs');
    expect(component.tasaCumplimientoFormateada()).toBe('97.4%');
    expect(component.facturacionEstimadaFormateada()).toBe('$9.700'); // 2 entregados * 4850
    expect(component.origenDatos()).toBe('MOTOR_ANALITICO');
  });

  it('debe calcular los segmentos de la dona de distribucion de estados', () => {
    const segmentos = component.segmentosDona();
    expect(segmentos.length).toBe(3); // CREADO (5), ACEPTADO (1), ENTREGADO (2)

    const creado = segmentos.find(s => s.estado === 'CREADO');
    expect(creado).toBeDefined();
    expect(creado?.cantidad).toBe(5);
    expect(creado?.porcentaje).toBe(62.5);
    expect(creado?.pathD).toContain('M');

    const entregado = segmentos.find(s => s.estado === 'ENTREGADO');
    expect(entregado).toBeDefined();
    expect(entregado?.cantidad).toBe(2);
    expect(entregado?.porcentaje).toBe(25);
  });

  it('debe calcular puntos, barras y curvas para el grafico de volumen', () => {
    const datos = component.datosGraficoVolumen();
    expect(datos.puntos.length).toBe(2);
    expect(datos.pathLinea).toContain('M');
    expect(datos.pathArea).toContain('Z');
    expect(datos.maxValor).toBeGreaterThanOrEqual(5);

    expect(datos.puntos[0].item.hora).toBe('14:00');
    expect(datos.puntos[0].item.cantidad).toBe(5);
    expect(datos.puntos[1].item.hora).toBe('17:00');
  });

  it('debe permitir cambiar de rango temporal y recargar metricas', () => {
    component.cambiarRango('ultimos7dias');

    expect(component.rangoSeleccionado()).toBe('ultimos7dias');
    expect(reportesService.obtenerKpis).toHaveBeenCalledWith('ultimos7dias');
    expect(reportesService.obtenerTopServicios).toHaveBeenCalledWith('ultimos7dias');
  });

  it('debe alternar la seleccion de estados en la leyenda o dona', () => {
    expect(component.estadoSeleccionado()).toBeNull();

    component.estadoSeleccionado.set('ENTREGADO');
    expect(component.estadoSeleccionado()).toBe('ENTREGADO');

    component.estadoSeleccionado.set(null);
    expect(component.estadoSeleccionado()).toBeNull();
  });

  it('debe alternar la seleccion de puntos en el grafico de volumen', () => {
    expect(component.puntoSeleccionadoVolumen()).toBeNull();

    component.puntoSeleccionadoVolumen.set(mockKpis.volumenPorHora[0]);
    expect(component.puntoSeleccionadoVolumen()?.hora).toBe('14:00');

    component.puntoSeleccionadoVolumen.set(null);
    expect(component.puntoSeleccionadoVolumen()).toBeNull();
  });

  it('debe cargar datos de contingencia si el servicio falla', () => {
    reportesService.obtenerKpis.and.returnValue(throwError(() => new Error('Error')));

    component.cargarReportes('ultimas24h');

    expect(component.origenDatos()).toBe('CONTINGENCIA');
    expect(component.kpis()).toBeTruthy();
    expect(component.cargando()).toBeFalse();
  });

  it('debe retornar etiquetas en espanol para estados y rangos', () => {
    expect(component.obtenerEtiquetaEstado('CREADO')).toBe('Creado');
    expect(component.obtenerEtiquetaEstado('ENTREGADO')).toBe('Entregado');
    expect(component.obtenerEtiquetaEstado('CANCELADO')).toBe('Cancelado');

    expect(component.obtenerEtiquetaRango('ultimas24h')).toBe('Ultimas 24 Horas');
    expect(component.obtenerEtiquetaRango('ultimos7dias')).toBe('Ultimos 7 Dias');
    expect(component.obtenerEtiquetaRango('ultimomes')).toBe('Ultimo Mes');
    expect(component.obtenerEtiquetaRango('historico')).toBe('Historico / Todo');
  });

});
