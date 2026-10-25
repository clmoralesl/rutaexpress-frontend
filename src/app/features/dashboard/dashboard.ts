import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  respuestaApi: any;

  constructor(private readonly http: HttpClient) {}

  probarInterceptor(): void {
    const url = `${environment.apiUrl}/api/cliente/mis-envios`;
    this.http.get(url).subscribe({
      next: (res) => this.respuestaApi = res,
      error: (err) => this.respuestaApi = { error: err.message }
    });
  }
}
