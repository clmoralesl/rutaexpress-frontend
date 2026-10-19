import { Component, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <section class="toast-container" aria-label="Notificaciones">
      @for (item of notifications.messages(); track item.id) {
        <div class="toast" [class]="item.type"
             role="status">
          <span>{{ item.message }}</span>
          <button type="button" (click)="notifications.dismiss(item.id)"
                  aria-label="Cerrar notificación">×</button>
        </div>
      }
    </section>
  `,
  styles: [`
    .toast-container {
      position: fixed; top: 20px; right: 20px;
      z-index: 9999; display: grid; gap: 10px;
      max-width: min(380px, calc(100vw - 40px));
    }
    .toast {
      display: flex; justify-content: space-between;
      align-items: center; gap: 16px;
      padding: 14px 18px; border-radius: 10px;
      background: #fff; color: #172033;
      border-left: 5px solid #2563eb;
      box-shadow: 0 6px 24px #0002;
      animation: enter .2s ease-out;
      overflow-wrap: anywhere;
    }
    .success { border-color: #16a34a; }
    .warning { border-color: #d97706; }
    .error { border-color: #dc2626; }
    button {
      background: transparent; border: 0;
      font-size: 22px; cursor: pointer;
      color: inherit;
    }
    @keyframes enter {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .toast { animation: none; }
    }
  `]
})
export class ToastComponent {
  readonly notifications = inject(NotificationService);
}
