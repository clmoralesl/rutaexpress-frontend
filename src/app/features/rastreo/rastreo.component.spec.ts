import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RastreoComponent } from './rastreo.component';
import { RastreoService, SeguimientoEnvio } from '../../core/services/rastreo.service';
import { NotificationService } from '../../shared/feedback/notification.service';

describe('RastreoComponent', () => {
  let component: RastreoComponent;
  let fixture: ComponentFixture<RastreoComponent>;
  let rastreoService: jasmine.SpyObj<RastreoService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockEnvio: SeguimientoEnvio = {
    codigoSeguimiento: 'RTX-2026-0001',
    estadoActual: 'EN_RUTA',
    ciudadOrigen: 'Santiago',
    ciudadDestino: 'Valparaíso',
    fechaEstimadaEntrega: '2026-10-21T18:00:00',
    servicioContratado: 'Envío Express 24h',
    courierAsignado: 'Flota RutaExpress',
    pesoKg: 3.5,
    fechaCreacion: '2026-10-19T09:00:00',
    fechaActualizacion: '2026-10-19T14:00:00',
    historial: [
      { estado: 'CREADO', descripcion: 'Envío registrado', fecha: '2026-10-19T09:00:00' },
      { estado: 'EN_RUTA', descripcion: 'En ruta', fecha: '2026-10-19T14:00:00' }
    ]
  };

  beforeEach(async () => {
    const rastreoSpy = jasmine.createSpyObj('RastreoService', [
      'consultarSeguimiento',
      'obtenerCodigosDemostracion'
    ]);
    rastreoSpy.obtenerCodigosDemostracion.and.returnValue([
      { codigo: 'RTX-2026-0001', estado: 'ENTREGADO', descripcion: 'Demo' }
    ]);

    const notifSpy = jasmine.createSpyObj('NotificationService', ['success', 'error', 'info', 'warning']);

    await TestBed.configureTestingModule({
      imports: [RastreoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: RastreoService, useValue: rastreoSpy },
        { provide: NotificationService, useValue: notifSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RastreoComponent);
    component = fixture.componentInstance;
    rastreoService = TestBed.inject(RastreoService) as jasmine.SpyObj<RastreoService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar error si el codigo esta vacio al buscar', () => {
    component.codigo.set('');
    component.buscar();
    expect(component.mensajeError()).toContain('ingresa un código');
    expect(component.seguimiento()).toBeNull();
  });

  it('debe consultar el servicio y renderizar datos ante codigo valido', () => {
    rastreoService.consultarSeguimiento.and.returnValue(of(mockEnvio));

    component.codigo.set('RTX-2026-0001');
    component.buscar();

    expect(rastreoService.consultarSeguimiento).toHaveBeenCalledWith('RTX-2026-0001');
    expect(component.seguimiento()).toEqual(mockEnvio);
    expect(component.cargando()).toBeFalse();
    expect(component.qrSvg()).toBeTruthy();
    expect(component.indicePasoActual()).toBe(3); // 'EN_RUTA' es el indice 3
  });

  it('debe capturar error del servicio y mostrar alerta amigable', () => {
    rastreoService.consultarSeguimiento.and.returnValue(
      throwError(() => new Error('No se encontró el envío solicitado.'))
    );

    component.codigo.set('INEXISTENTE');
    component.buscar();

    expect(component.cargando()).toBeFalse();
    expect(component.seguimiento()).toBeNull();
    expect(component.mensajeError()).toBe('No se encontró el envío solicitado.');
  });

  it('debe seleccionar un codigo de demostracion y ejecutar la busqueda', () => {
    rastreoService.consultarSeguimiento.and.returnValue(of(mockEnvio));
    component.seleccionarEjemplo('RTX-2026-0001');

    expect(component.codigo()).toBe('RTX-2026-0001');
    expect(rastreoService.consultarSeguimiento).toHaveBeenCalledWith('RTX-2026-0001');
  });
});
