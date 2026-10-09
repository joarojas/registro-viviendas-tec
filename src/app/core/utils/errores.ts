/**
 * Cuando una Edge Function responde con error, supabase-js solo expone un
 * mensaje genérico ("Edge Function returned a non-2xx status code").
 * Esto rescata el motivo real que la función mandó en el cuerpo ({ error: "..." }).
 */
export async function mensajeDeFuncion(error: any): Promise<string> {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch {
    // el cuerpo no era JSON: se cae al mensaje genérico
  }
  return error?.message ?? String(error);
}
