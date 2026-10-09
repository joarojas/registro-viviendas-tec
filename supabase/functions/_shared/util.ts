// Utilidades compartidas por las Edge Functions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Escapa texto antes de meterlo en HTML (evita inyección de HTML en los correos). */
export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** El servidor corre en UTC: SIEMPRE se formatea con la zona de Costa Rica. */
export function fmt(d: string): string {
  return new Date(d).toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export const TIPO_LABEL: Record<string, string> = {
  fijo: 'Fijo',
  semestral: 'Préstamo semestral',
  periodo: 'Préstamo por periodo',
};

/**
 * Cliente de Supabase que actúa con el JWT de quien llama (respeta RLS)
 * y el usuario autenticado. Si no hay sesión real devuelve user = null.
 * Ojo: la llave "anon" también es un JWT válido, por eso NO basta con que
 * llegue un Authorization: hay que confirmar que corresponde a una persona.
 */
export async function clienteYUsuario(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { client: null, user: null };
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { client: null, user: null };
  return { client, user: data.user };
}
