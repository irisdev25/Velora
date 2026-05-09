// Backend/controllers/customerController.js
const pool = require('../config/db');

exports.getCustomers = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            'SELECT * FROM customers WHERE business_id = $1 ORDER BY last_visit DESC NULLS LAST',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching customers' });
    }
};

exports.getCustomerDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const customerId = req.params.id;
        
        const customer = await pool.query(
            'SELECT * FROM customers WHERE id = $1 AND business_id = $2',
            [customerId, userId]
        );

        if (customer.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

        const history = await pool.query(`
            SELECT a.*, s.name as service_name, s.price
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.client_email = $1 AND a.user_id = $2
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `, [customer.rows[0].email, userId]);

        const notes = await pool.query(`
            SELECT * FROM customer_notes 
            WHERE customer_id = $1 AND business_id = $2
            ORDER BY created_at DESC
        `, [customerId, userId]);

        res.json({
            profile: customer.rows[0],
            history: history.rows,
            notes: notes.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching customer details' });
    }
};

exports.addNote = async (req, res) => {
    try {
        const { content } = req.body;
        const customerId = req.params.id;
        const userId = req.user.id;

        const result = await pool.query(
            'INSERT INTO customer_notes (customer_id, business_id, content) VALUES ($1, $2, $3) RETURNING *',
            [customerId, userId, content]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error adding note' });
    }
};

exports.exportCustomers = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Verificar plan del usuario
        const userRes = await pool.query('SELECT plan FROM users WHERE id = $1', [userId]);
        const userPlan = userRes.rows[0].plan;

        if (userPlan === 'free') {
            return res.status(403).json({ 
                message: 'La exportación de datos es una función Pro. ¡Mejora tu plan para desbloquearla!' 
            });
        }

        const result = await pool.query('SELECT * FROM customers WHERE business_id = $1', [userId]);
        res.json({ 
            message: 'Exportación preparada (Simulada)',
            count: result.rows.length,
            data: result.rows 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al exportar' });
    }
};
