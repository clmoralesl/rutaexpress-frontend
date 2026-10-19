import { ToastComponent } from './shared/feedback/toast.component';

import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
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
