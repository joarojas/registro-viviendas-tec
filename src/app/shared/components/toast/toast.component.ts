import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
})
export class ToastComponent {
  constructor(public toastSvc: ToastService) {}

  borderClass(kind: string): string {
    if (kind === 'error') return 'border-l-4 border-red-800';
    if (kind === 'success') return 'border-l-4 border-tec-700';
    return 'border-l-4 border-tec-800';
  }
}
