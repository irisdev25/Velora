const pool = require('../config/db');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const EmailTaskService = require('../services/emailTaskService');

// Función auxiliar para sincronizar con CRM
const syncWithCRM = async (appt, isUpdate = false) => {
    try {
        const { user_id, client_name, client_email, total_price, appointment_date, appointment_time } = appt;
        
        if (!isUpdate) {
            // Nueva cita: Incrementamos contador
            await pool.query(`
                INSERT INTO customers (business_id, name, email, total_appointments, total_spent, last_visit)
                VALUES ($1, $2, $3, 1, $4, $5)
                ON CONFLICT (business_id, email) DO UPDATE SET
                    total_appointments = customers.total_appointments + 1,
                    last_visit = GREATEST(customers.last_visit, EXCLUDED.last_visit)
            `, [user_id, client_name, client_email, 0, new Date(appointment_date).toISOString().split('T')[0] + ' ' + appointment_time]);
        } else {
            // Actualización (Confirmación): Sumamos al total gastado
            await pool.query(`
                UPDATE customers 
                SET total_spent = total_spent + $1
                WHERE business_id = $2 AND email = $3
            `, [total_price, user_id, client_email]);
        }
    } catch (e) {
        console.error('CRM sync error:', e);
    }
};

const getAppointments = async (req, res) => {
  try {
    const appointments = await pool.query(
      `SELECT a.id, a.user_id, a.service_id, a.client_name, a.client_email, a.appointment_date, a.appointment_time, a.status, a.total_price, a.custom_data, a.proof_of_payment_url, s.name as service_name 
       FROM appointments a 
       LEFT JOIN services s ON a.service_id = s.id 
       WHERE a.user_id = $1 
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [req.user.id]
    );
    res.json(appointments.rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const createAppointment = async (req, res) => {
  try {
    const { user_id, service_id, client_name, client_email, client_phone, appointment_date, appointment_time, custom_data, total_price } = req.body;

    // VERIFICACIÓN DE PLAN (Límite de citas mensuales para Free)
    const userPlanRes = await pool.query('SELECT plan FROM users WHERE id = $1', [user_id]);
    const plan = userPlanRes.rows[0]?.plan || 'free';

    if (plan === 'free') {
        const monthlyAppts = await pool.query(
            `SELECT COUNT(*) FROM appointments 
             WHERE user_id = $1 
             AND appointment_date >= DATE_TRUNC('month', CURRENT_DATE)`,
            [user_id]
        );
        if (parseInt(monthlyAppts.rows[0].count) >= 25) {
            return res.status(403).json({ message: 'Este negocio ha alcanzado su límite de 25 citas mensuales en el plan gratuito.' });
        }
    }

    // Obtener la capacidad máxima del servicio
    const serviceRes = await pool.query('SELECT name, requires_advance, max_capacity FROM services WHERE id = $1', [service_id]);
    const service = serviceRes.rows[0];
    const maxCapacity = service?.max_capacity || 1;

    // Verificar si el horario ya está lleno (considerando capacidad)
    const existingAppointments = await pool.query(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE user_id = $1 AND appointment_date = $2 AND appointment_time = $3 
       AND status != 'cancelled'
       AND (status != 'pending_payment' OR created_at > NOW() - INTERVAL '15 minutes')`,
      [user_id, appointment_date, appointment_time]
    );

    const bookedCount = parseInt(existingAppointments.rows[0].count);

    if (bookedCount >= maxCapacity) {
      return res.status(400).json({ message: 'Lo sentimos, este horario ya está lleno.' });
    }

    const requiresAdvance = service?.requires_advance || false;

    // Generar token de cancelación único
    const cancelToken = uuidv4();

    // Estado inicial: 'pending_payment' si requiere adelanto, 'pending' si no (en revisión)
    const initialStatus = requiresAdvance ? 'pending_payment' : 'pending';

    const result = await pool.query(
      `INSERT INTO appointments (user_id, service_id, client_name, client_email, client_phone, appointment_date, appointment_time, custom_data, total_price, cancel_token, status, payment_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, user_id, service_id, client_name, client_email, client_phone, appointment_date, appointment_time, status, total_price, custom_data, cancel_token`,
      [user_id, service_id, client_name, client_email, client_phone, appointment_date, appointment_time, JSON.stringify(custom_data || {}), total_price || 0, cancelToken, initialStatus, 'pending']
    );

    const newAppointment = result.rows[0];
    newAppointment.service_name = service?.name;

    // Create Notification for the Business Owner
    await pool.query(
        `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)`,
        [user_id, 'new_booking', 'Nueva Reserva', `Has recibido una nueva reserva de ${client_name} para el servicio ${newAppointment.service_name} el ${appointment_date} a las ${appointment_time}.`]
    );

    // Sincronizar con CRM inmediatamente
    await syncWithCRM(newAppointment);

    // Enviar correo de "Solicitud Recibida" al cliente y notificación al negocio
    EmailTaskService.sendBookingReceivedEmails(newAppointment);

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ message: 'Error al crear la cita' });
  }
};



// Cancelación desde enlace del correo
const cancelAppointment = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT a.id, a.user_id, a.service_id, a.client_name, a.client_email, a.appointment_date, a.appointment_time, a.status, s.name as service_name, u.business_name, u.email as business_email
       FROM appointments a
       LEFT JOIN services s ON a.service_id = s.id
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.cancel_token = $1 AND a.status != 'cancelled'`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Enlace de cancelación inválido o ya fue utilizado' });
    }

    const appt = result.rows[0];

    await pool.query(
      'UPDATE appointments SET status = $1, cancel_token = NULL WHERE id = $2',
      ['cancelled', appt.id]
    );

    // Enviar correo de cancelación en background
    EmailTaskService.sendCancellationEmail(appt);

    res.json({ message: 'Reserva cancelada con éxito' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, appointment_date, appointment_time, rejection_reason } = req.body;

    let updateFields = [];
    let values = [];
    let queryIndex = 1;

    if (status) {
      updateFields.push(`status = $${queryIndex++}`);
      values.push(status);
    }
    if (appointment_date) {
      updateFields.push(`appointment_date = $${queryIndex++}`);
      values.push(appointment_date);
    }
    if (appointment_time) {
      updateFields.push(`appointment_time = $${queryIndex++}`);
      values.push(appointment_time);
    }
    if (rejection_reason) {
      updateFields.push(`rejection_reason = $${queryIndex++}`);
      values.push(rejection_reason);
    }
    if (req.body.payment_status) {
      updateFields.push(`payment_status = $${queryIndex++}`);
      values.push(req.body.payment_status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No hay datos para actualizar' });
    }

    const setString = updateFields.join(', ');
    values.push(id);
    values.push(req.user.id);

    const query = `UPDATE appointments SET ${setString} WHERE id = $${queryIndex} AND user_id = $${queryIndex + 1} RETURNING id, user_id, service_id, client_name, client_email, appointment_date, appointment_time, status, total_price, custom_data, proof_of_payment_url, rejection_reason`;
    
    const updated = await pool.query(query, values);

    if (updated.rows.length === 0) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    const updatedAppt = updated.rows[0];

    // Si el estado cambió a 'confirmed', enviar correos de notificación
    if (status === 'confirmed') {
        const tokenRes = await pool.query('SELECT cancel_token FROM appointments WHERE id = $1', [id]);
        EmailTaskService.sendNewBookingEmails(updatedAppt, tokenRes.rows[0]?.cancel_token);
        // Sincronizar con CRM al confirmar (solo para el gasto)
        await syncWithCRM(updatedAppt, true);
    }

    // Si el estado es 'cancelled' y hay un motivo, podríamos enviar un correo especial de rechazo
    if (status === 'cancelled' && rejection_reason) {
        // Enviar notificación de rechazo con motivo
        updatedAppt.service_name = (await pool.query('SELECT name FROM services WHERE id = $1', [updatedAppt.service_id])).rows[0]?.name;
        // Reusar el servicio de cancelación pero con el motivo si se desea, o delegar al service
        EmailTaskService.sendCancellationEmail(updatedAppt, rejection_reason);
    }

    res.json(updatedAppt);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ message: 'Error al actualizar la cita' });
  }
};

const getOccupiedSlots = async (req, res) => {
  try {
    const { service_id, month, year } = req.query;
    if (!service_id || !month || !year) {
      return res.status(400).json({ message: 'Faltan parámetros (service_id, month, year)' });
    }

    // Obtener citas del mes para ese servicio
    const appointments = await pool.query(
      `SELECT appointment_date, appointment_time, COUNT(*) as booked_count
       FROM appointments
       WHERE service_id = $1 
       AND EXTRACT(MONTH FROM appointment_date) = $2
       AND EXTRACT(YEAR FROM appointment_date) = $3
       AND status != 'cancelled'
       AND (status != 'pending_payment' OR created_at > NOW() - INTERVAL '15 minutes')
       GROUP BY appointment_date, appointment_time`,
      [service_id, month, year]
    );

    res.json(appointments.rows);
  } catch (error) {
    console.error('Error fetching occupied slots:', error);
    res.status(500).json({ message: 'Error al obtener ocupación' });
  }
};

module.exports = { getAppointments, createAppointment, cancelAppointment, updateAppointmentStatus, getOccupiedSlots };