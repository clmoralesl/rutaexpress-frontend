import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
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

  procesarRedireccion(): void {
    this.msalService.handleRedirectObservable().subscribe({
      next: (resultado: AuthenticationResult | null) => {
        if (!resultado?.account) {
          return;
        }

        this.msalService.instance.setActiveAccount(resultado.account);

        this.msalService.acquireTokenSilent({
          account: resultado.account,
          scopes: environment.azure.scopes
        }).subscribe({
          next: (tokenResult) => {
            sessionStorage.setItem('access_token', tokenResult.accessToken);
            this.router.navigate(['/dashboard']);
          },
          error: (error) => {
            console.error('No fue posible obtener el access token', error);
          }
        });
      },
      error: (error) => {
        console.error('Error procesando la autenticación con Microsoft', error);
      }
    });
  }

  cerrarSesion(): void {
    sessionStorage.removeItem('access_token');

    this.msalService.logoutRedirect({
      postLogoutRedirectUri: environment.azure.redirectUri
    }).subscribe();
  }
}