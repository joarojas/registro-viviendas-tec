import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Casa, Cuarto } from '../models/models';
import { NUMERO_CASA_RE } from '../utils/validators';

@Injectable({ providedIn: 'root' })
export class CasasService {
  constructor(private sb: SupabaseService) {}

  async loadCasas(): Promise<Casa[]> {
    const { data, error } = await this.sb.client.from('casas').select('*').order('numero');
    if (error) throw error;
    return data as Casa[];
  }

  async loadCasa(id: string): Promise<Casa> {
    const { data, error } = await this.sb.client.from('casas').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Casa;
  }

  async loadCuartos(casaId: string): Promise<Cuarto[]> {
    const { data, error } = await this.sb.client
      .from('cuartos').select('*').eq('casa_id', casaId).order('numero');
    if (error) throw error;
    return data as Cuarto[];
  }

  private validarDatos(numero: string, cantidadCuartos: number): void {
    if (!NUMERO_CASA_RE.test(numero.trim())) {
      throw new Error('El número de casa solo puede tener letras, números, espacios y guiones (máx. 20 caracteres).');
    }
    if (!Number.isInteger(cantidadCuartos) || cantidadCuartos < 1 || cantidadCuartos > 10) {
      throw new Error('La cantidad de cuartos debe ser un número entero entre 1 y 10.');
    }
  }

  /** Crea la casa y, en la misma operación, sus N cuartos numerados del 1 a N. */
  async crearCasa(numero: string, cantidadCuartos: number): Promise<Casa> {
    this.validarDatos(numero, cantidadCuartos);
    const { data: casa, error } = await this.sb.client
      .from('casas').insert({ numero: numero.trim(), cantidad_cuartos: cantidadCuartos }).select().single();
    if (error) throw error;

    const filas = Array.from({ length: cantidadCuartos }, (_, i) => ({ casa_id: casa.id, numero: i + 1 }));
    const { error: e2 } = await this.sb.client.from('cuartos').insert(filas);
    if (e2) throw e2;

    return casa as Casa;
  }

  /**
   * Actualiza número y/o cantidad de cuartos de una casa ya existente.
   * Si se aumenta la cantidad, agrega los cuartos que falten.
   * Si se reduce, primero verifica que los cuartos que se van a quitar no
   * tengan registros (ni pasados ni futuros); si tienen, rechaza el cambio
   * en vez de borrar información silenciosamente.
   */
  async actualizarCasa(casaId: string, numero: string, cantidadCuartos: number): Promise<Casa> {
    this.validarDatos(numero, cantidadCuartos);

    const cuartosActuales = await this.loadCuartos(casaId);
    const actual = cuartosActuales.length;

    if (cantidadCuartos > actual) {
      const nuevas = Array.from({ length: cantidadCuartos - actual }, (_, i) => ({ casa_id: casaId, numero: actual + i + 1 }));
      const { error } = await this.sb.client.from('cuartos').insert(nuevas);
      if (error) throw error;
    } else if (cantidadCuartos < actual) {
      const aEliminar = cuartosActuales.filter((c) => c.numero > cantidadCuartos);
      const ids = aEliminar.map((c) => c.id);
      const { count, error: ce } = await this.sb.client
        .from('registros').select('id', { count: 'exact', head: true }).in('cuarto_id', ids);
      if (ce) throw ce;
      if ((count ?? 0) > 0) {
        throw new Error(
          `No se puede reducir a ${cantidadCuartos} cuarto(s): hay ${count} registro(s) en los cuartos ` +
          `${cantidadCuartos + 1} a ${actual}. Eliminá esos registros primero desde el historial de cada cuarto.`
        );
      }
      const { error: de } = await this.sb.client.from('cuartos').delete().in('id', ids);
      if (de) throw de;
    }

    const { data: casa, error: ue } = await this.sb.client
      .from('casas').update({ numero: numero.trim(), cantidad_cuartos: cantidadCuartos }).eq('id', casaId).select().single();
    if (ue) throw ue;
    return casa as Casa;
  }

  /** Cuenta cuántos registros (de cualquier cuarto de la casa) se perderían si se elimina. */
  async contarRegistrosDeCasa(casaId: string): Promise<number> {
    const cuartos = await this.loadCuartos(casaId);
    if (cuartos.length === 0) return 0;
    const ids = cuartos.map((c) => c.id);
    const { count, error } = await this.sb.client
      .from('registros').select('id', { count: 'exact', head: true }).in('cuarto_id', ids);
    if (error) throw error;
    return count ?? 0;
  }

  /** Elimina la casa. Sus cuartos y registros se borran en cascada (definido en schema.sql). */
  async eliminarCasa(casaId: string): Promise<void> {
    const { error } = await this.sb.client.from('casas').delete().eq('id', casaId);
    if (error) throw error;
  }
}
