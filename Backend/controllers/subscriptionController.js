// Backend/controllers/subscriptionController.js
const pool = require('../config/db');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

exports.getPlans = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM subscription_plans ORDER BY price ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ message: 'Error al obtener los planes' });
    }
};

exports.createCheckoutSession = async (req, res) => {
    // Como el usuario no usa Stripe, devolvemos instrucciones para pago manual del plan
    res.json({ 
        type: 'manual', 
        message: 'Para mejorar tu plan, por favor realiza el pago a través de Pago Móvil, Zelle o PayPal y envía el comprobante a soporte.',
        payment_info: {
            pago_movil: { bank: 'Velora Bank', id: '12.345.678', phone: '0412-1234567' },
            zelle: { email: 'pagos@velora.com' },
            paypal: { email: 'velora@paypal.com' }
        }
    });
};

exports.updateUserPlan = async (req, res) => {
    const { userEmail, newPlan } = req.body;
    
    const admins = ['velorasupport883@gmail.com', 'irisdev25@gmail.com', 'iris.dev25@gmail.com', 'iris201922@gmail.com'];
    if (!admins.includes(req.user.email.toLowerCase())) {
        return res.status(403).json({ message: 'No tienes permisos de administrador' });
    }

    try {
        const result = await pool.query(
            'UPDATE users SET plan = $1 WHERE email = $2 RETURNING id, email, plan',
            [newPlan, userEmail]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ message: 'Plan actualizado correctamente', user: result.rows[0] });
    } catch (error) {
        console.error('Error updating user plan:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

exports.createPortalSession = async (req, res) => {
    res.status(400).json({ message: 'Gestión de facturación manual. Contacta a soporte para cambios.' });
};
