import { TipoOcupacion } from '../models/models';

export const TIPO_LABEL: Record<TipoOcupacion, string> = {
  fijo: 'Fijo',
  semestral: 'Préstamo semestral',
  periodo: 'Préstamo por periodo',
};

// Tonos sólidos de azul institucional, uno por tipo de ocupación
// (usados en la línea de tiempo). Sin colores neón ni degradados.
export const TIPO_COLOR: Record<TipoOcupacion, string> = {
  fijo: '#001b3a',
  semestral: '#154f8f',
  periodo: '#6b87a8',
};

// ---------------------------------------------------------------------------
// ZONA HORARIA
// Todo el sistema trabaja en hora de Costa Rica (UTC-6, sin horario de verano),
// sin importar en qué zona esté configurada la computadora de quien lo usa ni
// el servidor de la base de datos (Supabase usa UTC por defecto).
//  - Al GUARDAR: se manda siempre la fecha con el offset "-06:00" explícito.
//  - Al LEER/MOSTRAR: se convierte siempre a "America/Costa_Rica".
// ---------------------------------------------------------------------------
export const ZONA_HORARIA = 'America/Costa_Rica';
export const OFFSET_CR = '-06:00';

/** Fin de un uso "indefinido" (fijo sin fecha de salida). */
export const FAR_FUTURE = `2099-12-31T23:59:00${OFFSET_CR}`;

/**
 * Arma un timestamp con el offset de Costa Rica.
 * @param fecha "YYYY-MM-DD"
 * @param hora  "HH:mm" o "HH:mm:ss"
 */
export function crearFechaCostaRica(fecha: string, hora: string): string {
  const h = hora.length === 5 ? `${hora}:00` : hora;
  return `${fecha}T${h}${OFFSET_CR}`;
}

/** Descompone un instante en su fecha y hora de pared en Costa Rica. */
export function partesCR(d: string | Date): { fecha: string; hora: string } {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(d));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
  return { fecha: `${get('year')}-${get('month')}-${get('day')}`, hora: `${get('hour')}:${get('minute')}` };
}

/** Fecha de hoy ("YYYY-MM-DD") según Costa Rica. */
export function hoyCR(): string {
  return partesCR(new Date()).fecha;
}

/** true si el valor se puede convertir en una fecha válida (evita que un dato corrupto rompa la UI). */
function esFechaValida(d: string | Date): boolean {
  return !Number.isNaN(new Date(d).getTime());
}

export function fmtDate(d: string | Date): string {
  if (!esFechaValida(d)) return '—';
  return new Date(d).toLocaleDateString('es-CR', {
    timeZone: ZONA_HORARIA, day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function fmtDateTime(d: string | Date): string {
  if (!esFechaValida(d)) return '—';
  return new Date(d).toLocaleString('es-CR', {
    timeZone: ZONA_HORARIA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function isNowWithin(inicio: string, fin: string): boolean {
  if (!esFechaValida(inicio) || !esFechaValida(fin)) return false;
  const now = new Date();
  return now >= new Date(inicio) && now < new Date(fin);
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  if (![aStart, aEnd, bStart, bEnd].every(esFechaValida)) return false;
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}
