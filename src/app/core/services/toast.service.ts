import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'error' | 'success';
export interface ToastMsg { id: number; text: string; kind: ToastKind; }

let nextId = 1;

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<ToastMsg[]>([]);

  show(text: string, kind: ToastKind = 'info'): void {
    const id = nextId++;
    this.toasts.update((list) => [...list, { id, text, kind }]);
    setTimeout(() => this.dismiss(id), 4200);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
