import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { TipoOcupacion } from '../models/models';
import { mensajeDeFuncion } from '../utils/errores';

export interface ConfirmacionPayload {
  correo: string;
  nombre: string;
  casaNumero: string;
  cuartoNumero: number;
  tipo: TipoOcupacion;
  inicio: string;
  fin: string;
  sinFechaSalida: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  constructor(private sb: SupabaseService) {}

  async enviarConfirmacion(payload: ConfirmacionPayload): Promise<void> {
    const { error } = await this.sb.client.functions.invoke('confirmar-registro', { body: payload });
    if (error) throw new Error(await mensajeDeFuncion(error));
  }
}
