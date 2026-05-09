const cron = require('node-cron');
const pool = require('../config/db');
const { sendAppointmentReminder } = require('./emailService');

/**
 * Ejecuta cada día a las 9:00 AM y envía recordatorios 
 * para citas que ocurren al día siguiente.
 */
const startReminderService = () => {
  // Runs every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Iniciando envío de recordatorios de citas...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const appointments = await pool.query(
        `SELECT a.client_name, a.client_email, a.appointment_date, a.appointment_time,
                s.name as service_name, u.business_name
         FROM appointments a
         LEFT JOIN services s ON a.service_id = s.id
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.appointment_date = $1 AND a.status = 'confirmed'`,
        [tomorrowStr]
      );

      console.log(`📬 Enviando ${appointments.rows.length} recordatorio(s) para el ${tomorrowStr}`);

      for (const appt of appointments.rows) {
        try {
          const formatDate = (date) => {
            if (!date) return '';
            const d = new Date(date);
            const day = d.getUTCDate().toString().padStart(2, '0');
            const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
            const year = d.getUTCFullYear();
            return `${day}/${month}/${year}`;
          };

          await sendAppointmentReminder(appt.client_email, {
            client_name: appt.client_name,
            service_name: appt.service_name,
            appointment_date: formatDate(appt.appointment_date),
            appointment_time: appt.appointment_time,
            business_name: appt.business_name,
          });
        } catch (err) {
          console.error(`Error enviando recordatorio a ${appt.client_email}:`, err.message);
        }
      }

      console.log('✅ Recordatorios enviados.');
    } catch (error) {
      console.error('Error en el servicio de recordatorios:', error);
    }
  }, {
    timezone: 'America/Caracas'
  });

  console.log('📅 Servicio de recordatorios activo (9:00 AM diario)');
};

module.exports = { startReminderService };
