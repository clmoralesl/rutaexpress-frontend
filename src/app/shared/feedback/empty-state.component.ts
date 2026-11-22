import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <section class="empty-state" role="status">
      <div class="symbol" aria-hidden="true">◇</div>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
    </section>
  `,
  styles: [`
    .empty-state {
      text-align: center; padding: 48px 24px;
      color: #64748b;
    }
    .symbol { font-size: 40px; color: #94a3b8; }
    h3 { color: #334155; margin: 12px 0 8px; }
    p { margin: 0; }
  `]
})
export class EmptyStateComponent {
  @Input() title = 'Sin resultados';
  @Input() message = 'Aún no tienes envíos registrados.';
}
