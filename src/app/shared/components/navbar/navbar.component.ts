import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { SesionService } from '../../../core/auth/sesion.service';
import { ConfirmDialogComponent } from '../../feedback/confirm-dialog.component';

export interface EnlaceNavegacion {
  etiqueta: string;
  ruta: string;
  soloAutenticado: boolean;
  roles?: readonly string[];
  exacto?: boolean;
}

export const ENLACES_NAVEGACION: readonly EnlaceNavegacion[] = [
  { etiqueta: 'Inicio',    ruta: '/',          soloAutenticado: false, exacto: true },
  { etiqueta: 'Rastreo',   ruta: '/rastreo',   soloAutenticado: false },
  { etiqueta: 'Dashboard', ruta: '/dashboard', soloAutenticado: true },
  { etiqueta: 'Catálogo',  ruta: '/catalogo',  soloAutenticado: true },
  { etiqueta: 'Envíos',    ruta: '/envios',    soloAutenticado: true, roles: ['ADMIN', 'DESPACHADOR', 'CLIENTE'] },
  { etiqueta: 'Auditoría', ruta: '/auditoria', soloAutenticado: true, roles: ['ADMIN', 'AUDITOR'] },
  { etiqueta: 'Reportes',  ruta: '/reportes',  soloAutenticado: true, roles: ['ADMIN', 'AUDITOR', 'OPERADOR'] }
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ConfirmDialogComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('botonHamburguesa')
  botonHamburguesa?: ElementRef<HTMLButtonElement>;

  readonly menuMovilAbierto = signal<boolean>(false);
  readonly mostrarDialogoSalida = signal<boolean>(false);

  readonly enlacesVisibles = computed(() =>
    ENLACES_NAVEGACION.filter(
      (e) =>
        !e.soloAutenticado ||
        (this.sesion.autenticado() && (!e.roles || this.sesion.tieneRol(...e.roles)))
    )
  );

  constructor() {
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (this.menuMovilAbierto()) {
          this.cerrarMenuMovil();
        }
      });
  }

  @HostListener('window:keydown.escape')
  manejarEscape(): void {
    if (this.mostrarDialogoSalida()) {
      this.cancelarCerrarSesion();
      return;
    }

    if (this.menuMovilAbierto()) {
      this.cerrarMenuMovil();
      this.botonHamburguesa?.nativeElement?.focus();
    }
  }

  alternarMenuMovil(): void {
    this.menuMovilAbierto.update((valor) => !valor);
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

  abrirDialogoSalida(): void {
    this.mostrarDialogoSalida.set(true);
    this.cerrarMenuMovil();
  }

  confirmarCerrarSesion(): void {
    this.mostrarDialogoSalida.set(false);
    this.sesion.cerrarSesion();
  }

  cancelarCerrarSesion(): void {
    this.mostrarDialogoSalida.set(false);
  }

  iniciarSesion(): void {
    this.cerrarMenuMovil();
    this.sesion.iniciarSesion();
  }

  irAlContenido(evento: Event): void {
    evento.preventDefault();
    const principal = document.querySelector<HTMLElement>('main');
    if (principal) {
      principal.setAttribute('tabindex', '-1');
      principal.focus();
    }
  }
}
