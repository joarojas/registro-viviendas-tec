import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ReporteService } from '../../../core/services/reporte.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  enviando = false;

  constructor(
    public auth: AuthService,
    private reporte: ReporteService,
    private toast: ToastService,
  ) {}


  cerrarSesion(): void {
    this.auth.signOut();
  }
}
