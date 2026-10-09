import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Departamento, Registro, TipoOcupacion } from '../../../core/models/models';
import { RegistrosService, RegistroPayload, EXCLUSION_VIOLATION } from '../../../core/services/registros.service';
import { DepartamentosService } from '../../../core/services/departamentos.service';
import { ConfirmacionService } from '../../../core/services/confirmacion.service';
import { ToastService } from '../../../core/services/toast.service';
import { FAR_FUTURE, TIPO_LABEL, fmtDateTime, crearFechaCostaRica, hoyCR, partesCR } from '../../../core/utils/date-utils';
import { EMAIL_RE, NOMBRE_PERSONA_RE, DEPTO_NOMBRE_RE, MAX_NOMBRE_PERSONA, MAX_CORREO, MAX_DEPTO_NOMBRE } from '../../../core/utils/validators';

@Component({
  selector: 'app-registro-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro-form-modal.component.html',
})
export class RegistroFormModalComponent implements OnInit {
  @Input({ required: true }) casaNumero!: string;
  @Input({ required: true }) cuartoId!: string;
  @Input({ required: true }) cuartoNumero!: number;
  @Input({ required: true }) departamentos!: Departamento[];
  /** Todos los registros de este cuarto (incluye el que se está editando, si aplica). */
  @Input({ required: true }) registrosExistentes!: Registro[];
  @Input() editing: Registro | null = null;

  @Output() cancelado = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();
  @Output() departamentoCreado = new EventEmitter<Departamento>();

  readonly TIPO_LABEL = TIPO_LABEL;
  readonly maxNombre = MAX_NOMBRE_PERSONA;
  readonly maxCorreo = MAX_CORREO;
  readonly maxDepto = MAX_DEPTO_NOMBRE;

  nombre = '';
  correo = '';
  deptoId = '';
  deptoNuevoNombre = '';
  tipo: TipoOcupacion = 'fijo';
  diaCompleto = true;
  indefinido = false;
  fechaIni = '';
  horaIni = '08:00';
  fechaFin = '';
  horaFin = '17:00';
  conflicto = signal<string | null>(null);

  constructor(
    private registrosSvc: RegistrosService,
    private departamentosSvc: DepartamentosService,
    private confirmacionSvc: ConfirmacionService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    const hoy = hoyCR();
    if (this.editing) {
      const r = this.editing;
      this.nombre = r.nombre_persona;
      this.correo = r.correo_persona ?? '';
      this.deptoId = r.departamento_id ?? '';
      this.tipo = r.tipo;
      this.diaCompleto = r.dia_completo;
      this.indefinido = r.sin_fecha_salida;
      const ini = partesCR(r.inicio);
      this.fechaIni = ini.fecha;
      this.horaIni = ini.hora;
      if (r.sin_fecha_salida) {
        this.fechaFin = hoy;
        this.horaFin = '17:00';
      } else {
        const fin = partesCR(r.fin);
        this.fechaFin = fin.fecha;
        this.horaFin = fin.hora;
      }
    } else {
      this.fechaIni = hoy;
      this.fechaFin = hoy;
    }
  }

  get otrosRegistros(): Registro[] {
    return this.registrosExistentes.filter((r) => !this.editing || r.id !== this.editing.id);
  }

  async guardar(): Promise<void> {
    this.conflicto.set(null);

    if (!this.nombre.trim() || !NOMBRE_PERSONA_RE.test(this.nombre.trim())) {
      this.toast.show('Ingresá un nombre válido (solo letras y espacios, 2 a 80 caracteres).', 'error');
      return;
    }
    if (!this.correo.trim() || !EMAIL_RE.test(this.correo.trim())) {
      this.toast.show('Ingresá un correo válido para la persona ocupante.', 'error');
      return;
    }
    if (!this.deptoId) { this.toast.show('Seleccioná un departamento.', 'error'); return; }

    let deptoId = this.deptoId;
    if (deptoId === '__new__') {
      const nombreNuevo = this.deptoNuevoNombre.trim();
      if (!nombreNuevo || !DEPTO_NOMBRE_RE.test(nombreNuevo)) {
        this.toast.show('Ingresá un nombre de departamento válido (2 a 100 caracteres).', 'error');
        return;
      }
      try {
        const nuevo = await this.departamentosSvc.crearDepartamento(nombreNuevo);
        deptoId = nuevo.id;
        this.departamentoCreado.emit(nuevo);
      } catch (e: any) {
        this.toast.show('Error creando departamento: ' + (e?.message ?? e), 'error');
        return;
      }
    }

    if (!this.fechaIni) { this.toast.show('Ingresá la fecha de ingreso.', 'error'); return; }
    if (!this.indefinido && !this.fechaFin) {
      this.toast.show('Ingresá la fecha de salida o marcá "sin fecha definida".', 'error');
      return;
    }

    let inicioISO: string;
    let finISO: string;
    if (this.diaCompleto) {
      inicioISO = crearFechaCostaRica(this.fechaIni, '00:00:00');
      finISO = this.indefinido ? FAR_FUTURE : crearFechaCostaRica(this.fechaFin, '23:59:59');
    } else {
      inicioISO = crearFechaCostaRica(this.fechaIni, this.horaIni || '00:00');
      finISO = this.indefinido ? FAR_FUTURE : crearFechaCostaRica(this.fechaFin, this.horaFin || '23:59');
    }

    if (new Date(finISO) <= new Date(inicioISO)) {
      this.toast.show('La fecha/hora de salida debe ser posterior a la de ingreso.', 'error');
      return;
    }

    const choque = this.registrosSvc.buscarChoque(this.registrosExistentes, inicioISO, finISO, this.editing?.id);
    if (choque) {
      this.conflicto.set(
        `Choque de horario: este cuarto ya está asignado a ${choque.nombre_persona} (${TIPO_LABEL[choque.tipo]}) ` +
        `del ${fmtDateTime(choque.inicio)} al ${choque.sin_fecha_salida ? 'indefinido' : fmtDateTime(choque.fin)}. No se puede guardar.`
      );
      return;
    }

    const esNuevo = !this.editing;
    const payload: RegistroPayload = {
      cuarto_id: this.cuartoId,
      nombre_persona: this.nombre.trim(),
      correo_persona: this.correo.trim(),
      departamento_id: deptoId,
      tipo: this.tipo,
      dia_completo: this.diaCompleto,
      sin_fecha_salida: this.indefinido,
      inicio: inicioISO,
      fin: finISO,
    };

    try {
      if (this.editing) await this.registrosSvc.actualizar(this.editing.id, payload);
      else await this.registrosSvc.crear(payload);

      this.toast.show(
        this.editing ? `Registro de ${this.nombre} actualizado.` : `${this.nombre} registrado en cuarto ${this.cuartoNumero}.`,
        'success',
      );
      this.guardado.emit();

      // El correo de confirmación solo se manda al crear un registro nuevo
      // (no en cada edición), y no bloquea el flujo si falla el envío.
      if (esNuevo) {
        this.confirmacionSvc.enviarConfirmacion({
          correo: payload.correo_persona,
          nombre: payload.nombre_persona,
          casaNumero: this.casaNumero,
          cuartoNumero: this.cuartoNumero,
          tipo: payload.tipo,
          inicio: payload.inicio,
          fin: payload.fin,
          sinFechaSalida: payload.sin_fecha_salida,
        })
          .then(() => this.toast.show(`Correo de confirmación enviado a ${payload.correo_persona}.`, 'success'))
          .catch((e: any) => this.toast.show('No se pudo enviar el correo de confirmación: ' + (e?.message ?? e), 'error'));
      }
    } catch (e: any) {
      if (e?.code === EXCLUSION_VIOLATION) {
        this.conflicto.set('Choque de horario detectado por la base de datos: ya hay alguien registrado en ese cuarto durante ese rango. No se realizó el cambio.');
      } else {
        this.toast.show('Error al guardar: ' + (e?.message ?? e), 'error');
      }
    }
  }
}
