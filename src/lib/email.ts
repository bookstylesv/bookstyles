import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Dirección from — cambiar por tu dominio verificado en Resend cuando lo tengas
const FROM = 'BookStyle <onboarding@resend.dev>';

interface BookingConfirmationParams {
  to:          string;
  clientName:  string;
  tenantName:  string;
  services:    string;
  dateStr:     string;
  timeStr:     string;
  totalPrice?: number;
}

export async function sendBookingConfirmation(p: BookingConfirmationParams) {
  const priceRow = p.totalPrice && p.totalPrice > 0
    ? `<tr><td style="padding:8px 0;color:#666;font-size:14px;">💰 Total estimado</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#0d9488;">$${p.totalPrice.toFixed(2)}</td></tr>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr><td style="background:#0d9488;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">✅ Cita Confirmada</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px;">${p.tenantName}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 24px;font-size:16px;color:#333;">Hola <strong>${p.clientName}</strong>,</p>
          <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.6;">Tu cita ha sido registrada exitosamente. Aquí tienes el resumen:</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;">
            <tr><td style="padding:8px 0;color:#666;font-size:14px;">📍 Negocio</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#222;">${p.tenantName}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:14px;border-top:1px solid #f0f0f0;">✂️ Servicios</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#222;border-top:1px solid #f0f0f0;">${p.services}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:14px;border-top:1px solid #f0f0f0;">📅 Fecha</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#222;border-top:1px solid #f0f0f0;">${p.dateStr}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:14px;border-top:1px solid #f0f0f0;">🕙 Hora</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#222;border-top:1px solid #f0f0f0;">${p.timeStr}</td></tr>
            ${priceRow}
          </table>

          <div style="margin:32px 0 0;background:#f0fdf9;border-left:4px solid #0d9488;padding:16px 20px;border-radius:0 6px 6px 0;">
            <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
              Si necesitas cancelar o reagendar tu cita, contáctanos directamente con tu número de teléfono registrado.
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9f9f9;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#aaa;">Este correo fue generado automáticamente por <strong>BookStyle</strong>. Por favor no respondas a este mensaje.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from:    FROM,
    to:      p.to,
    subject: `✅ Tu cita en ${p.tenantName} está confirmada`,
    html,
  });
}
