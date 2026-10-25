import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { BehaviorSubject } from 'rxjs';
import { Login } from './login';
import { AuthService } from '../../core/auth/auth.service';
import { SesionService } from '../../core/auth/sesion.service';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let mockRouter: any;
  let mockAuthService: any;
  let inProgressSubject: BehaviorSubject<InteractionStatus>;
  let mockAutenticado: WritableSignal<boolean>;

  beforeEach(() => {
    inProgressSubject = new BehaviorSubject<InteractionStatus>(InteractionStatus.Startup);
    mockAutenticado = signal(false);

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    mockAuthService = {
      iniciarSesion: jasmine.createSpy('iniciarSesion')
    };

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        {
          provide: SesionService,
          useValue: {
            autenticado: mockAutenticado
          }
        },
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: MsalBroadcastService,
          useValue: {
            inProgress$: inProgressSubject.asObservable()
          }
        }
      ]
    });
  });

  it('debe redirigir directamente al dashboard si la sesión ya se encuentra activa', () => {
    mockAutenticado.set(true);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(mockAuthService.iniciarSesion).not.toHaveBeenCalled();
  });

  it('debe solicitar el inicio de sesión cuando el estado de interacción MSAL sea None', () => {
    mockAutenticado.set(false);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    expect(mockAuthService.iniciarSesion).not.toHaveBeenCalled();

    inProgressSubject.next(InteractionStatus.None);

    expect(mockAuthService.iniciarSesion).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('debe permitir iniciar sesión manualmente mediante el botón de acceso', () => {
    mockAutenticado.set(false);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('.btn-acceso');
    expect(boton).toBeTruthy();

    boton.click();
    expect(mockAuthService.iniciarSesion).toHaveBeenCalled();
  });
});
