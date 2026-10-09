// Patrones de validación compartidos. La idea es cortar de raíz cualquier
// entrada que pueda romper la interfaz o llegar mal a la base de datos
// (cadenas vacías, símbolos raros, texto larguísimo, etc.), antes de que
// el dato salga del formulario.

/** Número/identificador de casa: letras, números, espacios y guiones. 1 a 20 caracteres. */
export const NUMERO_CASA_RE = /^[A-Za-zÀ-ÿ0-9\-\s]{1,20}$/;

/** Nombre de persona: letras (con acentos/ñ), espacios, apóstrofes y guiones. 2 a 80 caracteres. */
export const NOMBRE_PERSONA_RE = /^[A-Za-zÀ-ÿ'’.\-\s]{2,80}$/;

/** Nombre de departamento: letras, números y puntuación básica. 2 a 100 caracteres. */
export const DEPTO_NOMBRE_RE = /^[A-Za-zÀ-ÿ0-9'’.,\-\s]{2,100}$/;

/** Correo electrónico con forma válida (no garantiza que exista). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_NUMERO_CASA = 20;
export const MAX_NOMBRE_PERSONA = 80;
export const MAX_DEPTO_NOMBRE = 100;
export const MAX_CORREO = 120;
