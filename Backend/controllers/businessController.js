const pool = require('../config/db');

const getBusinessTypes = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, display_name, internal_name, icon_name FROM business_types ORDER BY display_name');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getBusinessTypeFields = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT id, business_type_id, field_name, label, data_type, options, validation_rules, is_required, display_order FROM business_type_fields WHERE business_type_id = $1 ORDER BY display_order',
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getBusinessTypes, getBusinessTypeFields };
