const pool = require('../config/db');

exports.getGlobalStats = async (req, res) => {
    try {
        // Verificar si es admin
        const admins = ['velorasupport883@gmail.com', 'irisdev25@gmail.com', 'iris.dev25@gmail.com', 'iris201922@gmail.com'];
        if (!admins.includes(req.user.email.toLowerCase())) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const appointmentsCount = await pool.query('SELECT COUNT(*) FROM appointments');
        
        // Distribución de planes
        const plansDist = await pool.query('SELECT plan, COUNT(*) FROM users GROUP BY plan');
        
        // Crecimiento mensual (últimos 6 meses)
        const growth = await pool.query(`
            SELECT TO_CHAR(created_at, 'Mon YYYY') as month, COUNT(*) as count
            FROM users 
            WHERE created_at > NOW() - INTERVAL '6 months'
            GROUP BY month, DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
        `);

        const users = await pool.query('SELECT id, name, business_name, email, plan, created_at FROM users ORDER BY id DESC');

        res.json({
            totalUsers: usersCount.rows[0].count,
            totalAppointments: appointmentsCount.rows[0].count,
            plansDistribution: plansDist.rows,
            growthData: growth.rows,
            users: users.rows
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};
