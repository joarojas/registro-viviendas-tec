import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CasasService } from '../../../core/services/casas.service';
import { ToastService } from '../../../core/services/toast.service';
import { Casa } from '../../../core/models/models';
import { MAX_NUMERO_CASA } from '../../../core/utils/validators';

@Component({
  selector: 'app-editar-casa-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-casa-modal.component.html',
})
export class EditarCasaModalComponent implements OnInit {
  @Input({ required: true }) casa!: Casa;

  @Output() cancelado = new EventEmitter<void>();
  @Output() actualizada = new EventEmitter<Casa>();
  @Output() eliminada = new EventEmitter<void>();

  readonly maxNumero = MAX_NUMERO_CASA;

  numero = '';
  cantidadCuartos: number | null = null;
  errorCuartos = signal(false);
  eliminando = false;
  guardando = false;

  constructor(private casasSvc: CasasService, private toast: ToastService) {}

  ngOnInit(): void {
    this.numero = this.casa.numero;
    this.cantidadCuartos = this.casa.cantidad_cuartos;
  }

  async guardar(): Promise<void> {
    const cantidad = Number(this.cantidadCuartos);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10) {
      this.errorCuartos.set(true);
      return;
    }
    this.errorCuartos.set(false);
    this.guardando = true;
    try {
      const actualizada = await this.casasSvc.actualizarCasa(this.casa.id, this.numero, cantidad);
      this.toast.show(`Casa ${actualizada.numero} actualizada.`, 'success');
      this.actualizada.emit(actualizada);
    } catch (e: any) {
      if (e?.code === '23505') this.toast.show('Ya existe otra casa con ese número.', 'error');
      else this.toast.show(e?.message ?? 'Error al guardar.', 'error');
    } finally {
      this.guardando = false;
    }
  }

  async eliminar(): Promise<void> {
    this.eliminando = true;
    try {
      const cantidadRegistros = await this.casasSvc.contarRegistrosDeCasa(this.casa.id);
      const advertencia = cantidadRegistros > 0
        ? `Esta casa tiene ${cantidadRegistros} registro(s) de ocupación guardados, que también se van a borrar. `
        : '';
      const confirmado = confirm(
        `¿Eliminar la casa ${this.casa.numero} junto con todos sus cuartos? ${advertencia}Esta acción no se puede deshacer.`
      );
      if (!confirmado) { this.eliminando = false; return; }

      await this.casasSvc.eliminarCasa(this.casa.id);
      this.toast.show(`Casa ${this.casa.numero} eliminada.`, 'success');
      this.eliminada.emit();
    } catch (e: any) {
      this.toast.show(e?.message ?? 'Error al eliminar la casa.', 'error');
    } finally {
      this.eliminando = false;
    }
  }
}
