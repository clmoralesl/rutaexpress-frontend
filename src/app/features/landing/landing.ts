
import {
  Component,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  inject,
  signal
} from '@angular/core';

import { Router, RouterModule } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { EventType, InteractionStatus } from '@azure/msal-browser';
import { Subject, takeUntil, filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class Landing implements OnInit, OnDestroy {

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly msalService = inject(MsalService);
  private readonly msalBroadcast = inject(MsalBroadcastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  codigoSeguimiento = signal('');
  nombreUsuario = signal<string | null>(null);

  ngOnInit(): void {
    this.actualizarSesion();

    this.msalBroadcast.inProgress$
      .pipe(
        filter((estado) => estado === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.actualizarSesion());

    this.msalBroadcast.msalSubject$
      .pipe(
        filter((evento) =>
          evento.eventType === EventType.LOGIN_SUCCESS ||
          evento.eventType === EventType.ACTIVE_ACCOUNT_CHANGED ||
          evento.eventType === EventType.LOGOUT_SUCCESS
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.actualizarSesion());
  }

  private actualizarSesion(): void {
    const cuenta =
      this.msalService.instance.getActiveAccount() ??
      this.msalService.instance.getAllAccounts()[0] ??
      null;

    this.nombreUsuario.set(
      cuenta?.name ?? cuenta?.username ?? null
    );

    this.cdr.detectChanges();
  }

  actualizarCodigo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.codigoSeguimiento.set(input.value);
  }

  rastrearEnvio(): void {
    const codigo = this.codigoSeguimiento().trim();

    if (!codigo) {
      return;
    }

    this.router.navigate(['/rastreo'], {
      queryParams: { codigo }
    });
  }

  iniciarSesion(): void {
    this.authService.iniciarSesion();
  }

  irDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
