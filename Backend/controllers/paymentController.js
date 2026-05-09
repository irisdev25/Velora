const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const pool = require('../config/db');
const EmailTaskService = require('../services/emailTaskService');

/**
 * Controller to handle Stripe Payment Sessions and Webhooks
 */
const syncWithCRM = async (appt) => {
    try {
        const { user_id, client_name, client_email, total_price, appointment_date, appointment_time } = appt;
        // Obtenemos el precio real del servicio si total_price no está disponible
        let spent = total_price;
        if (!spent) {
            const sRes = await pool.query('SELECT price FROM services WHERE id = $1', [appt.service_id]);
            spent = sRes.rows[0]?.price || 0;
        }

        await pool.query(`
            INSERT INTO customers (business_id, name, email, total_appointments, total_spent, last_visit)
            VALUES ($1, $2, $3, 1, $4, $5)
            ON CONFLICT (business_id, email) DO UPDATE SET
                total_appointments = customers.total_appointments + 1,
                total_spent = customers.total_spent + EXCLUDED.total_spent,
                last_visit = GREATEST(customers.last_visit, EXCLUDED.last_visit)
        `, [user_id, client_name, client_email, spent, `${appointment_date} ${appointment_time}`]);
    } catch (e) {
        console.error('CRM sync error:', e);
    }
};

const createCheckoutSession = async (req, res) => {
  console.log('--- Creando Sesión de Pago ---');
  try {
    const { appointmentId } = req.body;
    console.log('Appointment ID:', appointmentId);

    // 1. Get appointment and business details (Stripe ID and Manual Info)
    const result = await pool.query(
      `SELECT a.*, s.name as service_name, s.price, 
              u.stripe_account_id, u.manual_payment_info 
       FROM appointments a 
       JOIN services s ON a.service_id = s.id 
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`, 
      [appointmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    const appt = result.rows[0];

    // 2. Determine payment method
    // If business has Stripe Connect configured and Stripe is initialized
    if (appt.stripe_account_id && stripe) {
      console.log('Using Stripe Connect for Account:', appt.stripe_account_id);
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: appt.service_name,
                description: `Cita para el ${appt.appointment_date} a las ${appt.appointment_time}`,
              },
              unit_amount: Math.round(parseFloat(appt.price) * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/pages/booking-success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/pages/booking.html?business=${appt.user_id}#retry=true`,
        customer_email: appt.client_email,
        metadata: {
          appointmentId: appt.id.toString()
        },
        // IMPORTANT: Route payment to the business account
        transfer_data: {
          destination: appt.stripe_account_id,
        },
      });

      await pool.query(
        'UPDATE appointments SET stripe_session_id = $1, payment_status = $2, payment_method = $3 WHERE id = $4',
        [session.id, 'pending', 'stripe', appt.id]
      );

      return res.json({ type: 'stripe', url: session.url });
    } 
    
    // 3. Fallback to Manual Payment if configured
    const manual = appt.manual_payment_info;
    const hasManual = manual && (manual.bank || manual.pago_movil?.bank || manual.zelle?.email || manual.paypal?.email);
    
    if (hasManual) {
        await pool.query(
            'UPDATE appointments SET payment_method = $1, payment_status = $2 WHERE id = $3',
            ['manual', 'pending_verification', appt.id]
        );
        return res.json({ 
            type: 'manual', 
            instructions: manual 
        });
    }

    // 4. No payment method configured
    return res.status(400).json({ 
        message: 'El negocio no tiene métodos de pago configurados en este momento.' 
    });
  } catch (error) {
    console.error('Stripe Session Error:', error);
    res.status(500).json({ message: 'Error al crear la sesión de pago' });
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  if (!stripe) return res.status(400).json({ message: 'Stripe no está configurado' });

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed':
      // CASE 1: Appointment Payment
      if (session.metadata.appointmentId) {
        await handleAppointmentPayment(session.metadata.appointmentId);
      }
      // CASE 2: SaaS Subscription Payment
      else if (session.metadata.userId && session.metadata.planId) {
        await handleSubscriptionSuccess(session.metadata.userId, session.metadata.planId, session.subscription, session.customer);
      }
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionChange(session.customer, 'free', 'canceled');
      break;

    case 'customer.subscription.updated':
      // Map Stripe status to our local status
      await handleSubscriptionChange(session.customer, null, session.status);
      break;
  }

  res.json({ received: true });
};

// --- Helper Handlers for Webhook ---

const handleAppointmentPayment = async (appointmentId) => {
  try {
    const updateRes = await pool.query(
      `UPDATE appointments 
       SET status = 'confirmed', payment_status = 'paid' 
       WHERE id = $1 RETURNING *`,
      [appointmentId]
    );

    const updatedAppt = updateRes.rows[0];

    if (updatedAppt) {
      console.log(`Payment confirmed for appointment ${appointmentId}`);
      const tokenRes = await pool.query('SELECT cancel_token FROM appointments WHERE id = $1', [appointmentId]);
      EmailTaskService.sendNewBookingEmails(updatedAppt, tokenRes.rows[0]?.cancel_token);
      await syncWithCRM(updatedAppt);
    }
  } catch (dbError) {
    console.error('Webhook Appointment DB Error:', dbError);
  }
};

const handleSubscriptionSuccess = async (userId, planId, subscriptionId, customerId) => {
  try {
    await pool.query(
      `UPDATE users 
       SET plan = $1, subscription_status = 'active', 
           stripe_customer_id = $2, stripe_subscription_id = $3 
       WHERE id = $4`,
      [planId, customerId, subscriptionId, userId]
    );
    console.log(`User ${userId} upgraded to ${planId}`);
  } catch (error) {
    console.error('Webhook Subscription Success Error:', error);
  }
};

const handleSubscriptionChange = async (customerId, plan = null, status = null) => {
  try {
      let query = 'UPDATE users SET subscription_status = $1';
      let params = [status];
      
      if (plan) {
          query += ', plan = $2 WHERE stripe_customer_id = $3';
          params.push(plan, customerId);
      } else {
          query += ' WHERE stripe_customer_id = $2';
          params.push(customerId);
      }
      
      await pool.query(query, params);
      console.log(`Subscription updated for customer ${customerId}: ${status} ${plan || ''}`);
  } catch (error) {
      console.error('Webhook Subscription Change Error:', error);
  }
};



const uploadProofOfPayment = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: 'No se subió ningún comprobante' });
        }

        const proofUrl = `/uploads/${req.file.filename}`;

        await pool.query(
            'UPDATE appointments SET proof_of_payment_url = $1, payment_status = $2 WHERE id = $3',
            [proofUrl, 'pending_verification', appointmentId]
        );

        res.json({ 
            message: 'Comprobante subido. El negocio verificará tu pago pronto.',
            proofUrl 
        });
    } catch (error) {
        console.error('Error uploading proof:', error);
        res.status(500).json({ message: 'Error al subir comprobante' });
    }
};

module.exports = { createCheckoutSession, handleWebhook, uploadProofOfPayment };
