import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter, take } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SesionService } from '../../core/auth/sesion.service';

/**
 * Componente de acceso al sistema RutaExpress.
 * En cumplimiento de la decision D4, opera como redireccion directa:
 * - Si el usuario ya posee sesion activa, navega al dashboard.
 * - Si no posee sesion, espera el fin de interacciones pendientes e inicia el flujo de autenticacion con Microsoft.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
  private readonly sesion = inject(SesionService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly msalBroadcast = inject(MsalBroadcastService);

  ngOnInit(): void {
    if (this.sesion.autenticado()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.msalBroadcast.inProgress$
      .pipe(
        filter((estado) => estado === InteractionStatus.None),
        take(1)
      )
      .subscribe(() => this.authService.iniciarSesion());
  }

  iniciarSesionManual(): void {
    this.authService.iniciarSesion();
  }
}
