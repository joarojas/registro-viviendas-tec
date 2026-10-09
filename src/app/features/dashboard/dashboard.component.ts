import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CasasService } from '../../core/services/casas.service';
import { RegistrosService } from '../../core/services/registros.service';
import { ToastService } from '../../core/services/toast.service';
import { AgregarCasaModalComponent } from '../../shared/components/agregar-casa-modal/agregar-casa-modal.component';
import { Casa } from '../../core/models/models';
import { isNowWithin } from '../../core/utils/date-utils';

interface Ocupacion { ocupados: number; total: number; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AgregarCasaModalComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  casas = signal<Casa[]>([]);
  occupancy = signal<Record<string, Ocupacion>>({});
  mostrarAgregarCasa = signal(false);
  cargando = signal(true);

  constructor(
    private casasSvc: CasasService,
    private registrosSvc: RegistrosService,
    private toast: ToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const casas = await this.casasSvc.loadCasas();
      this.casas.set(casas);
      this.cargando.set(false);
      // La ocupación se calcula en paralelo, sin bloquear el render de las tarjetas.
      for (const casa of casas) {
        this.calcularOcupacion(casa);
      }
    } catch (e: any) {
      this.cargando.set(false);
      this.toast.show('Error cargando casas: ' + (e?.message ?? e), 'error');
    }
  }

  private async calcularOcupacion(casa: Casa): Promise<void> {
    try {
      const cuartos = await this.casasSvc.loadCuartos(casa.id);
      let ocupados = 0;
      for (const cuarto of cuartos) {
        const registros = await this.registrosSvc.loadRegistros(cuarto.id);
        if (registros.some((r) => isNowWithin(r.inicio, r.fin))) ocupados++;
      }
      this.occupancy.update((m) => ({ ...m, [casa.id]: { ocupados, total: cuartos.length } }));
    } catch {
      // si falla el cálculo de una casa, simplemente no se muestra su badge
    }
  }

  abrirCasa(casaId: string): void {
    this.router.navigate(['/casas', casaId]);
  }

  onCasaCreada(): void {
    this.mostrarAgregarCasa.set(false);
    this.cargar();
  }
}
