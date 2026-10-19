import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="skeleton-group" role="status"
         aria-label="Cargando contenido">
      @for (item of rowsArray; track $index) {
        <div class="skeleton"></div>
      }
      <span class="sr-only">Cargando...</span>
    </div>
  `,
  styles: [`
    .skeleton-group { display: grid; gap: 12px; }
    .skeleton {
      height: 22px; border-radius: 6px;
      background: linear-gradient(90deg,
        #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite linear;
    }
    .sr-only {
      position: absolute; width: 1px; height: 1px;
      padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0,0,0,0); white-space: nowrap;
    }
    @keyframes shimmer {
      to { background-position: -200% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton { animation: none; }
    }
  `]
})
export class SkeletonComponent {
  private count = 3;
  rowsArray = Array.from({ length: 3 });

  @Input() set rows(value: number) {
    this.count = Math.max(1, Math.min(20, Math.floor(value || 3)));
    this.rowsArray = Array.from({ length: this.count });
  }
}
