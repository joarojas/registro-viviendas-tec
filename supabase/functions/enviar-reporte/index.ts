// Edge Function: enviar-reporte
// Arma un reporte de ocupación (cuartos ocupados ahora y cuartos que se
// desocupan en los próximos 7 días) y lo envía al correo de quien lo pide.
//
// Despliegue:  supabase functions deploy enviar-reporte
// Secretos:    GMAIL_USER, GMAIL_APP_PASSWORD  (o RESEND_API_KEY como respaldo)

import { corsHeaders, json, esc, fmt, TIPO_LABEL, clienteYUsuario } from '../_shared/util.ts';
import { enviarCorreo } from '../_shared/correo.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { client, user } = await clienteYUsuario(req);
    if (!client || !user || !user.email) return json({ error: 'Necesitás iniciar sesión.' }, 401);

    const { data: casas, error: dbError } = await client
      .from('casas')
      .select('numero, cuartos(numero, registros(nombre_persona, tipo, inicio, fin, sin_fecha_salida))')
      .order('numero');
    if (dbError) return json({ error: 'Error consultando datos: ' + dbError.message }, 500);

    const ahora = new Date();
    const en7dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
    const td = 'style="padding:6px 10px;"';
    let ocupados = '';
    let prontos = '';

    for (const casa of casas ?? []) {
      for (const cuarto of casa.cuartos ?? []) {
        for (const r of cuarto.registros ?? []) {
          const inicio = new Date(r.inicio);
          const fin = new Date(r.fin);
          if (ahora >= inicio && ahora < fin) {
            ocupados += `<tr><td ${td}>${esc(casa.numero)}</td><td ${td}>${cuarto.numero}</td><td ${td}>${esc(r.nombre_persona)}</td>` +
              `<td ${td}>${esc(TIPO_LABEL[r.tipo] ?? r.tipo)}</td><td ${td}>${r.sin_fecha_salida ? 'Indefinido' : fmt(r.fin)}</td></tr>`;
          }
          if (!r.sin_fecha_salida && fin > ahora && fin <= en7dias) {
            prontos += `<tr><td ${td}>${esc(casa.numero)}</td><td ${td}>${cuarto.numero}</td><td ${td}>${esc(r.nombre_persona)}</td><td ${td}>${fmt(r.fin)}</td></tr>`;
          }
        }
      }
    }

    const th = (t: string) => `<th ${td}>${t}</th>`;
    const html = `
      <div style="font-family:sans-serif;color:#111;max-width:640px;">
        <h2 style="color:#002855;margin-bottom:4px;">Reporte de ocupación — Registro de Viviendas TEC</h2>
        <p style="color:#555;margin-top:0;">Generado el ${fmt(ahora.toISOString())} (hora de Costa Rica)</p>
        <h3>Cuartos ocupados en este momento</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr style="background:#f2f2f2;text-align:left;">${th('Casa')}${th('Cuarto')}${th('Persona')}${th('Tipo')}${th('Sale')}</tr>
          ${ocupados || `<tr><td ${td} colspan="5">Ningún cuarto ocupado ahora mismo.</td></tr>`}
        </table>
        <h3 style="margin-top:24px;">Se desocupan en los próximos 7 días</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr style="background:#f2f2f2;text-align:left;">${th('Casa')}${th('Cuarto')}${th('Persona')}${th('Fecha de salida')}</tr>
          ${prontos || `<tr><td ${td} colspan="4">Ningún cuarto se desocupa en los próximos 7 días.</td></tr>`}
        </table>
      </div>`;

    await enviarCorreo({
      to: user.email,
      subject: 'Reporte de ocupación — Registro de Viviendas TEC',
      html,
    });
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
