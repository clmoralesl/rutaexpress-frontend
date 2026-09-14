import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  nombreUsuario: string;
  rolActivo: string;

  constructor(private readonly authService: AuthService) {
    this.nombreUsuario = this.authService.obtenerNombreUsuario();
    this.rolActivo = this.authService.obtenerRolActivo();
  }

  tieneRol(...roles: string[]): boolean {
    return this.authService.tieneRol(...roles);
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}