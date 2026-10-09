import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Casa, Cuarto, Departamento, Registro } from '../../core/models/models';
import { CasasService } from '../../core/services/casas.service';
import { RegistrosService } from '../../core/services/registros.service';
import { DepartamentosService } from '../../core/services/departamentos.service';
import { ReporteService } from '../../core/services/reporte.service'; // <-- Agregado
import { ToastService } from '../../core/services/toast.service';
import { CuartoPanelModalComponent } from '../../shared/components/cuarto-panel-modal/cuarto-panel-modal.component';
import { RegistroFormModalComponent } from '../../shared/components/registro-form-modal/registro-form-modal.component';
import { EditarCasaModalComponent } from '../../shared/components/editar-casa-modal/editar-casa-modal.component';
import { TIPO_COLOR, TIPO_LABEL, fmtDate, fmtDateTime, isNowWithin, rangesOverlap, crearFechaCostaRica, hoyCR } from '../../core/utils/date-utils';

interface Bar { left: number; width: number; color: string; title: string; label: string; }
interface FormState { cuartoId: string; editing: Registro | null; }

@Component({
  selector: 'app-casa-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CuartoPanelModalComponent, RegistroFormModalComponent, EditarCasaModalComponent],
  templateUrl: './casa-detail.component.html',
})
export class CasaDetailComponent implements OnInit {
  casa = signal<Casa | null>(null);
  cuartos = signal<Cuarto[]>([]);
  registrosMap = signal<Record<string, Registro[]>>({});
  departamentos = signal<Departamento[]>([]);
  cargando = signal(true);
  mostrarEditarCasa = signal(false);

  panelCuartoId = signal<string | null>(null);
  formState = signal<FormState | null>(null);

  // Variables para selección y envío de reportes
  cuartosSeleccionados = signal<Set<string>>(new Set());
  enviandoReportes = signal(false);

  private readonly diasVentana = 60;
  private rangeStart = new Date();
  private rangeEnd = new Date();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private casasSvc: CasasService,
    private registrosSvc: RegistrosService,
    private departamentosSvc: DepartamentosService,
    private reporteSvc: ReporteService, // <-- Agregado
    private toast: ToastService,
  ) {
    this.rangeStart = new Date(crearFechaCostaRica(hoyCR(), '00:00:00'));
    this.rangeEnd = new Date(this.rangeStart);
    this.rangeEnd.setDate(this.rangeEnd.getDate() + this.diasVentana);
  }

  ngOnInit(): void {
    const casaId = this.route.snapshot.paramMap.get('id');
    if (!casaId) { this.router.navigate(['/']); return; }
    this.cargar(casaId);
  }

  async cargar(casaId: string): Promise<void> {
    this.cargando.set(true);
    try {
      const [casa, cuartos, departamentos] = await Promise.all([
        this.casasSvc.loadCasa(casaId),
        this.casasSvc.loadCuartos(casaId),
        this.departamentosSvc.loadDepartamentos(),
      ]);
      this.casa.set(casa);
      this.cuartos.set(cuartos);
      this.departamentos.set(departamentos);

      const map: Record<string, Registro[]> = {};
      await Promise.all(cuartos.map(async (c) => { map[c.id] = await this.registrosSvc.loadRegistros(c.id); }));
      this.registrosMap.set(map);
    } catch (e: any) {
      this.toast.show('Error cargando la casa: ' + (e?.message ?? e), 'error');
    } finally {
      this.cargando.set(false);
    }
  }

  private async recargarCuarto(cuartoId: string): Promise<void> {
    const registros = await this.registrosSvc.loadRegistros(cuartoId);
    this.registrosMap.update((m) => ({ ...m, [cuartoId]: registros }));
  }

  ocupadoAhora(cuartoId: string): boolean {
    return (this.registrosMap()[cuartoId] || []).some((r) => isNowWithin(r.inicio, r.fin));
  }

  ocupanteActual(cuartoId: string): Registro | undefined {
    return (this.registrosMap()[cuartoId] || []).find((r) => isNowWithin(r.inicio, r.fin));
  }

  primerNombre(nombreCompleto: string): string {
    return nombreCompleto.split(' ')[0];
  }

  // ---------- Selección y envío de reportes ----------
  toggleCuartoReporte(cuartoId: string): void {
    this.cuartosSeleccionados.update(set => {
      const newSet = new Set(set);
      if (newSet.has(cuartoId)) newSet.delete(cuartoId);
      else newSet.add(cuartoId);
      return newSet;
    });
  }

  async enviarReportesSeleccionados(): Promise<void> {
    const seleccionados = Array.from(this.cuartosSeleccionados());
    if (seleccionados.length === 0) return;

    this.enviandoReportes.set(true);
    let exitosos = 0;
    const casaNumero = Number(this.casa()?.numero);

    for (const cuartoId of seleccionados) {
      const cuarto = this.cuartos().find(c => c.id === cuartoId);
      const ocupante = this.ocupanteActual(cuartoId);
      
      if (casaNumero && cuarto && ocupante?.correo_persona) {
        try {
          await this.reporteSvc.enviarReporte(casaNumero, cuarto.numero, ocupante.correo_persona);
          exitosos++;
        } catch (e) {
          console.error(`Fallo envío a ${ocupante.correo_persona}`, e);
        }
      }
    }

    this.toast.show(`Se enviaron ${exitosos} reportes exitosamente.`, exitosos === seleccionados.length ? 'success' : 'error');
    this.cuartosSeleccionados.set(new Set()); // Limpiar checkboxes
    this.enviandoReportes.set(false);
  }

  // ---------- Línea de tiempo ----------
  get rangoInicioLabel(): string { return fmtDate(this.rangeStart); }
  get rangoFinLabel(): string { return fmtDate(this.rangeEnd); }
  get rangoMedioLabel(): string { return `+${Math.round(this.diasVentana / 2)}d`; }

  barsFor(cuartoId: string): Bar[] {
    const totalMs = this.rangeEnd.getTime() - this.rangeStart.getTime();
    const registros = (this.registrosMap()[cuartoId] || [])
      .filter((r) => rangesOverlap(r.inicio, r.fin, this.rangeStart.toISOString(), this.rangeEnd.toISOString()));

    return registros.map((r) => {
      const s = Math.max(new Date(r.inicio).getTime(), this.rangeStart.getTime());
      const e = Math.min(new Date(r.fin).getTime(), this.rangeEnd.getTime());
      const left = ((s - this.rangeStart.getTime()) / totalMs) * 100;
      const width = Math.max(((e - s) / totalMs) * 100, 0.8);
      const salida = r.sin_fecha_salida ? 'indefinido' : fmtDateTime(r.fin);
      return {
        left, width, color: TIPO_COLOR[r.tipo], label: r.nombre_persona,
        title: `${r.nombre_persona} · ${TIPO_LABEL[r.tipo]} · ${fmtDateTime(r.inicio)} → ${salida}`,
      };
    });
  }

  // ---------- Modales ----------
  abrirPanel(cuartoId: string): void {
    this.panelCuartoId.set(cuartoId);
  }

  cerrarPanel(): void {
    this.panelCuartoId.set(null);
  }

  pedirNuevoRegistro(cuartoId: string): void {
    this.panelCuartoId.set(null);
    this.formState.set({ cuartoId, editing: null });
  }

  pedirEditarRegistro(cuartoId: string, registro: Registro): void {
    this.panelCuartoId.set(null);
    this.formState.set({ cuartoId, editing: registro });
  }

  async onRegistroGuardado(cuartoId: string): Promise<void> {
    this.formState.set(null);
    await this.recargarCuarto(cuartoId);
    this.panelCuartoId.set(cuartoId);
  }

  async onCuartoPanelCambiado(cuartoId: string): Promise<void> {
    await this.recargarCuarto(cuartoId);
  }

  onDepartamentoCreado(depto: Departamento): void {
    this.departamentos.update((list) => [...list, depto]);
  }

  cuartoNumero(cuartoId: string): number {
    return this.cuartos().find((c) => c.id === cuartoId)?.numero ?? 0;
  }

  // ---------- Editar / eliminar casa ----------
  async onCasaActualizada(): Promise<void> {
    this.mostrarEditarCasa.set(false);
    const casaId = this.casa()?.id;
    if (casaId) await this.cargar(casaId); 
  }

  onCasaEliminada(): void {
    this.mostrarEditarCasa.set(false);
    this.router.navigate(['/']);
  }
}