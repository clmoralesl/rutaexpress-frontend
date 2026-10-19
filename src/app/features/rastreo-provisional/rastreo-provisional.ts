
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-rastreo-provisional',
  standalone: true,
  template: `
    <main class="pagina">
      <section class="tarjeta">
        <div class="marca">R</div>

        <p class="etiqueta">RUTAEXPRESS · SEGUIMIENTO</p>
        <h1>Seguimiento de envío</h1>

        @if (codigo) {
          <p>Tu código de seguimiento es:</p>

          <div class="codigo">
            {{ codigo }}
          </div>

          <p class="mensaje">
            El código se recibió correctamente.
            La consulta del estado del envío estará disponible
            cuando se implemente el módulo de rastreo.
          </p>
        } @else {
          <p class="mensaje">
            No ingresaste un código de seguimiento.
          </p>
        }

        <button type="button" (click)="volverInicio()">
          ← Volver al inicio
        </button>
      </section>
    </main>
  `,
  styles: [`
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
  `]
})
export class RastreoProvisional {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly codigo =
    this.ruta.snapshot.queryParamMap.get('codigo')?.trim() ?? '';

  volverInicio(): void {
    this.router.navigate(['/']);
  }
}
