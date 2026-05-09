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

        res.json({
            profile: customer.rows[0],
            history: history.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching customer details' });
    }
};

exports.updateNotes = async (req, res) => {
    try {
        const { notes } = req.body;
        await pool.query(
            'UPDATE customers SET notes = $1 WHERE id = $2 AND business_id = $3',
            [notes, req.params.id, req.user.id]
        );
        res.json({ message: 'Notes updated' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating notes' });
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
