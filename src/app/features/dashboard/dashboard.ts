import { ConfirmDialogComponent } from '../../shared/feedback/confirm-dialog.component';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  confirmarSalida = false;
  nombreUsuario: string;
  rolActivo: string;
  respuestaApi: any;

  constructor(
    private readonly authService: AuthService,
    private readonly http: HttpClient
  ) {
    this.nombreUsuario = this.authService.obtenerNombreUsuario();
    this.rolActivo = this.authService.obtenerRolActivo();
  }

  tieneRol(...roles: string[]): boolean {
    return this.authService.tieneRol(...roles);
  }

  cerrarSesion(): void {
    this.confirmarSalida = true;
  }

  confirmarCerrarSesion(): void {
    this.confirmarSalida = false;
    this.authService.cerrarSesion();
  }

  probarInterceptor(): void {
    const url = `${environment.apiUrl}/api/cliente/mis-envios`;
    this.http.get(url).subscribe({
      next: (res) => this.respuestaApi = res,
      error: (err) => this.respuestaApi = { error: err.message }
    });
  }
}
