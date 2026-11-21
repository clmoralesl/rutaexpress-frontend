import {
  ChangeDetectionStrategy,
  Component,
  Input,
  signal
} from '@angular/core';

@Component({
  selector: 'app-ayuda-plegable',
  standalone: true,
  template: `
    <div class="ayuda-plegable-contenedor">
      <button
        type="button"
        class="btn-toggle-ayuda"
        [attr.aria-expanded]="abierto()"
        [attr.aria-controls]="idAyuda"
        (click)="alternar()">
        <span class="icono-ayuda" aria-hidden="true">{{ abierto() ? '−' : '?' }}</span>
        <span class="titulo-ayuda">{{ titulo }}</span>
      </button>

      <div
        [id]="idAyuda"
        class="contenido-ayuda"
        [hidden]="!abierto()">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .ayuda-plegable-contenedor {
      margin-top: 0.25rem;
      margin-bottom: 0.5rem;
    }
    .btn-toggle-ayuda {
      background: none;
      border: none;
      color: #2563eb;
      font-size: 0.8125rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.2rem 0;
      text-decoration: underline;
    }
    .btn-toggle-ayuda:hover {
      color: #1d4ed8;
    }
    .icono-ayuda {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      background: #e0e7ff;
      color: #3730a3;
      font-size: 0.75rem;
      font-weight: bold;
      text-decoration: none;
    }
    .contenido-ayuda {
      margin-top: 0.375rem;
      padding: 0.5rem 0.75rem;
      background: #f8fafc;
      border-left: 3px solid #3b82f6;
      border-radius: 0 4px 4px 0;
      font-size: 0.8125rem;
      color: #334155;
      line-height: 1.4;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AyudaPlegableComponent {
  @Input({ required: true }) idAyuda!: string;
  @Input() titulo: string = '¿Cómo se calcula?';

  readonly abierto = signal<boolean>(false);

  alternar(): void {
    this.abierto.update(v => !v);
  }
}
