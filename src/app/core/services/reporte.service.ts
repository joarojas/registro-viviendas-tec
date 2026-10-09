import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { mensajeDeFuncion } from '../utils/errores';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  constructor(private sb: SupabaseService) {}

  async enviarReporte(casaNumero: number, cuartoNumero: number, correoDestino: string): Promise<void> {
    const { error } = await this.sb.client.functions.invoke('enviar-reporte', { 
      body: { casaNumero, cuartoNumero, correoDestino } 
    });
    
    if (error) throw new Error(await mensajeDeFuncion(error));
  }
}