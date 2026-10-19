import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface EventoSeguimiento {
  estado: string;
  fecha: string;
}

interface SeguimientoResponse {
  codigoSeguimiento: string;
  estadoActual: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  historial: EventoSeguimiento[];
}

@Component({
  selector: 'app-rastreo-provisional',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="pagina">
      <section class="tarjeta">
        <div class="marca">R</div>
        <p class="etiqueta">RUTAEXPRESS · SEGUIMIENTO</p>
        <h1>Rastrea tu envío</h1>
        <p class="subtitulo">Consulta el estado de tu paquete con su código de seguimiento.</p>

        <form (ngSubmit)="buscar()" class="buscador" novalidate>
          <label for="codigo">Código de seguimiento</label>
          <div class="fila">
            <input
              id="codigo"
              name="codigo"
              [(ngModel)]="codigo"
              placeholder="Ingresa tu código"
              maxlength="50"
              autocomplete="off"
              required
            />
            <button type="submit" [disabled]="cargando">
              {{ cargando ? 'Buscando...' : 'Rastrear' }}
            </button>
          </div>
        </form>

        @if (mensajeError) {
          <div class="alerta alerta-rastreo" role="alert">{{ mensajeError }}</div>
        }

        @if (resultado) {
          <section class="resultado">
            <p class="etiqueta">RESULTADO DEL SEGUIMIENTO</p>
            <h2>{{ resultado.codigoSeguimiento }}</h2>
            <p class="estado-actual">
              Estado actual: <strong>{{ nombreEstado(resultado.estadoActual) }}</strong>
            </p>

            @if (resultado.estadoActual === 'CANCELADO') {
              <div class="alerta">Este envío fue cancelado.</div>
            } @else {
              <div class="pasos">
                @for (paso of pasos; track paso.codigo; let i = $index) {
                  <div class="paso" [class.completado]="indiceActual() >= i"
                       [class.actual]="resultado.estadoActual === paso.codigo">
                    <div class="circulo">{{ indiceActual() >= i ? '✓' : i + 1 }}</div>
                    <div>
                      <strong>{{ paso.nombre }}</strong>
                      @if (resultado.estadoActual === paso.codigo) {
                        <span class="indicador">Estado actual</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <h3>Historial del envío</h3>
            @if (resultado.historial.length > 0) {
              <ul class="historial">
                @for (evento of resultado.historial; track $index) {
                  <li>
                    <strong>{{ nombreEstado(evento.estado) }}</strong>
                    <span>{{ evento.fecha | date:'dd/MM/yyyy HH:mm' }}</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="nota">El historial de movimientos aún no está disponible.</p>
            }

            <p class="nota">Creado: {{ resultado.fechaCreacion | date:'dd/MM/yyyy HH:mm' }}</p>
          </section>
        }

        <button class="volver" type="button" (click)="volverInicio()">
          Volver al inicio
        </button>
      </section>
    </main>
  `,
  styles: [`
    .alerta-rastreo {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 18px;
      padding: 16px;
      border: 2px solid #ff641c;
      border-radius: 12px;
      background: #fff2e9;
      color: #87340c;
      text-align: left;
      animation: aparecerError 250ms ease-out;
    }

    .alerta-rastreo strong {
      font-size: 15px;
    }

    @keyframes aparecerError {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    :host {
      display: block;
      min-height: 100vh;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #282522;
      background: #faf7f3;
    }

    * {
      box-sizing: border-box;
    }

    .pagina {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }

    .tarjeta {
      width: 100%;
      max-width: 520px;
      padding: 42px 32px;
      border: 1px solid #eee4da;
      border-radius: 20px;
      background: #ffffff;
      text-align: center;
      box-shadow: 0 12px 35px rgba(40, 37, 34, 0.06);
    }

    .marca {
      display: grid;
      place-items: center;
      width: 54px;
      height: 54px;
      margin: 0 auto 24px;
      border-radius: 14px;
      background: #ff641c;
      color: #ffffff;
      font-size: 30px;
      font-weight: 800;
    }

    .etiqueta {
      color: #d95517;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1.5px;
    }

    h1 {
      margin: 15px 0;
      font-size: 30px;
    }

    .codigo {
      margin: 22px 0;
      padding: 16px;
      border-radius: 10px;
      background: #fff1e8;
      color: #c94e13;
      font-size: 22px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }

    .mensaje {
      color: #756b63;
      line-height: 1.7;
    }

    button {
      margin-top: 22px;
      padding: 14px 24px;
      border: none;
      border-radius: 10px;
      background: #ff641c;
      color: #ffffff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    button:hover {
      background: #e9520d;
    }

    /* Ajustes del formulario y seguimiento */
    .tarjeta {
      max-width: 600px;
      padding: 42px 36px;
    }

    .subtitulo {
      color: #756b63;
      line-height: 1.6;
      margin: 16px 0 28px;
    }

    .buscador {
      width: 100%;
      margin: 24px 0;
      text-align: left;
    }

    .buscador label {
      display: block;
      margin-bottom: 10px;
      font-weight: 700;
      color: #282522;
    }

    .fila {
      display: flex;
      align-items: stretch;
      gap: 12px;
      width: 100%;
    }

    .fila input {
      flex: 1;
      min-width: 0;
      padding: 14px 16px;
      border: 1px solid #e3d8ce;
      border-radius: 10px;
      font: inherit;
      font-size: 15px;
    }

    .fila button {
      margin-top: 0;
      white-space: nowrap;
    }

    .alerta {
      padding: 14px 16px;
      margin: 18px 0;
      border-radius: 10px;
      background: #fff0ed;
      color: #b42318;
      text-align: left;
    }

    .resultado {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #eee4da;
      text-align: left;
    }

    .resultado h2 {
      overflow-wrap: anywhere;
      color: #282522;
    }

    .estado-actual {
      padding: 14px;
      border-radius: 10px;
      background: #fff1e8;
      color: #c94e13;
    }

    .pasos {
      margin: 28px 0;
    }

    .paso {
      display: flex;
      align-items: center;
      gap: 16px;
      min-height: 65px;
      color: #94877e;
    }

    .paso.completado {
      color: #282522;
    }

    .circulo {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      flex-shrink: 0;
      border-radius: 50%;
      background: #eee4da;
      color: #756b63;
      font-weight: 700;
    }

    .completado .circulo {
      background: #ff641c;
      color: white;
    }

    .indicador {
      display: block;
      margin-top: 4px;
      color: #d95517;
      font-size: 12px;
    }

    .historial {
      padding-left: 22px;
    }

    .historial li {
      margin-bottom: 12px;
    }

    .historial span {
      display: block;
      color: #756b63;
      font-size: 13px;
    }

    .nota {
      color: #756b63;
      line-height: 1.6;
    }

    .volver {
      margin-top: 28px;
    }

    @media (max-width: 560px) {
      .tarjeta {
        padding: 32px 22px;
      }

      .fila {
        flex-direction: column;
      }

      .fila button {
        width: 100%;
      }
    }
  `]
})
export class RastreoProvisional implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  codigo = '';
  cargando = false;
  mensajeError = '';
  resultado: SeguimientoResponse | null = null;

  readonly pasos = [
    { codigo: 'CREADO', nombre: 'Envío creado' },
    { codigo: 'ACEPTADO', nombre: 'Envío aceptado' },
    { codigo: 'EN_BODEGA', nombre: 'En bodega' },
    { codigo: 'EN_RUTA', nombre: 'En camino' },
    { codigo: 'ENTREGADO', nombre: 'Entregado' }
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const codigoUrl = this.route.snapshot.paramMap.get('codigo') ?? params.get('codigo');
      if (codigoUrl) {
        this.codigo = codigoUrl;
        this.buscar();
      }
    });
  }

  buscar(): void {
    const codigoLimpio = this.codigo.trim();
    const alerta = document.querySelector('.alerta-rastreo');

    if (alerta instanceof HTMLElement) {
      alerta.style.animation = 'none';
      alerta.getBoundingClientRect();
      alerta.style.animation = '';
    }
    this.mensajeError = '';
    this.resultado = null;

    if (codigoLimpio.length < 4) {
      this.mensajeError = 'Ingresa un código de seguimiento válido.';
      return;
    }

    if (!/^[a-zA-Z0-9-]{4,50}$/.test(codigoLimpio)) {
      this.mensajeError = 'Ingresa un código de seguimiento válido.';
      return;
    }

    this.cargando = true;

    this.http.get<SeguimientoResponse>(
      `${environment.apiUrl}/api/publico/seguimiento/${encodeURIComponent(codigoLimpio)}`
    ).subscribe({
      next: respuesta => {
        this.resultado = respuesta;
        this.cargando = false;
      },
      error: (error: HttpErrorResponse) => {
        this.cargando = false;
        this.mensajeError = error.status === 404
          ? 'Ingresa un código de seguimiento válido.'
          : 'No fue posible consultar el seguimiento. Inténtalo nuevamente.';
      }
    });
  }

  indiceActual(): number {
    return this.pasos.findIndex(paso => paso.codigo === this.resultado?.estadoActual);
  }

  nombreEstado(estado: string): string {
    return this.pasos.find(paso => paso.codigo === estado)?.nombre
      ?? (estado === 'CANCELADO' ? 'Cancelado' : estado);
  }

  volverInicio(): void {
    this.router.navigate(['/']);
  }
}