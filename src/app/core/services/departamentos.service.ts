import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Departamento } from '../models/models';

@Injectable({ providedIn: 'root' })
export class DepartamentosService {
  constructor(private sb: SupabaseService) {}

  async loadDepartamentos(): Promise<Departamento[]> {
    const { data, error } = await this.sb.client.from('departamentos').select('*').order('nombre');
    if (error) throw error;
    return data as Departamento[];
  }

  async crearDepartamento(nombre: string): Promise<Departamento> {
    const { data, error } = await this.sb.client.from('departamentos').insert({ nombre }).select().single();
    if (error) throw error;
    return data as Departamento;
  }
}
