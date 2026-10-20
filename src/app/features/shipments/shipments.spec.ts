import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Shipments } from './shipments';
import { EnviosService, Envio } from '../../core/services/envios.service';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../shared/feedback/notification.service';

describe('Shipments Component', () => {
  let component: Shipments;
  let fixture: ComponentFixture<Shipments>;
  let enviosServiceMock: jasmine.SpyObj<EnviosService>;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;

  const listaEnviosMock: Envio[] = [
    {
      id: 1,
      codigoSeguimiento: 'RE-2026-001',
      rutRemitente: '11111111-1',
      rutDestinatario: '22222222-2',
      direccionOrigen: 'Origen 1',
      direccionDestino: 'Destino 1',
      pesoKg: 2.5,
      estado: 'CREADO',
      fechaCreacion: '2026-10-18T10:00:00Z',
      fechaActualizacion: '2026-10-18T10:00:00Z'
    },
    {
      id: 2,
      codigoSeguimiento: 'RE-2026-002',
      rutRemitente: '33333333-3',
      rutDestinatario: '44444444-4',
      direccionOrigen: 'Origen 2',
      direccionDestino: 'Destino 2',
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
      'solicitarEtiqueta'
    ]);
    authServiceMock = jasmine.createSpyObj('AuthService', ['tieneRol']);
    notificationServiceMock = jasmine.createSpyObj('NotificationService', [
      'info',
      'success',
      'warning',
      'error'
    ]);

    enviosServiceMock.listar.and.returnValue(of(listaEnviosMock));
    enviosServiceMock.solicitarEtiqueta.and.returnValue(of(undefined as unknown as void));
    authServiceMock.tieneRol.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [Shipments],
      providers: [
        { provide: EnviosService, useValue: enviosServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Shipments);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar listado de envios', () => {
    expect(component).toBeTruthy();
    expect(enviosServiceMock.listar).toHaveBeenCalled();
    expect(component.envios.length).toBe(2);
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
      jasmine.stringMatching(/RE-2026-001/)
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
});
