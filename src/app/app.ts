import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/feedback/toast.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {

  private readonly router = inject(Router);

  ngOnInit(): void {
    const loginCompletado =
      sessionStorage.getItem('rutaexpress_login_completado');

    if (loginCompletado === 'true') {
      sessionStorage.removeItem('rutaexpress_login_completado');
      this.router.navigate(['/dashboard']);
    }
  }
}
