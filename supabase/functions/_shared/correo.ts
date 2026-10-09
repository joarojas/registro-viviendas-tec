// Envío de correos. Proveedor según los secretos configurados:
//   1) Gmail por SMTP (puerto 465)  -> GMAIL_USER + GMAIL_APP_PASSWORD
//   2) Resend (API HTTP, respaldo)  -> RESEND_API_KEY
//
// Nota: Supabase bloquea las conexiones salientes a los puertos 25 y 587,
// por eso el SMTP va por el 465 (TLS directo).

export interface Correo {
  to: string;
  subject: string;
  html: string;
  /** A quién le llegan las respuestas (ej. la persona que hizo el registro). */
  replyTo?: string;
}

export async function enviarCorreo(c: Correo): Promise<void> {
  const gmailUser = Deno.env.get('GMAIL_USER');
  // Google muestra la contraseña de aplicación con espacios ("abcd efgh ..."): se quitan.
  const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')?.replace(/\s+/g, '');

  if (gmailUser && gmailPass) {
    // Import dinámico: si la librería fallara, el resto de la función
    // (incluida la respuesta CORS) sigue funcionando.
    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts');
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: { username: gmailUser, password: gmailPass },
      },
    });
    try {
      await client.send({
        from: `Registro de Viviendas TEC <${gmailUser}>`,
        to: c.to,
        replyTo: c.replyTo,
        subject: c.subject,
        content: 'auto',
        html: c.html,
      });
    } finally {
      await client.close();
    }
    return;
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (resendKey) {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Registro de Viviendas TEC <onboarding@resend.dev>',
        to: [c.to],
        reply_to: c.replyTo,
        subject: c.subject,
        html: c.html,
      }),
    });
    if (!resp.ok) throw new Error('Resend rechazó el envío: ' + (await resp.text()));
    return;
  }

  throw new Error('No hay proveedor de correo configurado. Definí GMAIL_USER y GMAIL_APP_PASSWORD (o RESEND_API_KEY) con "supabase secrets set".');
}
