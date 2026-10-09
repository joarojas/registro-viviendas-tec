export type TipoOcupacion = 'fijo' | 'semestral' | 'periodo';

export interface Departamento {
  id: string;
  nombre: string;
}

export interface Casa {
  id: string;
  numero: string;
  cantidad_cuartos: number;
}

export interface Cuarto {
  id: string;
  casa_id: string;
  numero: number;
}

export interface Registro {
  id: string;
  cuarto_id: string;
  nombre_persona: string;
  correo_persona: string | null;
  departamento_id: string | null;
  tipo: TipoOcupacion;
  dia_completo: boolean;
  sin_fecha_salida: boolean;
  inicio: string; // ISO timestamp
  fin: string; // ISO timestamp
  creado_en?: string;
  departamentos?: { nombre: string } | null; // viene del join en el select
}
