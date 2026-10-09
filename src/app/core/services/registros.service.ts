import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Registro } from '../models/models';
import { rangesOverlap } from '../utils/date-utils';

export interface RegistroPayload {
  cuarto_id: string;
  nombre_persona: string;
  correo_persona: string;
  departamento_id: string;
  tipo: Registro['tipo'];
  dia_completo: boolean;
  sin_fecha_salida: boolean;
  inicio: string;
  fin: string;
}

/** Código de Postgres para violación del "exclusion constraint" anti-choques. */
export const EXCLUSION_VIOLATION = '23P01';

@Injectable({ providedIn: 'root' })
export class RegistrosService {
  constructor(private sb: SupabaseService) {}

  async loadRegistros(cuartoId: string): Promise<Registro[]> {
    const { data, error } = await this.sb.client
      .from('registros')
      .select('*, departamentos(nombre)')
      .eq('cuarto_id', cuartoId)
      .order('inicio');
    if (error) throw error;
    return data as unknown as Registro[];
  }

  /** Busca, entre los registros ya cargados, uno que choque con el rango dado. */
  buscarChoque(existentes: Registro[], inicio: string, fin: string, excluirId?: string): Registro | undefined {
    return existentes.find((r) => (!excluirId || r.id !== excluirId) && rangesOverlap(inicio, fin, r.inicio, r.fin));
  }

  async crear(payload: RegistroPayload): Promise<void> {
    const { error } = await this.sb.client.from('registros').insert(payload);
    if (error) throw error;
  }

  async actualizar(id: string, payload: RegistroPayload): Promise<void> {
    const { error } = await this.sb.client.from('registros').update(payload).eq('id', id);
    if (error) throw error;
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.sb.client.from('registros').delete().eq('id', id);
    if (error) throw error;
  }
}
