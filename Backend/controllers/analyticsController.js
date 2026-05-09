// Backend/controllers/analyticsController.js
const pool = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Ingresos por mes (últimos 6 meses)
        const incomeQuery = `
            SELECT 
                TO_CHAR(appointment_date, 'Mon') as month,
                SUM(s.price) as total
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.user_id = $1 AND a.status = 'confirmed'
            GROUP BY TO_CHAR(appointment_date, 'MM'), TO_CHAR(appointment_date, 'Mon')
            ORDER BY TO_CHAR(appointment_date, 'MM') DESC
            LIMIT 6
        `;
        
        // 2. Servicios más populares
        const popularServicesQuery = `
            SELECT s.name, COUNT(a.id) as count
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.user_id = $1
            GROUP BY s.name
            ORDER BY count DESC
            LIMIT 5
        `;

        // 3. KPIs rápidos
        const kpisQuery = `
            SELECT 
                (SELECT COUNT(*) FROM appointments WHERE user_id = $1 AND appointment_date = CURRENT_DATE) as today_count,
                (SELECT SUM(s.price) FROM appointments a JOIN services s ON a.service_id = s.id WHERE a.user_id = $1 AND a.status = 'confirmed') as total_revenue,
                (SELECT COUNT(*) FROM customers WHERE business_id = $1) as client_count
        `;

        const [income, popular, kpis] = await Promise.all([
            pool.query(incomeQuery, [userId]),
            pool.query(popularServicesQuery, [userId]),
            pool.query(kpisQuery, [userId])
        ]);

        res.json({
            income: income.rows.reverse(),
            popular: popular.rows,
            kpis: kpis.rows[0]
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Server error fetching analytics' });
    }
};
