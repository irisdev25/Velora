const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const year = () => new Date().getFullYear();

const getServiceIcon = (serviceName) => {
    const name = (serviceName || '').toLowerCase();
    if (name.includes('corte') || name.includes('pelo') || name.includes('cabello') || name.includes('barber')) return '✂️';
    if (name.includes('uñas') || name.includes('mani') || name.includes('pedi') || name.includes('manicura')) return '💅';
    if (name.includes('masaje') || name.includes('spa') || name.includes('relax') || name.includes('relajación')) return '💆';
    if (name.includes('facial') || name.includes('piel') || name.includes('cara') || name.includes('limpieza')) return '✨';
    if (name.includes('cejas') || name.includes('pestañas') || name.includes('microblading')) return '👁️';
    if (name.includes('tatuaje') || name.includes('tattoo') || name.includes('tatuar')) return '🎨';
    if (name.includes('dental') || name.includes('diente') || name.includes('odonto')) return '🦷';
    if (name.includes('médico') || name.includes('doctor') || name.includes('salud') || name.includes('hospital') || name.includes('clínica')) return '🩸';
    if (name.includes('gym') || name.includes('pesas') || name.includes('entrenamiento') || name.includes('fitness')) return '🏋️';
    if (name.includes('hotel') || name.includes('hospedaje') || name.includes('cuarto') || name.includes('habitación')) return '🏨';
    if (name.includes('clase') || name.includes('cuaderno') || name.includes('estudio') || name.includes('escuela') || name.includes('curso')) return '📓';
    if (name.includes('asesoría') || name.includes('legal') || name.includes('abogado') || name.includes('finanzas') || name.includes('consulta')) return '💼';
    return '🏢'; // Icono por defecto (edificio de negocio)
};

const footerHtml = (name) => `
  <tr>
    <td style="padding:20px 40px 32px; border-top:1px solid #f3f4f6; text-align:center;">
      <p style="margin:0; font-size:12px; color:#d1d5db;">© ${year()} ${name}</p>
    </td>
  </tr>
`;

const emailWrapper = (headerTitle, headerSubtitle, accentGradient, bodyHtml, footerName) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${accentGradient};padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">${headerTitle}</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${headerSubtitle}</p>
          </td>
        </tr>
        ${bodyHtml}
        ${footerHtml(footerName)}
      </table>
    </td></tr>
  </table>
</body></html>
`;

// ─────────────────────────────────────────────
// 1. Solicitud recibida (Notificación inicial al cliente)
const sendBookingReceived = async (clientEmail, bookingDetails) => {
  const { client_name, service_name, business_name, cancel_token } = bookingDetails;
  const displayName = business_name || 'Velora';
  const frontendUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/pages` : 'http://localhost:3001/pages';
  const cancelUrl = cancel_token
    ? `${frontendUrl}/cancel-appointment.html?token=${cancel_token}`
    : null;

  const body = `
    <tr><td style="padding:40px 40px 20px;">
      <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">¡Hola, ${client_name}! 👋</h2>
      <p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">
        Hemos recibido tu solicitud de reserva en <strong style="color:#6d28d9;">${displayName}</strong> y la estamos revisando. En unos minutos recibirás un correo con la confirmación definitiva.
      </p>
      ${cancelUrl ? `
      <div style="text-align:center;margin-top:10px;">
        <a href="${cancelUrl}" style="font-size:12px;color:#6b7280;text-decoration:underline;">
          Cancelar mi solicitud
        </a>
      </div>` : ''}
    </td></tr>
  `;

  const html = emailWrapper(displayName, 'Solicitud Recibida', 'linear-gradient(135deg,#6d28d9 0%,#4f46e5 100%)', body, `${displayName} · Desarrollado por Velora`);

  const info = await transporter.sendMail({
    from: `"Velora" <${process.env.SMTP_USER}>`,
    to: clientEmail,
    subject: `📅 Solicitud de reserva recibida - ${displayName}`,
    html,
  });
  console.log('Correo de solicitud recibida enviado:', info.messageId);
  return info;
};

// 2. Reserva Aprobada (Confirmación definitiva)
const sendBookingApproved = async (clientEmail, bookingDetails) => {
  const { client_name, service_name, appointment_date, appointment_time, business_name, cancel_token } = bookingDetails;
  const displayName = business_name || 'Velora';
  const frontendUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/pages` : 'http://localhost:3001/pages';
  const cancelUrl = cancel_token
    ? `${frontendUrl}/cancel-appointment.html?token=${cancel_token}`
    : null;

  const body = `
    <tr><td style="padding:40px 40px 20px;">
      <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">¡Hola, ${client_name}! 👋</h2>
      <p style="margin:0 0 24px;font-size:16px;color:#6b7280;line-height:1.6;">
        Tu reserva en <strong style="color:#6d28d9;">${displayName}</strong> ha sido aprobada con éxito. ¡Muchas gracias por preferirnos!
      </p>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px;">
        <tr><td style="padding:18px 24px;border-bottom:1px solid #e5e7eb;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">SERVICIO</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">${getServiceIcon(service_name)} ${service_name}</p>
        </td></tr>
        <tr><td style="padding:18px 24px;border-bottom:1px solid #e5e7eb;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">FECHA</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">📅 ${appointment_date}</p>
        </td></tr>
        <tr><td style="padding:18px 24px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">HORA</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">🕐 ${appointment_time}</p>
        </td></tr>
      </table>

      <div style="background:#fffbeb; border-left:4px solid #f59e0b; padding:12px 20px; margin-bottom:28px;">
        <p style="margin:0; font-size:14px; color:#92400e; font-weight:500;">
          <strong>Nota:</strong> Recuerda mostrar este correo el día de tu reserva al llegar al negocio.
        </p>
      </div>

      ${cancelUrl ? `
      <div style="text-align:center;margin-bottom:10px;">
        <a href="${cancelUrl}" style="font-size:13px;color:#ef4444;text-decoration:none;border:1px solid #fecaca;padding:10px 20px;border-radius:6px;display:inline-block;">
          Cancelar mi reserva
        </a>
      </div>` : ''}
    </td></tr>
  `;

  const html = emailWrapper(displayName, 'Reserva Confirmada', 'linear-gradient(135deg,#059669 0%,#10b981 100%)', body, `${displayName} · Desarrollado por Velora`);

  const info = await transporter.sendMail({
    from: `"Velora" <${process.env.SMTP_USER}>`,
    to: clientEmail,
    subject: `✅ Reserva Confirmada - ${displayName}`,
    html,
  });
  console.log('Correo de reserva aprobada enviado:', info.messageId);
  return info;
};

// ─────────────────────────────────────────────
// 2. Notificación al negocio
// ─────────────────────────────────────────────
const sendBusinessNotification = async (businessEmail, bookingDetails) => {
  const { client_name, client_email, service_name, appointment_date, appointment_time, business_name } = bookingDetails;
  const displayName = business_name || 'Velora';

  const body = `
    <tr><td style="padding:40px 40px 20px;">
      <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">📬 Nueva reserva recibida</h2>
      <p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">
        Tienes una nueva cita confirmada en <strong style="color:#059669;">${displayName}</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
        <tr><td style="padding:18px 24px;border-bottom:1px solid #bbf7d0;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">CLIENTE</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">👤 ${client_name}</p>
          <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${client_email}</p>
        </td></tr>
        <tr><td style="padding:18px 24px;border-bottom:1px solid #bbf7d0;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">SERVICIO</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">${getServiceIcon(service_name)} ${service_name}</p>
        </td></tr>
        <tr><td style="padding:18px 24px;border-bottom:1px solid #bbf7d0;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">FECHA</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">📅 ${appointment_date}</p>
        </td></tr>
        <tr><td style="padding:18px 24px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">HORA</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">🕐 ${appointment_time}</p>
        </td></tr>
      </table>
    </td></tr>
  `;

  const html = emailWrapper(displayName, 'Nueva Reserva', 'linear-gradient(135deg,#065f46 0%,#059669 100%)', body, `${displayName} · Desarrollado por Velora`);

  const info = await transporter.sendMail({
    from: `"Velora" <${process.env.SMTP_USER}>`,
    to: businessEmail,
    subject: `📬 Nueva reserva de ${client_name}`,
    html,
  });
  console.log('Notificación al negocio enviada:', info.messageId);
  return info;
};

// ─────────────────────────────────────────────
// 3. Recordatorio 24h antes
// ─────────────────────────────────────────────
const sendAppointmentReminder = async (clientEmail, bookingDetails) => {
  const { client_name, service_name, appointment_date, appointment_time, business_name } = bookingDetails;
  const displayName = business_name || 'Velora';

  const body = `
    <tr><td style="padding:40px 40px 20px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">⏰</div>
      <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">Recuerda tu cita de mañana</h2>
      <p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">
        Hola <strong>${client_name}</strong>, te recordamos que mañana tienes una cita en <strong style="color:#d97706;">${displayName}</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;overflow:hidden;margin-bottom:20px;text-align:left;">
        <tr><td style="padding:18px 24px;border-bottom:1px solid #fde68a;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">SERVICIO</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">${getServiceIcon(service_name)} ${service_name}</p>
        </td></tr>
        <tr><td style="padding:18px 24px;border-bottom:1px solid #fde68a;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">FECHA</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">📅 ${appointment_date}</p>
        </td></tr>
        <tr><td style="padding:18px 24px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">HORA</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">🕐 ${appointment_time}</p>
        </td></tr>
      </table>
      <p style="font-size:14px;color:#9ca3af;">¡Te esperamos! Si necesitas hacer algún cambio, contáctanos.</p>
    </td></tr>
  `;

  const html = emailWrapper(displayName, 'Recordatorio de Cita', 'linear-gradient(135deg,#92400e 0%,#d97706 100%)', body, `${displayName} · Desarrollado por Velora`);

  const info = await transporter.sendMail({
    from: `"Velora" <${process.env.SMTP_USER}>`,
    to: clientEmail,
    subject: `⏰ Recordatorio: Tu cita en ${displayName} es mañana`,
    html,
  });
  console.log('Recordatorio enviado:', info.messageId);
  return info;
};

// ─────────────────────────────────────────────
// 4. Cancelación confirmada al cliente
// ─────────────────────────────────────────────
const sendCancellationConfirmation = async (clientEmail, bookingDetails) => {
  const { client_name, service_name, appointment_date, appointment_time, business_name } = bookingDetails;
  const displayName = business_name || 'Velora';

  const body = `
    <tr><td style="padding:40px 40px 20px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">❌</div>
      <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">Reserva cancelada</h2>
      <p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">
        Hola <strong>${client_name}</strong>, tu reserva ha sido cancelada correctamente.
      </p>
      ${bookingDetails.reason ? `
      <div style="background:#fff7ed; border-left:4px solid #f97316; padding:15px; margin-bottom:20px; text-align:left;">
        <p style="margin:0; font-size:14px; font-weight:600; color:#c2410c;">Motivo de la cancelación:</p>
        <p style="margin:5px 0 0; font-size:14px; color:#7c2d12;">${bookingDetails.reason}</p>
      </div>` : ''}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;overflow:hidden;margin-bottom:20px;text-align:left;">
        <tr><td style="padding:18px 24px;border-bottom:1px solid #fecaca;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">SERVICIO CANCELADO</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">${getServiceIcon(service_name)} ${service_name}</p>
        </td></tr>
        <tr><td style="padding:18px 24px;border-bottom:1px solid #fecaca;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;">FECHA Y HORA</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a1a2e;">${appointment_date} a las ${appointment_time}</p>
        </td></tr>
      </table>
      <p style="font-size:14px;color:#9ca3af;">Si fue un error, puedes volver a reservar cuando quieras.</p>
    </td></tr>
  `;

  const html = emailWrapper(displayName, 'Reserva Cancelada', 'linear-gradient(135deg,#991b1b 0%,#ef4444 100%)', body, `${displayName} · Desarrollado por Velora`);

  const info = await transporter.sendMail({
    from: `"Velora" <${process.env.SMTP_USER}>`,
    to: clientEmail,
    subject: `❌ Tu reserva en ${displayName} fue cancelada`,
    html,
  });
  console.log('Correo de cancelación enviado:', info.messageId);
  return info;
};

// ─────────────────────────────────────────────
// 5. Bienvenida al negocio
// ─────────────────────────────────────────────
const sendWelcomeEmail = async (userEmail, userData) => {
  const { name, business_name } = userData;

  const body = `
    <tr><td style="padding:40px 40px 20px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">🎉</div>
      <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">¡Bienvenido a Velora, ${name}!</h2>
      <p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">
        Tu negocio <strong style="color:#6d28d9;">${business_name}</strong> ya está registrado. Empieza a configurar tus servicios y a recibir reservas en línea.
      </p>
      <div style="background:#f8f7ff;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin-bottom:28px;text-align:left;">
        <p style="margin:0 0 12px;font-weight:600;color:#1a1a2e;">📋 Próximos pasos:</p>
        <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">1. Agrega tus servicios desde el panel de control</p>
        <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">2. Configura tu horario de disponibilidad</p>
        <p style="margin:0;color:#6b7280;font-size:14px;">3. Comparte tu enlace de reservas con tus clientes</p>
      </div>
    </td></tr>
  `;

  const html = emailWrapper('Velora', '¡Tu cuenta está lista!', 'linear-gradient(135deg,#6d28d9 0%,#4f46e5 100%)', body, 'Velora. Todos los derechos reservados.');

  const info = await transporter.sendMail({
    from: `"Velora" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: `🎉 ¡Bienvenido a Velora, ${name}!`,
    html,
  });
  console.log('Correo de bienvenida enviado:', info.messageId);
  return info;
};

// ─────────────────────────────────────────────
// 6. Verificación de email
// ─────────────────────────────────────────────
const sendEmailVerification = async (userEmail, userData) => {
  const { name, verification_token } = userData;
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001/pages'}/verify-email?token=${verification_token}`;

  const body = `
    <tr><td style="padding:40px 40px 20px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">📧</div>
      <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">Confirma tu correo</h2>
      <p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">
        Hola <strong>${name}</strong>, haz clic en el botón para verificar tu cuenta de Velora.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#6d28d9 0%,#4f46e5 100%);color:#fff;text-decoration:none;padding:16px 36px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 4px 14px rgba(109,40,217,0.4);">
        Verificar mi cuenta
      </a>
      <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;">Este enlace expirará en 24 horas.</p>
    </td></tr>
  `;

  const html = emailWrapper('Velora', 'Verificación de cuenta', 'linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%)', body, 'Velora. Todos los derechos reservados.');

  const info = await transporter.sendMail({
    from: `"Velora" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: '📧 Verifica tu cuenta de Velora',
    html,
  });
  console.log('Correo de verificación enviado:', info.messageId);
  return info;
};

// ─────────────────────────────────────────────
// 7. Recuperación de contraseña
// ─────────────────────────────────────────────
const sendPasswordReset = async (userEmail, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001/pages'}/reset-password?token=${resetToken}`;

  const body = `
    <tr><td style="padding:40px 40px 20px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">🔐</div>
      <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">¿Olvidaste tu contraseña?</h2>
      <p style="margin:0 0 32px;font-size:16px;color:#6b7280;line-height:1.6;max-width:400px;margin-left:auto;margin-right:auto;">
        Haz clic en el botón de abajo para crear una nueva contraseña. El enlace expirará en <strong>1 hora</strong>.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6d28d9 0%,#4f46e5 100%);color:#fff;text-decoration:none;padding:16px 36px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 4px 14px rgba(109,40,217,0.4);">
        Restablecer contraseña
      </a>
      <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;">Si no solicitaste este cambio, ignora este correo.</p>
    </td></tr>
  `;

  const html = emailWrapper('Velora', 'Recuperación de contraseña', 'linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%)', body, 'Velora. Todos los derechos reservados.');

  const info = await transporter.sendMail({
    from: `"Velora Support" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: '🔐 Recuperación de contraseña - Velora',
    html,
  });
  console.log('Correo de recuperación enviado:', info.messageId);
  return info;
};

module.exports = {
  sendBookingReceived,
  sendBookingApproved,
  sendBusinessNotification,
  sendAppointmentReminder,
  sendCancellationConfirmation,
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordReset,
};
