import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html'
})
export class Login {

  constructor(private readonly authService: AuthService) {}

  iniciarSesion(): void {
    this.authService.iniciarSesion();
  }
}