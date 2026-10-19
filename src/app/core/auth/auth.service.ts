
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private readonly msalService: MsalService,
    private readonly router: Router
  ) {}

  iniciarSesion(): void {
    this.msalService.loginRedirect({
      scopes: environment.azure.scopes
    }).subscribe();
  }

  obtenerNombreUsuario(): string {
    const cuenta = this.msalService.instance.getActiveAccount();

    return cuenta?.name ?? cuenta?.username ?? 'Usuario';
  }

  obtenerRoles(): string[] {
    const token = sessionStorage.getItem('access_token');

    if (!token) {
      return [];
    }

    try {
      const payloadBase64 = token.split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const payload = JSON.parse(atob(payloadBase64));

      return payload.roles ?? [];
    } catch {
      return [];
    }
  }

  obtenerRolActivo(): string {
    const roles = this.obtenerRoles();

    return roles.length > 0 ? roles[0] : 'Sin rol';
  }

  tieneRol(...rolesPermitidos: string[]): boolean {
    const rolesUsuario = this.obtenerRoles();

    return rolesPermitidos.some(
      (rol) => rolesUsuario.includes(rol)
    );
  }

  cerrarSesion(): void {
    sessionStorage.removeItem('access_token');

    this.msalService.logoutRedirect({
      postLogoutRedirectUri: typeof window !== 'undefined' ? (window.location.origin + '/') : environment.azure.redirectUri
    }).subscribe();
  }
}
