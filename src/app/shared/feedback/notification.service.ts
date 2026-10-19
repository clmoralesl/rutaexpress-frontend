import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly messages = signal<ToastMessage[]>([]);
  private nextId = 0;

  show(message: string, type: ToastType = 'info'): void {
    const id = ++this.nextId;
    this.messages.update(items => [...items, { id, type, message }]);
    globalThis.setTimeout(() => this.dismiss(id), 5000);
  }

  success(message: string): void { this.show(message, 'success'); }
  warning(message: string): void { this.show(message, 'warning'); }
  error(message: string): void { this.show(message, 'error'); }
  info(message: string): void { this.show(message, 'info'); }

  dismiss(id: number): void {
    this.messages.update(items => items.filter(item => item.id !== id));
  }
}
