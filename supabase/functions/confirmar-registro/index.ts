// Edge Function: confirmar-registro
// Se llama justo después de crear un registro nuevo. Envía al correo de la
// persona OCUPANTE su casa, cuarto y fechas. Las respuestas a ese correo le
// llegan a quien hizo el registro (Reply-To).
//
// Despliegue:  supabase functions deploy confirmar-registro
// Secretos:    GMAIL_USER, GMAIL_APP_PASSWORD  (o RESEND_API_KEY como respaldo)

import { corsHeaders, json, esc, fmt, TIPO_LABEL, clienteYUsuario } from '../_shared/util.ts';
import { enviarCorreo } from '../_shared/correo.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1) Solo personal con sesión real puede disparar el envío.
    const { client, user } = await clienteYUsuario(req);
    if (!client || !user) return json({ error: 'Necesitás iniciar sesión.' }, 401);

    // 2) Validar el cuerpo (no se confía en lo que manda el navegador).
    const b = await req.json();
    const correo = String(b.correo ?? '').trim();
    const nombre = String(b.nombre ?? '').trim();
    const casaNumero = String(b.casaNumero ?? '').trim();
    const cuartoNumero = Number(b.cuartoNumero);
    if (!EMAIL_RE.test(correo) || correo.length > 120) return json({ error: 'Correo inválido.' }, 400);
    if (!nombre || nombre.length > 80) return json({ error: 'Nombre inválido.' }, 400);
    if (!casaNumero || casaNumero.length > 20) return json({ error: 'Casa inválida.' }, 400);
    if (!Number.isInteger(cuartoNumero) || cuartoNumero < 1 || cuartoNumero > 10) return json({ error: 'Cuarto inválido.' }, 400);
    if (!(b.tipo in TIPO_LABEL)) return json({ error: 'Tipo inválido.' }, 400);
    if (Number.isNaN(new Date(b.inicio).getTime()) || Number.isNaN(new Date(b.fin).getTime())) {
      return json({ error: 'Fechas inválidas.' }, 400);
    }

    // 3) Anti-abuso: solo se envía si existe un registro MUY reciente con ese
    //    correo. Así la función no sirve para mandar correos arbitrarios.
    const hace10min = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recientes, error: dbError } = await client
      .from('registros').select('id').eq('correo_persona', correo).gte('creado_en', hace10min).limit(1);
    if (dbError) return json({ error: 'No se pudo verificar el registro: ' + dbError.message }, 500);
    if (!recientes || recientes.length === 0) {
      return json({ error: 'No hay un registro reciente con ese correo.' }, 403);
    }

    const salida = b.sinFechaSalida ? 'Indefinida' : fmt(b.fin);
    const fila = (k: string, v: string) =>
      `<tr><td style="padding:6px 10px;font-weight:bold;background:#f2f2f2;">${k}</td><td style="padding:6px 10px;">${esc(v)}</td></tr>`;

    const html = `
      <div style="font-family:sans-serif;color:#111;max-width:560px;">
        <h2 style="color:#002855;margin-bottom:4px;">Confirmación de asignación de vivienda</h2>
        <p>Hola ${esc(nombre)},</p>
        <p>Se te asignó un espacio en las viviendas del Tecnológico de Costa Rica. Estos son los datos de tu asignación:</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin:16px 0;">
          ${fila('Casa', casaNumero)}${fila('Cuarto', String(cuartoNumero))}
          ${fila('Tipo de ocupación', TIPO_LABEL[b.tipo])}${fila('Ingreso', fmt(b.inicio))}${fila('Salida', salida)}
        </table>
        <p style="color:#555;font-size:13px;">Si esta información no es correcta, respondé a este correo: le llega a ${esc(user.email)}, quien realizó tu registro.</p>
      </div>`;

    await enviarCorreo({
      to: correo,
      subject: 'Confirmación de asignación de vivienda — TEC',
      html,
      replyTo: user.email ?? undefined,
    });
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
