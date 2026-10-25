import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { EventType, InteractionStatus } from '@azure/msal-browser';
import { filter } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Servicio reactivo de gestion de sesion de usuario para la interfaz.
 * Centraliza las senales de autenticacion, nombre de usuario y roles,
 * abstrayendo a los componentes de la interaccion directa con la biblioteca MSAL.
 */
@Injectable({
  providedIn: 'root'
})
export class SesionService {
  private readonly msalService = inject(MsalService);
  private readonly msalBroadcast = inject(MsalBroadcastService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly autenticado = signal<boolean>(false);
  readonly nombreUsuario = signal<string>('Usuario');
  readonly roles = signal<string[]>([]);

  readonly rolActivo = computed(() => {
    const listaRoles = this.roles();
    return listaRoles.length > 0 ? listaRoles[0] : 'Sin rol';
  });

  constructor() {
    this.actualizarEstado();
    this.suscribirEventosMsal();
  }

  /**
   * Sincroniza las senales reactivas con el estado actual de la cuenta y los tokens de sesion.
   */
  actualizarEstado(): void {
    const cuenta =
      this.msalService.instance.getActiveAccount() ??
      this.msalService.instance.getAllAccounts()[0] ??
      null;

    const estaAutenticado = cuenta !== null;
    this.autenticado.set(estaAutenticado);

    if (estaAutenticado) {
      const nombreCandidato = cuenta.name ?? cuenta.username ?? 'Usuario';
      const nombreLimpio = nombreCandidato.trim();
      this.nombreUsuario.set(nombreLimpio !== '' ? nombreLimpio : 'Usuario');
      this.roles.set(this.authService.obtenerRoles());
    } else {
      this.nombreUsuario.set('Usuario');
      this.roles.set([]);
    }
  }

  /**
   * Determina si el usuario en sesion cuenta con al menos uno de los roles solicitados.
   */
  tieneRol(...rolesPermitidos: string[]): boolean {
    const rolesUsuario = this.roles();
    return rolesPermitidos.some((rol) => rolesUsuario.includes(rol));
  }

  /**
   * Delega el inicio de sesion hacia el proveedor de identidad configurado.
   */
  iniciarSesion(): void {
    this.authService.iniciarSesion();
  }

  /**
   * Delega el cierre de sesion hacia el proveedor de identidad configurado.
   */
  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }

  private suscribirEventosMsal(): void {
    this.msalBroadcast.inProgress$
      .pipe(
        filter((estado) => estado === InteractionStatus.None),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.actualizarEstado());

    this.msalBroadcast.msalSubject$
      .pipe(
        filter(
          (evento) =>
            evento.eventType === EventType.LOGIN_SUCCESS ||
            evento.eventType === EventType.LOGOUT_SUCCESS ||
            evento.eventType === EventType.ACTIVE_ACCOUNT_CHANGED
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.actualizarEstado());
  }
}
