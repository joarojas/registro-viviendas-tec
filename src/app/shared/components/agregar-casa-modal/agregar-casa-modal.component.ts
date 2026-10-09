import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CasasService } from '../../../core/services/casas.service';
import { ToastService } from '../../../core/services/toast.service';
import { Casa } from '../../../core/models/models';
import { MAX_NUMERO_CASA } from '../../../core/utils/validators';

@Component({
  selector: 'app-agregar-casa-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agregar-casa-modal.component.html',
})
export class AgregarCasaModalComponent {
  @Output() cancelado = new EventEmitter<void>();
  @Output() creada = new EventEmitter<Casa>();

  readonly maxNumero = MAX_NUMERO_CASA;

  numero = '';
  cantidadCuartos: number | null = null;
  errorCuartos = signal(false);

  constructor(private casasSvc: CasasService, private toast: ToastService) {}

  async guardar(): Promise<void> {
    const cantidad = Number(this.cantidadCuartos);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10) {
      this.errorCuartos.set(true);
      return;
    }
    this.errorCuartos.set(false);

    try {
      const casa = await this.casasSvc.crearCasa(this.numero, cantidad);
      this.toast.show(`Casa ${casa.numero} creada con ${cantidad} cuarto(s).`, 'success');
      this.creada.emit(casa);
    } catch (e: any) {
      if (e?.code === '23505') this.toast.show('Ya existe una casa con ese número.', 'error');
      else this.toast.show(e?.message ?? 'Error al guardar.', 'error');
    }
  }
}
