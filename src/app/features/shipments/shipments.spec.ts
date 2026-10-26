import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { Shipments } from './shipments';
import { EnviosService, Envio, Region } from '../../core/services/envios.service';
import { SesionService } from '../../core/auth/sesion.service';
import { NotificationService } from '../../shared/feedback/notification.service';

describe('Shipments Component', () => {
  let component: Shipments;
  let fixture: ComponentFixture<Shipments>;
  let enviosServiceMock: jasmine.SpyObj<EnviosService>;
  let sesionServiceMock: jasmine.SpyObj<SesionService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;

  const mockRegiones: Region[] = [
    {
      idRegion: 13,
      nombre: 'Metropolitana de Santiago',
      comunas: [
        { idComuna: 13101, nombre: 'Santiago' },
        { idComuna: 13123, nombre: 'Providencia' }
      ]
    },
    {
      idRegion: 5,
      nombre: 'Valparaíso',
      comunas: [
        { idComuna: 5101, nombre: 'Valparaíso' },
        { idComuna: 5109, nombre: 'Viña del Mar' }
      ]
    }
  ];

  const listaEnviosMock: Envio[] = [
    {
      id: 1,
      codigoSeguimiento: 'RTX-2026-000001',
      rutRemitente: '11111111-1',
      rutDestinatario: '22222222-2',
      direccionOrigen: 'Av. Providencia 1234, Providencia, Metropolitana de Santiago',
      direccionDestino: 'Av. Libertad 500, Viña del Mar, Valparaíso',
      pesoKg: 2.5,
      estado: 'CREADO',
      fechaCreacion: '2026-10-18T10:00:00Z',
      fechaActualizacion: '2026-10-18T10:00:00Z'
    },
    {
      id: 2,
      codigoSeguimiento: 'RTX-2026-000002',
      rutRemitente: '33333333-3',
      rutDestinatario: '44444444-4',
      direccionOrigen: 'Calle Nueva 100, Santiago, Metropolitana de Santiago',
      direccionDestino: 'Av. Marina 200, Viña del Mar, Valparaíso',
      pesoKg: 6.0,
      estado: 'ACEPTADO',
      fechaCreacion: '2026-10-19T12:00:00Z',
      fechaActualizacion: '2026-10-19T12:00:00Z'
    }
  ];

  beforeEach(async () => {
    enviosServiceMock = jasmine.createSpyObj('EnviosService', [
      'listar',
      'crear',
      'actualizarEstado',
      'solicitarEtiqueta',
      'obtenerRegiones'
    ]);
    sesionServiceMock = jasmine.createSpyObj('SesionService', ['tieneRol']);
    notificationServiceMock = jasmine.createSpyObj('NotificationService', [
      'info',
      'success',
      'warning',
      'error'
    ]);

    enviosServiceMock.listar.and.returnValue(of(listaEnviosMock));
    enviosServiceMock.solicitarEtiqueta.and.returnValue(of(undefined as unknown as void));
    enviosServiceMock.obtenerRegiones.and.returnValue(of(mockRegiones));

    // Por defecto asume rol ADMIN (acceso completo)
    sesionServiceMock.tieneRol.and.callFake((...roles: string[]) => roles.includes('ADMIN'));

    await TestBed.configureTestingModule({
      imports: [Shipments],
      providers: [
        { provide: EnviosService, useValue: enviosServiceMock },
        { provide: SesionService, useValue: sesionServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Shipments);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar listado de envios y catalogo geografico', () => {
    expect(component).toBeTruthy();
    expect(enviosServiceMock.listar).toHaveBeenCalled();
    expect(enviosServiceMock.obtenerRegiones).toHaveBeenCalled();
    expect(component.envios.length).toBe(2);
    expect(component.regiones.length).toBe(2);
  });

  it('debe filtrar comunas dependientes al seleccionar una region de origen', () => {
    const mockSelectEvent = {
      target: { value: '13' }
    } as unknown as Event;

    component.onRegionOrigenChange(mockSelectEvent);

    expect(component.comunasOrigen.length).toBe(2);
    expect(component.comunasOrigen[0].nombre).toBe('Santiago');
    expect(component.formularioEnvio.controls.origen.controls.idComuna.value).toBe(0);
  });

  it('debe asignar S/N al activar checkbox de sin numero y restaurar vacio al desmarcar', () => {
    const eventChecked = {
      target: { checked: true }
    } as unknown as Event;

    component.toggleSinNumeroOrigen(eventChecked);
    expect(component.formularioEnvio.controls.origen.controls.numero.value).toBe('S/N');

    const eventUnchecked = {
      target: { checked: false }
    } as unknown as Event;

    component.toggleSinNumeroOrigen(eventUnchecked);
    expect(component.formularioEnvio.controls.origen.controls.numero.value).toBe('');
  });

  it('debe crear envio con direccion estructurada y mostrar codigo institucional', () => {
    const nuevoEnvioMock: Envio = {
      id: 3,
      codigoSeguimiento: 'RTX-2026-ABCDEF',
      rutRemitente: '12345678-5',
      rutDestinatario: '98765432-1',
      direccionOrigen: 'Av. Providencia 1234, Providencia, Metropolitana de Santiago',
      direccionDestino: 'Av. Marina 200, Viña del Mar, Valparaíso',
      pesoKg: 3.5,
      estado: 'CREADO',
      fechaCreacion: '2026-10-23T20:00:00Z',
      fechaActualizacion: '2026-10-23T20:00:00Z'
    };

    enviosServiceMock.crear.and.returnValue(of(nuevoEnvioMock));

    component.formularioEnvio.setValue({
      rutRemitente: '12345678-5',
      rutDestinatario: '98765432-1',
      pesoKg: 3.5,
      origen: {
        idRegion: 13,
        idComuna: 13123,
        calle: 'Av. Providencia',
        numero: '1234',
        complemento: 'Depto 302'
      },
      destino: {
        idRegion: 5,
        idComuna: 5109,
        calle: 'Av. Marina',
        numero: '200',
        complemento: ''
      }
    });

    component.crearEnvio();

    expect(enviosServiceMock.crear).toHaveBeenCalledWith({
      rutRemitente: '12345678-5',
      rutDestinatario: '98765432-1',
      pesoKg: 3.5,
      origen: {
        calle: 'Av. Providencia',
        numero: '1234',
        complemento: 'Depto 302',
        idComuna: 13123
      },
      destino: {
        calle: 'Av. Marina',
        numero: '200',
        complemento: null,
        idComuna: 5109
      }
    });

    expect(component.codigoCreadoReciente).toBe('RTX-2026-ABCDEF');
    expect(notificationServiceMock.success).toHaveBeenCalledWith(
      jasmine.stringMatching(/RTX-2026-ABCDEF/)
    );
  });

  it('debe permitir filtrar envios por estado y fechas', () => {
    component.estado = 'CREADO';
    component.fechaDesde = '2026-10-01';
    component.fechaHasta = '2026-10-20';
    component.cargarEnvios();

    expect(enviosServiceMock.listar).toHaveBeenCalledWith({
      estado: 'CREADO',
      fechaDesde: '2026-10-01',
      fechaHasta: '2026-10-20'
    });
  });

  it('debe limpiar filtros y recargar', () => {
    component.estado = 'CREADO';
    component.limpiarFiltros();

    expect(component.estado).toBe('');
    expect(component.fechaDesde).toBe('');
    expect(component.fechaHasta).toBe('');
    expect(enviosServiceMock.listar).toHaveBeenCalled();
  });

  it('debe abrir modal de etiqueta y notificar asincronamente a RabbitMQ', () => {
    const envio = listaEnviosMock[0];
    component.abrirEtiqueta(envio);

    expect(component.etiquetaModalVisible).toBeTrue();
    expect(component.envioSeleccionadoEtiqueta).toEqual(envio);
    expect(enviosServiceMock.solicitarEtiqueta).toHaveBeenCalledWith(envio.id);
    expect(component.encoladoRabbitMQ).toBeTrue();
    expect(notificationServiceMock.info).toHaveBeenCalledWith(
      jasmine.stringMatching(/RTX-2026-000001/)
    );
  });

  it('debe manejar error de conexion encolando a RabbitMQ manteniendo modal abierto', () => {
    enviosServiceMock.solicitarEtiqueta.and.returnValue(throwError(() => new Error('Error de red')));
    const envio = listaEnviosMock[0];
    component.abrirEtiqueta(envio);

    expect(component.etiquetaModalVisible).toBeTrue();
    expect(component.encoladoRabbitMQ).toBeFalse();
  });

  it('debe cerrar modal de etiqueta limpiando seleccion', () => {
    component.etiquetaModalVisible = true;
    component.envioSeleccionadoEtiqueta = listaEnviosMock[0];

    component.cerrarEtiqueta();

    expect(component.etiquetaModalVisible).toBeFalse();
    expect(component.envioSeleccionadoEtiqueta).toBeNull();
  });

  it('debe reintentar el encolado a RabbitMQ exitosamente', () => {
    enviosServiceMock.solicitarEtiqueta.and.returnValue(of(undefined as unknown as void));
    const envio = listaEnviosMock[1];

    component.reintentarEncolado(envio);

    expect(enviosServiceMock.solicitarEtiqueta).toHaveBeenCalledWith(envio.id);
    expect(component.encoladoRabbitMQ).toBeTrue();
    expect(notificationServiceMock.success).toHaveBeenCalled();
  });

  it('debe actualizar estado tras confirmar en dialogo modal', () => {
    const envio = listaEnviosMock[0];
    enviosServiceMock.actualizarEstado.and.returnValue(of({ ...envio, estado: 'ACEPTADO' }));

    component.actualizarEstado(envio, 'ACEPTADO');
    expect(component.confirmacionVisible).toBeTrue();
    expect(component.envioPendiente).toEqual(envio);
    expect(component.estadoPendiente).toBe('ACEPTADO');

    component.confirmarCambio();

    expect(enviosServiceMock.actualizarEstado).toHaveBeenCalledWith(envio.id, 'ACEPTADO');
    expect(notificationServiceMock.success).toHaveBeenCalled();
  });

  describe('Control de acceso y vistas por rol (Issue #68)', () => {
    it('debe configurar vista personal completa para rol ADMIN o DESPACHADOR', () => {
      sesionServiceMock.tieneRol.and.callFake((...roles: string[]) => roles.includes('DESPACHADOR'));
      fixture.detectChanges();

      expect(component.puedeCrear()).toBeTrue();
      expect(component.puedeGestionarEstados()).toBeTrue();
      expect(component.puedeImprimirEtiqueta()).toBeTrue();
      expect(component.verSoloPropios()).toBeFalse();

      expect(component.tituloPagina()).toBe('Gestión de envíos');
      expect(component.tituloListado()).toBe('Listado de envíos');
      expect(component.mensajeVacio()).toBe('No hay envíos con estos filtros.');

      const h1 = fixture.debugElement.query(By.css('.encabezado-pagina h1')).nativeElement.textContent.trim();
      expect(h1).toBe('Gestión de envíos');

      const formularioCreacion = fixture.debugElement.query(By.css('form.formulario-envio-completo'));
      expect(formularioCreacion).toBeTruthy();

      const encabezados = fixture.debugElement.queryAll(By.css('thead th')).map(th => th.nativeElement.textContent.trim());
      expect(encabezados).toContain('Etiqueta');
      expect(encabezados).toContain('Acciones');

      const botonEtiqueta = fixture.debugElement.query(By.css('.boton-etiqueta'));
      expect(botonEtiqueta).toBeTruthy();
    });

    it('debe configurar vista de cliente para rol CLIENTE (crear y ver solo propios, sin etiqueta ni acciones)', () => {
      sesionServiceMock.tieneRol.and.callFake((...roles: string[]) => roles.includes('CLIENTE'));
      fixture.detectChanges();

      expect(component.puedeCrear()).toBeTrue();
      expect(component.puedeGestionarEstados()).toBeFalse();
      expect(component.puedeImprimirEtiqueta()).toBeFalse();
      expect(component.verSoloPropios()).toBeTrue();

      expect(component.tituloPagina()).toBe('Mis envíos');
      expect(component.tituloListado()).toBe('Mis envíos registrados');
      expect(component.mensajeVacio()).toBe('Aún no tienes envíos registrados.');

      const h1 = fixture.debugElement.query(By.css('.encabezado-pagina h1')).nativeElement.textContent.trim();
      expect(h1).toBe('Mis envíos');

      const formularioCreacion = fixture.debugElement.query(By.css('form.formulario-envio-completo'));
      expect(formularioCreacion).toBeTruthy();

      const encabezados = fixture.debugElement.queryAll(By.css('thead th')).map(th => th.nativeElement.textContent.trim());
      expect(encabezados).not.toContain('Etiqueta');
      expect(encabezados).not.toContain('Acciones');

      const botonEtiqueta = fixture.debugElement.query(By.css('.boton-etiqueta'));
      expect(botonEtiqueta).toBeNull();
    });

    it('debe configurar vista de consulta para rol OPERADOR (ver todo y etiqueta, sin crear ni acciones)', () => {
      sesionServiceMock.tieneRol.and.callFake((...roles: string[]) => roles.includes('OPERADOR'));
      fixture.detectChanges();

      expect(component.puedeCrear()).toBeFalse();
      expect(component.puedeGestionarEstados()).toBeFalse();
      expect(component.puedeImprimirEtiqueta()).toBeTrue();
      expect(component.verSoloPropios()).toBeFalse();

      expect(component.tituloPagina()).toBe('Gestión de envíos');
      expect(component.tituloListado()).toBe('Listado de envíos');

      const h1 = fixture.debugElement.query(By.css('.encabezado-pagina h1')).nativeElement.textContent.trim();
      expect(h1).toBe('Gestión de envíos');

      const formularioCreacion = fixture.debugElement.query(By.css('form.formulario-envio-completo'));
      expect(formularioCreacion).toBeNull();

      const encabezados = fixture.debugElement.queryAll(By.css('thead th')).map(th => th.nativeElement.textContent.trim());
      expect(encabezados).toContain('Etiqueta');
      expect(encabezados).not.toContain('Acciones');

      const botonEtiqueta = fixture.debugElement.query(By.css('.boton-etiqueta'));
      expect(botonEtiqueta).toBeTruthy();
    });

    it('debe mostrar mensaje descriptivo ante error 403 Forbidden al listar envios', () => {
      enviosServiceMock.listar.and.returnValue(throwError(() => ({ status: 403 })));

      component.cargarEnvios();
      fixture.detectChanges();

      expect(component.envios.length).toBe(0);
      expect(component.error).toBe('No tienes permisos para consultar estos envíos.');
      expect(notificationServiceMock.error).toHaveBeenCalledWith('No tienes permisos para consultar estos envíos.');

      const alertaError = fixture.debugElement.query(By.css('.notificacion.error'));
      expect(alertaError).toBeTruthy();
      expect(alertaError.nativeElement.textContent).toContain('No tienes permisos para consultar estos envíos.');
    });

    it('debe mostrar mensaje descriptivo ante error 404 Not Found al listar envios', () => {
      enviosServiceMock.listar.and.returnValue(throwError(() => ({ status: 404 })));

      component.cargarEnvios();
      fixture.detectChanges();

      expect(component.envios.length).toBe(0);
      expect(component.error).toBe('No se encontraron envíos para el criterio consultado.');
      expect(notificationServiceMock.error).toHaveBeenCalledWith('No se encontraron envíos para el criterio consultado.');

      const alertaError = fixture.debugElement.query(By.css('.notificacion.error'));
      expect(alertaError).toBeTruthy();
      expect(alertaError.nativeElement.textContent).toContain('No se encontraron envíos para el criterio consultado.');
    });
  });
});
