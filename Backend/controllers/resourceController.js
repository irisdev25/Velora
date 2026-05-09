const pool = require('../config/db');

const getResources = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, user_id, name, type, capacity, description FROM resources WHERE user_id = $1', [req.user.id]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createResource = async (req, res) => {
    try {
        const { name, type, capacity, description } = req.body;
        const result = await pool.query(
            'INSERT INTO resources (user_id, name, type, capacity, description) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, name, type, capacity, description',
            [req.user.id, name, type, capacity || 1, description]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getResources, createResource };
