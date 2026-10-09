import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Registro } from '../../../core/models/models';
import { RegistrosService } from '../../../core/services/registros.service';
import { ToastService } from '../../../core/services/toast.service';
import { TIPO_LABEL, fmtDateTime, isNowWithin } from '../../../core/utils/date-utils';

@Component({
  selector: 'app-cuarto-panel-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cuarto-panel-modal.component.html',
})
export class CuartoPanelModalComponent {
  @Input({ required: true }) casaNumero!: string;
  @Input({ required: true }) cuartoNumero!: number;
  @Input({ required: true }) registros!: Registro[];

  @Output() cerrar = new EventEmitter<void>();
  @Output() nuevoSolicitado = new EventEmitter<void>();
  @Output() editarSolicitado = new EventEmitter<Registro>();
  @Output() cambiado = new EventEmitter<void>();

  readonly TIPO_LABEL = TIPO_LABEL;
  readonly fmtDateTime = fmtDateTime;
  readonly isNowWithin = isNowWithin;

  constructor(private registrosSvc: RegistrosService, private toast: ToastService) {}

  get ordenados(): Registro[] {
    return [...this.registros].sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
  }

  async eliminar(r: Registro): Promise<void> {
    if (!confirm(`¿Eliminar el registro de ${r.nombre_persona} en este cuarto? Esta acción no se puede deshacer.`)) return;
    try {
      await this.registrosSvc.eliminar(r.id);
      this.toast.show('Registro eliminado.', 'success');
      this.cambiado.emit();
    } catch (e: any) {
      this.toast.show('Error al eliminar: ' + (e?.message ?? e), 'error');
    }
  }
}
