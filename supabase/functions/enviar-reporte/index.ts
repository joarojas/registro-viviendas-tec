import { corsHeaders, json, esc, fmt, TIPO_LABEL, clienteYUsuario } from '../_shared/util';
import { enviarCorreo } from '../_shared/correo';

declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { client, user } = await clienteYUsuario(req);
    if (!client || !user || !user.email) return json({ error: 'Necesitás iniciar sesión.' }, 401);

    const body = await req.json();
    const { casaNumero, cuartoNumero, correoDestino } = body;

    if (!casaNumero || !cuartoNumero || !correoDestino) {
      return json({ error: 'Faltan datos para el reporte.' }, 400);
    }

    const { data: casa, error: dbError } = await client
      .from('casas')
      .select('numero, cuartos(numero, registros(nombre_persona, tipo, inicio, fin, sin_fecha_salida))')
      .eq('numero', casaNumero)
      .single();
    if (dbError) return json({ error: 'Error consultando datos: ' + dbError.message }, 500);

    const cuarto = casa.cuartos?.find((c: any) => c.numero === cuartoNumero);
    if (!cuarto) return json({ error: 'Cuarto no encontrado.' }, 404);

    const ahora = new Date();
    const en7dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
    const td = 'style="padding:6px 10px;"';
    let ocupados = '';
    let prontos = '';

    for (const r of cuarto.registros ?? []) {
      const inicio = new Date(r.inicio);
      const fin = new Date(r.fin);
      if (ahora >= inicio && ahora < fin) {
        ocupados += `<tr><td ${td}>${esc(r.nombre_persona)}</td>` +
          `<td ${td}>${esc(TIPO_LABEL[r.tipo] ?? r.tipo)}</td><td ${td}>${r.sin_fecha_salida ? 'Indefinido' : fmt(r.fin)}</td></tr>`;
      }
      if (!r.sin_fecha_salida && fin > ahora && fin <= en7dias) {
        prontos += `<tr><td ${td}>${esc(r.nombre_persona)}</td><td ${td}>${fmt(r.fin)}</td></tr>`;
      }
    }

    const th = (t: string) => `<th ${td}>${t}</th>`;
    const html = `
      <div style="font-family:sans-serif;color:#111;max-width:640px;">
        <h2 style="color:#002855;margin-bottom:4px;">Reporte de Ocupación - Casa ${esc(casaNumero)}, Cuarto ${cuartoNumero}</h2>
        <p style="color:#555;margin-top:0;">Generado el ${fmt(ahora.toISOString())} (hora de Costa Rica)</p>
        <h3>Estado actual</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr style="background:#f2f2f2;text-align:left;">${th('Persona')}${th('Tipo')}${th('Sale')}</tr>
          ${ocupados || `<tr><td ${td} colspan="3">Ningún cuarto ocupado ahora mismo.</td></tr>`}
        </table>
        <h3 style="margin-top:24px;">Se desocupan en los próximos 7 días</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr style="background:#f2f2f2;text-align:left;">${th('Persona')}${th('Fecha de salida')}</tr>
          ${prontos || `<tr><td ${td} colspan="2">Ningún registro vence pronto.</td></tr>`}
        </table>
      </div>`;

    // Si tu archivo _shared/correo.ts no soporta replyTo, puedes agregarlo a su interfaz.
    await enviarCorreo({
      to: correoDestino,
      replyTo: user.email, 
      subject: `Reporte de ocupación — Casa ${casaNumero}, Cuarto ${cuartoNumero}`,
      html,
    });
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});