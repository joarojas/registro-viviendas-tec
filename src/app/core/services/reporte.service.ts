import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { mensajeDeFuncion } from '../utils/errores';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  constructor(private sb: SupabaseService) {}

  async enviarReporte(): Promise<void> {
    const { error } = await this.sb.client.functions.invoke('enviar-reporte', { body: {} });
    if (error) throw new Error(await mensajeDeFuncion(error));
  }
}
