import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuditoriaComponent } from './auditoria.component';
import {
  AuditoriaService,
  EventoAuditoria,
  PaginaAuditoria,
  TimelineEnvio
} from '../../core/services/auditoria.service';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../shared/feedback/notification.service';

describe('AuditoriaComponent', () => {
  let component: AuditoriaComponent;
  let fixture: ComponentFixture<AuditoriaComponent>;
  let auditoriaService: jasmine.SpyObj<AuditoriaService>;
  let authService: jasmine.SpyObj<AuthService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockEventos: EventoAuditoria[] = [
    {
      id: 101,
      eventoId: 'uuid-101',
      envioId: 4,
      codigoSeguimiento: 'RE-LIVE-001',
      estadoAnterior: 'EN_RUTA',
      estadoNuevo: 'ENTREGADO',
      usuarioEmail: 'courier_santiago@rutaexpress.cl',
      usuarioRol: 'COURIER',
      fechaEvento: '2026-10-18T21:52:18',
      fechaRegistro: '2026-10-20T02:37:31',
      detalles: {
        pesoKg: 3.5,
        firmaReceptor: 'Constanza Morales',
        tiempoTransitoMinutos: 45
      }
    },
    {
      id: 102,
      eventoId: 'uuid-102',
      envioId: 4,
      codigoSeguimiento: 'RE-LIVE-001',
      estadoAnterior: 'EN_BODEGA',
      estadoNuevo: 'EN_RUTA',
      usuarioEmail: 'despachador1@rutaexpress.cl',
      usuarioRol: 'DESPACHADOR',
      fechaEvento: '2026-10-18T18:30:00',
      fechaRegistro: '2026-10-20T02:37:31',
      detalles: {
        vehiculoAsignado: 'FURGON-04',
        conductor: 'Mario Silva'
      }
    },
    {
      id: 103,
      eventoId: 'uuid-103',
      envioId: 5,
      codigoSeguimiento: 'RE-LIVE-002',
      estadoAnterior: 'CREADO',
      estadoNuevo: 'CANCELADO',
      usuarioEmail: 'supervisor@rutaexpress.cl',
      usuarioRol: 'ADMIN',
      fechaEvento: '2026-10-18T12:00:00',
      fechaRegistro: '2026-10-20T02:37:31',
      detalles: {
        motivoCancelacion: 'Cancelado por solicitud del cliente',
        penalidadCobrada: false
      }
    }
  ];

  const mockPagina: PaginaAuditoria = {
    content: mockEventos,
    totalElements: 3,
    totalPages: 1,
    size: 20,
    number: 0
  };

  const mockTimelineEnvio4: TimelineEnvio = {
    envioId: 4,
    codigoSeguimiento: 'RE-LIVE-001',
    totalEventos: 2,
    timeline: [mockEventos[1], mockEventos[0]]
  };

  beforeEach(async () => {
    const audSpy = jasmine.createSpyObj('AuditoriaService', [
      'listarEventos',
      'obtenerTimelinePorEnvio',
      'obtenerEventosContingencia',
      'obtenerTimelineContingencia'
    ], {
      origenDatos: 'ORACLE_DB'
    });

    audSpy.listarEventos.and.returnValue(of(mockPagina));
    audSpy.obtenerTimelinePorEnvio.and.returnValue(of(mockTimelineEnvio4));
    audSpy.obtenerEventosContingencia.and.returnValue(mockEventos);
    audSpy.obtenerTimelineContingencia.and.returnValue(mockTimelineEnvio4);

    const authSpy = jasmine.createSpyObj('AuthService', ['tieneRol', 'obtenerRolActivo']);
    authSpy.tieneRol.and.returnValue(true);
    authSpy.obtenerRolActivo.and.returnValue('ROLE_ADMIN');

    const notifSpy = jasmine.createSpyObj('NotificationService', ['success', 'warning', 'error', 'info', 'dismiss']);
    (notifSpy as any).messages = signal([]);

    await TestBed.configureTestingModule({
      imports: [AuditoriaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuditoriaService, useValue: audSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: notifSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({}))
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuditoriaComponent);
    component = fixture.componentInstance;
    auditoriaService = TestBed.inject(AuditoriaService) as jasmine.SpyObj<AuditoriaService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    fixture.detectChanges();
  });

  it('debe inicializarse correctamente el componente de auditoria', () => {
    expect(component).toBeTruthy();
    expect(component.modoVista()).toBe('GLOBAL');
  });

  it('debe cargar los eventos globales al inicio y calcular KPIs', () => {
    expect(auditoriaService.listarEventos).toHaveBeenCalled();
    expect(component.eventos().length).toBe(3);
    expect(component.totalElementos()).toBe(3);
    expect(component.origenDatos()).toBe('ORACLE_DB');

    // Validar KPIs
    expect(component.totalEventosKPI()).toBe(3);
    expect(component.totalEnviosUnicos()).toBe(2); // envios 4 y 5
    expect(component.totalUsuariosAuditados()).toBe(3); // 3 operadores distintos
    expect(component.totalEntregados()).toBe(1);
    expect(component.totalCancelados()).toBe(1);
  });

  it('debe aplicar filtros y consultar eventos al invocar cargarEventos', () => {
    component.filtroUsuario.set('courier');
    component.filtroEstadoNuevo.set('ENTREGADO');
    component.filtroFechaDesde.set('2026-10-18');
    component.filtroFechaHasta.set('2026-10-19');

    component.cargarEventos(0);

    expect(auditoriaService.listarEventos).toHaveBeenCalledWith({
      usuario: 'courier',
      fechaDesde: '2026-10-18',
      fechaHasta: '2026-10-19',
      estadoNuevo: 'ENTREGADO',
      page: 0,
      size: 20
    });
  });

  it('debe restablecer filtros a sus valores predeterminados con limpiarFiltros', () => {
    component.filtroUsuario.set('admin');
    component.filtroEstadoNuevo.set('CANCELADO');
    component.busquedaEnvio.set('RE-LIVE-001');

    component.limpiarFiltros();

    expect(component.filtroUsuario()).toBe('');
    expect(component.filtroEstadoNuevo()).toBe('TODOS');
    expect(component.busquedaEnvio()).toBe('');
    expect(component.paginaActual()).toBe(0);
  });

  it('debe conmutar a la vista forense al inspeccionar un envio especifico', () => {
    component.inspeccionarEnvio(4);

    expect(component.modoVista()).toBe('ENVIO');
    expect(component.envioSeleccionadoId()).toBe(4);
    expect(auditoriaService.obtenerTimelinePorEnvio).toHaveBeenCalledWith(4);
    expect(component.timelineEnvio()).toEqual(mockTimelineEnvio4);
  });

  it('debe volver a la vista de flujo global con volverAlFlujoGlobal', () => {
    component.inspeccionarEnvio(4);
    expect(component.modoVista()).toBe('ENVIO');

    component.volverAlFlujoGlobal();
    expect(component.modoVista()).toBe('GLOBAL');
    expect(component.timelineEnvio()).toBeNull();
    expect(component.envioSeleccionadoId()).toBeNull();
  });

  it('debe buscar envio por ID numerico en buscarEnvioPorInput', () => {
    component.busquedaEnvio.set('4');
    component.buscarEnvioPorInput();

    expect(component.modoVista()).toBe('ENVIO');
    expect(component.envioSeleccionadoId()).toBe(4);
  });

  it('debe buscar envio por codigo de seguimiento en buscarEnvioPorInput', () => {
    component.busquedaEnvio.set('RE-LIVE-001');
    component.buscarEnvioPorInput();

    expect(component.modoVista()).toBe('ENVIO');
    expect(component.envioSeleccionadoId()).toBe(4);
  });

  it('debe alternar la expansion de detalles tecnicos con alternarDetalles', () => {
    expect(component.detallesExpandidos().has(101)).toBeFalse();

    component.alternarDetalles(101);
    expect(component.detallesExpandidos().has(101)).toBeTrue();

    component.alternarDetalles(101);
    expect(component.detallesExpandidos().has(101)).toBeFalse();
  });

  it('debe alternar el modo JSON crudo con alternarJsonCrudo', () => {
    expect(component.modoJsonCrudo().has(101)).toBeFalse();

    component.alternarJsonCrudo(101);
    expect(component.modoJsonCrudo().has(101)).toBeTrue();

    component.alternarJsonCrudo(101);
    expect(component.modoJsonCrudo().has(101)).toBeFalse();
  });

  it('debe formatear claves de detalle a pares legibles', () => {
    const claves = component.obtenerClavesDetalle(mockEventos[0]);
    expect(claves.length).toBe(3);

    const pesoItem = claves.find(c => c.clave === 'pesoKg');
    expect(pesoItem?.etiqueta).toBe('Peso del envio');
    expect(pesoItem?.valor).toBe('3.5 kg');

    const firmaItem = claves.find(c => c.clave === 'firmaReceptor');
    expect(firmaItem?.etiqueta).toBe('Firma de Recepcion');
    expect(firmaItem?.valor).toBe('Constanza Morales');
  });

  it('debe mapear estados a sus clases CSS correspondientes', () => {
    expect(component.obtenerClaseEstado(null)).toBe('estado-inicio');
    expect(component.obtenerClaseEstado('CREADO')).toBe('estado-creado');
    expect(component.obtenerClaseEstado('ACEPTADO')).toBe('estado-aceptado');
    expect(component.obtenerClaseEstado('EN_BODEGA')).toBe('estado-en-bodega');
    expect(component.obtenerClaseEstado('EN_RUTA')).toBe('estado-en-ruta');
    expect(component.obtenerClaseEstado('ENTREGADO')).toBe('estado-entregado');
    expect(component.obtenerClaseEstado('CANCELADO')).toBe('estado-cancelado');
  });

  it('debe mapear estados a sus etiquetas descriptivas en espanol', () => {
    expect(component.obtenerEtiquetaEstado(null)).toBe('Inicio');
    expect(component.obtenerEtiquetaEstado('CREADO')).toBe('Creado');
    expect(component.obtenerEtiquetaEstado('ENTREGADO')).toBe('Entregado');
    expect(component.obtenerEtiquetaEstado('CANCELADO')).toBe('Cancelado');
  });

  it('debe permitir cambiar de pagina dentro del rango valido', () => {
    component.totalPaginas.set(3);
    component.cambiarPagina(1);
    expect(component.paginaActual()).toBe(1);
  });

  it('debe cargar contingencia y notificar advertencia si falla el servicio al listar eventos', () => {
    auditoriaService.listarEventos.and.returnValue(throwError(() => new Error('Error de red')));

    component.cargarEventos(0);

    expect(component.origenDatos()).toBe('CONTINGENCIA');
    expect(component.eventos().length).toBeGreaterThan(0);
    expect(notificationService.warning).toHaveBeenCalled();
  });

  it('debe cargar contingencia de timeline si falla la peticion forense', () => {
    auditoriaService.obtenerTimelinePorEnvio.and.returnValue(throwError(() => new Error('Timeout')));

    component.inspeccionarEnvio(4);

    expect(component.origenDatos()).toBe('CONTINGENCIA');
    expect(component.timelineEnvio()).toBeTruthy();
    expect(component.cargandoTimeline()).toBeFalse();
  });
});
