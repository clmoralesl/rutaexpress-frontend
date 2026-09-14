import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.html'
})
export class Dashboard {

  constructor(private readonly authService: AuthService) {}

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}
