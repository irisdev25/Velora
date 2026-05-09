const pool = require('../config/db');

const getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

        // 1. Tasa de Ocupación (Mes actual)
        // Obtener configuración de horario para capacidad real
        const settingsResult = await pool.query(
            'SELECT opening_time, closing_time FROM business_settings WHERE user_id = $1',
            [userId]
        );
        const settings = settingsResult.rows[0] || { opening_time: '09:00', closing_time: '17:00' };
        
        const [startH, startM] = settings.opening_time.split(':').map(Number);
        const [endH, endM] = settings.closing_time.split(':').map(Number);
        const totalMinutesPerDay = (endH * 60 + endM) - (startH * 60 + startM);
        const slotsPerDay = Math.floor(totalMinutesPerDay / 30);
        const monthlyCapacity = 22 * slotsPerDay; // 22 días hábiles

        const occupationResult = await pool.query(
            `SELECT count(*) FROM appointments 
             WHERE user_id = $1 AND status = 'completed' AND appointment_date >= $2`,
            [userId, startOfMonth]
        );
        const completedAppointments = parseInt(occupationResult.rows[0].count);
        const occupationRate = monthlyCapacity > 0 ? ((completedAppointments / monthlyCapacity) * 100).toFixed(1) : 0;

        // 2. Servicios Populares (Top 3)
        const popularResult = await pool.query(
            `SELECT s.name, count(a.id) as count
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             WHERE a.user_id = $1
             GROUP BY s.name
             ORDER BY count DESC
             LIMIT 3`,
            [userId]
        );
        const servicesPopulares = popularResult.rows;

        // 3. Tendencias (Últimos 7 días)
        const trendsResult = await pool.query(
            `SELECT appointment_date::date as date, count(*) as count
             FROM appointments
             WHERE user_id = $1 AND appointment_date >= CURRENT_DATE - INTERVAL '6 days'
             GROUP BY date
             ORDER BY date ASC`,
            [userId]
        );

        // Comparativa Semanal
        const currentWeekCount = await pool.query(
            `SELECT count(*) FROM appointments 
             WHERE user_id = $1 AND appointment_date >= CURRENT_DATE - INTERVAL '6 days'`,
            [userId]
        );
        const prevWeekCount = await pool.query(
            `SELECT count(*) FROM appointments 
             WHERE user_id = $1 AND appointment_date < CURRENT_DATE - INTERVAL '6 days' 
             AND appointment_date >= CURRENT_DATE - INTERVAL '13 days'`,
            [userId]
        );

        const currentCount = parseInt(currentWeekCount.rows[0].count);
        const prevCount = parseInt(prevWeekCount.rows[0].count);
        let variation = 0;
        if (prevCount > 0) {
            variation = (((currentCount - prevCount) / prevCount) * 100).toFixed(1);
        } else if (currentCount > 0) {
            variation = 100;
        }

        res.json({
            occupationRate,
            completedAppointments,
            servicesPopulares,
            weeklyTrend: trendsResult.rows,
            weekComparison: {
                currentCount,
                prevCount,
                variation
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getStats };
