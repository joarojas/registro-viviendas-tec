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

  async enviarReporte(): Promise<void> {
    this.enviando = true;
    try {
      await this.reporte.enviarReporte();
      this.toast.show(`Reporte enviado a ${this.auth.user()?.email ?? 'tu correo'}.`, 'success');
    } catch (e: any) {
      this.toast.show('No se pudo enviar el reporte: ' + (e?.message ?? e), 'error');
    } finally {
      this.enviando = false;
    }
  }

  cerrarSesion(): void {
    this.auth.signOut();
  }
}
