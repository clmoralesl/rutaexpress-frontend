import { TestBed } from '@angular/core/testing';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { EventMessage, EventType, InteractionStatus } from '@azure/msal-browser';
import { BehaviorSubject, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { SesionService } from './sesion.service';

describe('SesionService', () => {
  let service: SesionService;
  let mockMsalService: any;
  let mockAuthService: any;
  let inProgressSubject: BehaviorSubject<InteractionStatus>;
  let msalSubject: Subject<EventMessage>;

  const cuentaEjemplo = {
    name: 'Carlos Morales',
    username: 'cmorales@rutaexpress.cl'
  };

  beforeEach(() => {
    inProgressSubject = new BehaviorSubject<InteractionStatus>(InteractionStatus.None);
    msalSubject = new Subject<EventMessage>();

    mockMsalService = {
      instance: {
        getActiveAccount: jasmine.createSpy('getActiveAccount').and.returnValue(null),
        getAllAccounts: jasmine.createSpy('getAllAccounts').and.returnValue([])
      }
    };

    mockAuthService = {
      obtenerRoles: jasmine.createSpy('obtenerRoles').and.returnValue([]),
      iniciarSesion: jasmine.createSpy('iniciarSesion'),
      cerrarSesion: jasmine.createSpy('cerrarSesion')
    };

    TestBed.configureTestingModule({
      providers: [
        SesionService,
        { provide: MsalService, useValue: mockMsalService },
        {
          provide: MsalBroadcastService,
          useValue: {
            inProgress$: inProgressSubject.asObservable(),
            msalSubject$: msalSubject.asObservable()
          }
        },
        { provide: AuthService, useValue: mockAuthService }
      ]
    });
  });

  it('debe inicializarse en estado anonimo cuando no hay cuentas registradas', () => {
    service = TestBed.inject(SesionService);

    expect(service.autenticado()).toBeFalse();
    expect(service.nombreUsuario()).toBe('Usuario');
    expect(service.roles()).toEqual([]);
    expect(service.rolActivo()).toBe('Sin rol');
  });

  it('debe inicializarse con los datos de cuenta y roles cuando existe cuenta activa', () => {
    mockMsalService.instance.getActiveAccount.and.returnValue(cuentaEjemplo);
    mockAuthService.obtenerRoles.and.returnValue(['ADMIN', 'DESPACHADOR']);

    service = TestBed.inject(SesionService);

    expect(service.autenticado()).toBeTrue();
    expect(service.nombreUsuario()).toBe('Carlos Morales');
    expect(service.roles()).toEqual(['ADMIN', 'DESPACHADOR']);
    expect(service.rolActivo()).toBe('ADMIN');
  });

  it('debe usar valor por defecto si el nombre de la cuenta contiene solo espacios en blanco', () => {
    mockMsalService.instance.getActiveAccount.and.returnValue({
      name: '   ',
      username: '   '
    });
    mockAuthService.obtenerRoles.and.returnValue([]);

    service = TestBed.inject(SesionService);

    expect(service.autenticado()).toBeTrue();
    expect(service.nombreUsuario()).toBe('Usuario');
    expect(service.rolActivo()).toBe('Sin rol');
  });

  it('debe validar la coincidencia de roles correctamente con tieneRol', () => {
    mockMsalService.instance.getActiveAccount.and.returnValue(cuentaEjemplo);
    mockAuthService.obtenerRoles.and.returnValue(['AUDITOR']);

    service = TestBed.inject(SesionService);

    expect(service.tieneRol('ADMIN', 'AUDITOR')).toBeTrue();
    expect(service.tieneRol('DESPACHADOR')).toBeFalse();
  });

  it('debe delegar iniciarSesion y cerrarSesion al AuthService', () => {
    service = TestBed.inject(SesionService);

    service.iniciarSesion();
    expect(mockAuthService.iniciarSesion).toHaveBeenCalledTimes(1);

    service.cerrarSesion();
    expect(mockAuthService.cerrarSesion).toHaveBeenCalledTimes(1);
  });

  it('debe actualizar el estado reactivo al emitirse un evento LOGIN_SUCCESS', () => {
    service = TestBed.inject(SesionService);
    expect(service.autenticado()).toBeFalse();

    mockMsalService.instance.getActiveAccount.and.returnValue(cuentaEjemplo);
    mockAuthService.obtenerRoles.and.returnValue(['CLIENTE']);

    msalSubject.next({
      eventType: EventType.LOGIN_SUCCESS,
      interactionType: null,
      payload: null,
      error: null,
      timestamp: Date.now(),
      correlationId: 'test-correlation-id'
    });

    expect(service.autenticado()).toBeTrue();
    expect(service.nombreUsuario()).toBe('Carlos Morales');
    expect(service.roles()).toEqual(['CLIENTE']);
    expect(service.rolActivo()).toBe('CLIENTE');
  });

  it('debe actualizar el estado reactivo al emitirse un evento LOGOUT_SUCCESS', () => {
    mockMsalService.instance.getActiveAccount.and.returnValue(cuentaEjemplo);
    mockAuthService.obtenerRoles.and.returnValue(['CLIENTE']);

    service = TestBed.inject(SesionService);
    expect(service.autenticado()).toBeTrue();

    mockMsalService.instance.getActiveAccount.and.returnValue(null);
    mockAuthService.obtenerRoles.and.returnValue([]);

    msalSubject.next({
      eventType: EventType.LOGOUT_SUCCESS,
      interactionType: null,
      payload: null,
      error: null,
      timestamp: Date.now(),
      correlationId: 'test-correlation-id'
    });

    expect(service.autenticado()).toBeFalse();
    expect(service.nombreUsuario()).toBe('Usuario');
    expect(service.roles()).toEqual([]);
  });

  it('debe sincronizar el estado cuando InteractionStatus cambia a None', () => {
    service = TestBed.inject(SesionService);
    expect(service.autenticado()).toBeFalse();

    mockMsalService.instance.getActiveAccount.and.returnValue(cuentaEjemplo);
    mockAuthService.obtenerRoles.and.returnValue(['OPERADOR']);

    inProgressSubject.next(InteractionStatus.None);

    expect(service.autenticado()).toBeTrue();
    expect(service.nombreUsuario()).toBe('Carlos Morales');
    expect(service.roles()).toEqual(['OPERADOR']);
  });
});
