import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (visible) {
      <div class="overlay">
        <section class="dialog" role="alertdialog" aria-modal="true"
                 aria-labelledby="confirm-title"
                 aria-describedby="confirm-message">
          <h2 id="confirm-title">{{ title }}</h2>
          <p id="confirm-message">{{ message }}</p>
          <div class="actions">
            <button type="button" (click)="cancelled.emit()">Cancelar</button>
            <button type="button" class="primary"
                    (click)="confirmed.emit()">Confirmar</button>
          </div>
        </section>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; z-index: 9998;
      background: #0009; display: grid;
      place-items: center; padding: 20px;
    }
    .dialog {
      background: white; color: #172033;
      padding: 28px; border-radius: 14px;
      width: min(420px, 100%);
      box-shadow: 0 12px 36px #0003;
    }
    .actions {
      display: flex; justify-content: flex-end;
      gap: 12px; margin-top: 24px;
    }
    button {
      padding: 10px 18px; border-radius: 8px;
      border: 1px solid #cbd5e1; cursor: pointer;
      background: white;
    }
    .primary {
      background: #1d4ed8; color: white;
      border-color: #1d4ed8;
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Confirmar acción';
  @Input() message = '¿Deseas continuar?';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
