const pool = require('../config/db');
const {
  sendBookingReceived,
  sendBookingApproved,
  sendBusinessNotification,
  sendCancellationConfirmation,
} = require('../config/emailService');

/**
 * Service to handle background tasks like sending emails for appointments
 */
class EmailTaskService {
  /**
   * Sends initial receipt email to client and notification to business
   */
  static async sendBookingReceivedEmails(appointment) {
    try {
      const { user_id, service_id, client_name, client_email, cancel_token } = appointment;

      const [serviceRes, businessRes] = await Promise.all([
        pool.query('SELECT name FROM services WHERE id = $1', [service_id]),
        pool.query('SELECT business_name, email FROM users WHERE id = $1', [user_id])
      ]);

      const serviceName = serviceRes.rows[0]?.name || 'Servicio';
      const businessName = businessRes.rows[0]?.business_name || 'Velora';
      const businessEmail = businessRes.rows[0]?.email;

      const emailData = {
        client_name,
        service_name: serviceName,
        business_name: businessName,
        cancel_token: cancel_token,
      };

      // 1. Enviar recibo al cliente (Recibida)
      const tasks = [sendBookingReceived(client_email, emailData)];
      
      // 2. Notificar al negocio
      if (businessEmail) {
        // Para el negocio sí enviamos fecha/hora completa
        const formatDate = (date) => {
          if (!date) return '';
          const d = new Date(date);
          const day = d.getUTCDate().toString().padStart(2, '0');
          const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
          const year = d.getUTCFullYear();
          return `${day}/${month}/${year}`;
        };

        tasks.push(sendBusinessNotification(businessEmail, {
          ...emailData,
          client_email,
          appointment_date: formatDate(appointment.appointment_date),
          appointment_time: appointment.appointment_time
        }));
      }

      await Promise.all(tasks);
    } catch (error) {
      console.error('Error in sendBookingReceivedEmails:', error);
    }
  }

  /**
   * Sends final approval email to client
   */
  static async sendNewBookingEmails(appointment, cancelToken) {
    try {
      const { user_id, service_id, client_name, client_email, appointment_date, appointment_time } = appointment;

      const [serviceRes, businessRes] = await Promise.all([
        pool.query('SELECT name FROM services WHERE id = $1', [service_id]),
        pool.query('SELECT business_name FROM users WHERE id = $1', [user_id])
      ]);

      const serviceName = serviceRes.rows[0]?.name || 'Servicio';
      const businessName = businessRes.rows[0]?.business_name || 'Velora';

      const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const day = d.getUTCDate().toString().padStart(2, '0');
        const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
      };

      const emailData = {
        client_name,
        service_name: serviceName,
        appointment_date: formatDate(appointment_date),
        appointment_time,
        business_name: businessName,
        cancel_token: cancelToken,
      };

      await sendBookingApproved(client_email, emailData);
    } catch (error) {
      console.error('Error in sendNewBookingEmails (Approval):', error);
    }
  }

  /**
   * Sends cancellation confirmation email
   */
  static async sendCancellationEmail(appointment, reason = null) {
    try {
      const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const day = d.getUTCDate().toString().padStart(2, '0');
        const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
      };

      await sendCancellationConfirmation(appointment.client_email, {
        client_name: appointment.client_name,
        service_name: appointment.service_name,
        appointment_date: formatDate(appointment.appointment_date),
        appointment_time: appointment.appointment_time,
        business_name: appointment.business_name,
        reason: reason
      });
    } catch (error) {
      console.error('Error in sendCancellationEmail background task:', error);
    }
  }
}

module.exports = EmailTaskService;
