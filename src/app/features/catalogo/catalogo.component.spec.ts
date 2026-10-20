import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CatalogoComponent } from './catalogo.component';
import { CatalogoService, ServicioCatalogo } from '../../core/services/catalogo.service';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../shared/feedback/notification.service';

describe('CatalogoComponent', () => {
  let component: CatalogoComponent;
  let fixture: ComponentFixture<CatalogoComponent>;
  let catalogoService: jasmine.SpyObj<CatalogoService>;
  let authService: jasmine.SpyObj<AuthService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockServicios: ServicioCatalogo[] = [
    {
      id: 1,
      codigo: 'EXPRESS-24H',
      nombre: 'Envio Express 24 Horas',
      descripcion: 'Entrega rapida urbana',
      tipoVehiculo: 'FURGON',
      tarifaBase: 5000,
      precioPorKg: 1200,
      capacidadMaximaDiaria: 100,
      capacidadDisponible: 85,
      activo: true
    },
    {
      id: 2,
      codigo: 'ESTANDAR',
      nombre: 'Envio Estandar 48-72 Horas',
      descripcion: 'Distribucion economica',
      tipoVehiculo: 'FURGON',
      tarifaBase: 2490,
      precioPorKg: 490,
      capacidadMaximaDiaria: 100,
      capacidadDisponible: 15, // 15% -> critica (< 20%)
      activo: true
    },
    {
      id: 3,
      codigo: 'MISMO_DIA',
      nombre: 'Entrega Mismo Dia',
      descripcion: 'Despacho urgente',
      tipoVehiculo: 'MOTO',
      tarifaBase: 5490,
      precioPorKg: 1190,
      capacidadMaximaDiaria: 50,
      capacidadDisponible: 18, // 36% -> advertencia (< 40%)
      activo: true
    },
    {
      id: 4,
      codigo: 'CARGA_INACTIVA',
      nombre: 'Carga Especial Inactiva',
      descripcion: 'Servicio suspendido temporalmente',
      tipoVehiculo: 'CAMION',
      tarifaBase: 12000,
      precioPorKg: 800,
      capacidadMaximaDiaria: 20,
      capacidadDisponible: 20,
      activo: false
    }
  ];

  beforeEach(async () => {
    const catalogoSpy = jasmine.createSpyObj('CatalogoService', [
      'listarServicios',
      'crearServicio',
      'actualizarServicio',
      'calcularCotizacion',
      'obtenerServiciosContingencia'
    ]);
    catalogoSpy.obtenerServiciosContingencia.and.returnValue(mockServicios);
    catalogoSpy.listarServicios.and.returnValue(of(mockServicios));
    catalogoSpy.calcularCotizacion.and.callFake((req: any, servicios: ServicioCatalogo[]) => {
      const s = servicios.find(serv => serv.id === req.servicioId);
      if (!s) return null;
      const pesoFacturado = req.pesoKg;
      const tarifaBase = s.tarifaBase;
      const costoVariablePeso = pesoFacturado * s.precioPorKg;
      return {
        servicio: s,
        pesoRealKg: req.pesoKg,
        pesoVolumetricoKg: 0,
        pesoFacturadoKg: pesoFacturado,
        tarifaBase,
        costoVariablePeso,
        costoTotalEstimado: tarifaBase + costoVariablePeso
      };
    });

    const authSpy = jasmine.createSpyObj('AuthService', ['tieneRol', 'obtenerRolActivo']);
    authSpy.tieneRol.and.returnValue(false); // Por defecto usuario normal sin ROLE_ADMIN

    const notifSpy = jasmine.createSpyObj('NotificationService', ['success', 'error', 'info', 'warning', 'dismiss']);
    (notifSpy as any).messages = signal([]);

    await TestBed.configureTestingModule({
      imports: [CatalogoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CatalogoService, useValue: catalogoSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: notifSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogoComponent);
    component = fixture.componentInstance;
    catalogoService = TestBed.inject(CatalogoService) as jasmine.SpyObj<CatalogoService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    fixture.detectChanges();
  });

  it('debe inicializarse y cargar los servicios correctamente', () => {
    expect(component).toBeTruthy();
    expect(catalogoService.listarServicios).toHaveBeenCalled();
    expect(component.servicios().length).toBe(4);
    expect(component.cargando()).toBeFalse();
    expect(component.cotizacionServicioId()).toBe(1);
  });

  describe('KPIs Calculados', () => {
    it('debe calcular el total de servicios activos', () => {
      expect(component.totalServiciosActivos()).toBe(3);
    });

    it('debe calcular la capacidad total solo de servicios activos', () => {
      // 100 + 100 + 50 = 250 (el inactivo tiene 20 y no se suma)
      expect(component.capacidadTotalRed()).toBe(250);
    });

    it('debe calcular los cupos disponibles y ocupados totales', () => {
      // 85 + 15 + 18 = 118 cupos disponibles
      expect(component.cuposDisponiblesTotales()).toBe(118);
      // 250 - 118 = 132 cupos ocupados
      expect(component.cuposOcupadosTotales()).toBe(132);
    });

    it('debe calcular el porcentaje de disponibilidad global', () => {
      // (118 / 250) * 100 = 47.2%
      expect(component.porcentajeDisponibilidadGlobal()).toBe(47.2);
    });
  });

  describe('Filtros y Busqueda Reactiva', () => {
    it('debe filtrar servicios por termino de texto en codigo o nombre', () => {
      component.terminoBusqueda.set('express');
      expect(component.serviciosFiltrados().length).toBe(1);
      expect(component.serviciosFiltrados()[0].codigo).toBe('EXPRESS-24H');
    });

    it('debe filtrar servicios por tipo de vehiculo', () => {
      component.filtroVehiculo.set('MOTO');
      expect(component.serviciosFiltrados().length).toBe(1);
      expect(component.serviciosFiltrados()[0].codigo).toBe('MISMO_DIA');
    });

    it('debe filtrar servicios por estado activo e inactivo', () => {
      component.filtroEstado.set('INACTIVO');
      expect(component.serviciosFiltrados().length).toBe(1);
      expect(component.serviciosFiltrados()[0].codigo).toBe('CARGA_INACTIVA');

      component.filtroEstado.set('ACTIVO');
      expect(component.serviciosFiltrados().length).toBe(3);
    });
  });

  describe('Indicador Visual de Capacidad Vehicular', () => {
    it('debe retornar porcentaje correcto de cupos disponibles', () => {
      const servicio = mockServicios[0]; // 85 / 100 = 85%
      expect(component.calcularPorcentajeDisponible(servicio)).toBe(85);
    });

    it('debe alertar estado critico cuando la disponibilidad es menor al 20%', () => {
      const servicioCritico = mockServicios[1]; // 15 / 100 = 15%
      expect(component.obtenerNivelCapacidad(servicioCritico)).toBe('critica');
    });

    it('debe alertar estado de advertencia cuando la disponibilidad esta entre 20% y 39%', () => {
      const servicioAdvertencia = mockServicios[2]; // 18 / 50 = 36%
      expect(component.obtenerNivelCapacidad(servicioAdvertencia)).toBe('advertencia');
    });

    it('debe mostrar estado normal cuando la disponibilidad es 40% o superior', () => {
      const servicioNormal = mockServicios[0]; // 85%
      expect(component.obtenerNivelCapacidad(servicioNormal)).toBe('normal');
    });
  });

  describe('Tarifador y Calculadora en Tiempo Real', () => {
    it('debe computar la cotizacion actual reactivamente al cambiar de peso', () => {
      component.cotizacionServicioId.set(1);
      component.cotizacionPeso.set(3.0);
      const cotizacion = component.cotizacionActual();
      expect(cotizacion).not.toBeNull();
      expect(cotizacion!.costoTotalEstimado).toBe(8600);
    });

    it('debe permitir ajustar peso con incremento o decremento', () => {
      component.cotizacionPeso.set(2.0);
      component.ajustarPeso(1.0);
      expect(component.cotizacionPeso()).toBe(3.0);

      component.ajustarPeso(-5.0);
      expect(component.cotizacionPeso()).toBe(0.1); // Minimo permitido
    });

    it('debe seleccionar servicio para cotizar y emitir notificacion', () => {
      component.seleccionarServicioParaCotizar(mockServicios[2]);
      expect(component.cotizacionServicioId()).toBe(3);
      expect(notificationService.info).toHaveBeenCalled();
    });

    it('debe formatear montos en pesos chilenos', () => {
      const resultado = component.formatearMoneda(5000);
      expect(resultado).toContain('5.000');
    });
  });

  describe('Control de Acceso y Modales (ROLE_ADMIN)', () => {
    it('debe denegar apertura de modal crear si el usuario no es admin', () => {
      authService.tieneRol.and.returnValue(false);
      component.abrirModalCrear();
      expect(component.modalVisible()).toBeFalse();
      expect(notificationService.warning).toHaveBeenCalled();
    });

    it('debe denegar apertura de modal editar si el usuario no es admin', () => {
      authService.tieneRol.and.returnValue(false);
      component.abrirModalEditar(mockServicios[0]);
      expect(component.modalVisible()).toBeFalse();
      expect(notificationService.warning).toHaveBeenCalled();
    });

    it('debe abrir modal de creacion si el usuario tiene rol ROLE_ADMIN', () => {
      authService.tieneRol.and.returnValue(true);
      component.abrirModalCrear();
      expect(component.modalVisible()).toBeTrue();
      expect(component.modoEdicion()).toBeFalse();
      expect(component.servicioForm.get('codigo')?.enabled).toBeTrue();
    });

    it('debe abrir modal de edicion con datos precargados si es admin y deshabilitar codigo', () => {
      authService.tieneRol.and.returnValue(true);
      component.abrirModalEditar(mockServicios[0]);
      expect(component.modalVisible()).toBeTrue();
      expect(component.modoEdicion()).toBeTrue();
      expect(component.servicioEnEdicionId()).toBe(1);
      expect(component.servicioForm.get('codigo')?.disabled).toBeTrue();
      expect(component.servicioForm.get('nombre')?.value).toBe('Envio Express 24 Horas');
    });

    it('debe validar y enviar datos al crear un nuevo servicio', () => {
      authService.tieneRol.and.returnValue(true);
      component.abrirModalCrear();

      component.servicioForm.patchValue({
        codigo: 'NUEVO-01',
        nombre: 'Nuevo Servicio',
        descripcion: 'Descripcion de prueba',
        tipoVehiculo: 'FURGON',
        tarifaBase: 4000,
        precioPorKg: 800,
        capacidadMaximaDiaria: 60,
        activo: true
      });

      const nuevoServicioCreado: ServicioCatalogo = {
        id: 10,
        codigo: 'NUEVO-01',
        nombre: 'Nuevo Servicio',
        descripcion: 'Descripcion de prueba',
        tipoVehiculo: 'FURGON',
        tarifaBase: 4000,
        precioPorKg: 800,
        capacidadMaximaDiaria: 60,
        capacidadDisponible: 60,
        activo: true
      };

      catalogoService.crearServicio.and.returnValue(of(nuevoServicioCreado));

      component.guardarServicio();

      expect(catalogoService.crearServicio).toHaveBeenCalled();
      expect(component.modalVisible()).toBeFalse();
      expect(notificationService.success).toHaveBeenCalled();
    });

    it('debe enviar datos correctos al editar un servicio existente', () => {
      authService.tieneRol.and.returnValue(true);
      component.abrirModalEditar(mockServicios[0]);

      component.servicioForm.patchValue({
        nombre: 'Envio Express Editado',
        tarifaBase: 5500
      });

      const servicioEditado: ServicioCatalogo = {
        ...mockServicios[0],
        nombre: 'Envio Express Editado',
        tarifaBase: 5500
      };

      catalogoService.actualizarServicio.and.returnValue(of(servicioEditado));

      component.guardarServicio();

      expect(catalogoService.actualizarServicio).toHaveBeenCalledWith(1, jasmine.objectContaining({
        nombre: 'Envio Express Editado',
        tarifaBase: 5500
      }));
      expect(component.modalVisible()).toBeFalse();
      expect(notificationService.success).toHaveBeenCalled();
    });

    it('debe mostrar error de formulario si los datos son invalidos al guardar', () => {
      authService.tieneRol.and.returnValue(true);
      component.abrirModalCrear();
      component.servicioForm.patchValue({
        codigo: '', // Requerido
        nombre: ''
      });

      component.guardarServicio();

      expect(catalogoService.crearServicio).not.toHaveBeenCalled();
      expect(notificationService.error).toHaveBeenCalled();
    });
  });

  describe('Manejo de Errores de Red', () => {
    it('debe notificar error si falla la carga inicial de servicios', () => {
      catalogoService.listarServicios.and.returnValue(
        throwError(() => new Error('Fallo de comunicacion'))
      );

      component.cargarServicios();

      expect(component.cargando()).toBeFalse();
      expect(notificationService.error).toHaveBeenCalled();
    });
  });
});
