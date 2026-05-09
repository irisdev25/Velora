const pool = require('../config/db');
const logger = require('../config/logger');

const getBusinessSettings = async (req, res) => {
    try {
        const { businessId } = req.params;
        
        const settings = await pool.query(
            `SELECT bs.user_id, bs.primary_color, bs.secondary_color, bs.background_color, bs.text_color, bs.business_description, bs.logo_url, bs.opening_time, bs.closing_time, 
                    u.business_name, u.name, u.email, u.plan, u.bio, u.instagram_url, u.whatsapp_number, u.banner_image, u.stripe_account_id, u.manual_payment_info 
             FROM business_settings bs 
             JOIN users u ON u.id = bs.user_id 
             WHERE bs.user_id = $1`,
            [businessId]
        );

        if (settings.rows.length === 0) {
            // Crear configuración por defecto si no existe
            const defaultSettings = await pool.query(
                `INSERT INTO business_settings (user_id, primary_color, secondary_color, background_color, text_color, business_description, logo_url, opening_time, closing_time)
                 VALUES ($1, '#7c3aed', '#10b981', '#0b090a', '#ffffff', '', '', '09:00', '17:00')
                 RETURNING user_id, primary_color, secondary_color, background_color, text_color, business_description, logo_url, opening_time, closing_time`,
                [businessId]
            );
            
            // Obtener información del usuario
            const userInfo = await pool.query(
                'SELECT business_name, name, email FROM users WHERE id = $1',
                [businessId]
            );
            
            const result = defaultSettings.rows[0];
            result.business_name = userInfo.rows[0]?.business_name || 'Negocio';
            result.name = userInfo.rows[0]?.name || 'Usuario';
            result.email = userInfo.rows[0]?.email || '';
            
            return res.json(result);
        }

        res.json(settings.rows[0]);
    } catch (error) {
        console.error('Error fetching business settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateBusinessSettings = async (req, res) => {
    try {
        const { 
            primary_color, 
            secondary_color, 
            background_color, 
            text_color,
            business_description,
            logo_url,
            opening_time,
            closing_time,
            bio,
            instagram_url,
            whatsapp_number,
            banner_image,
            stripe_account_id,
            manual_payment_info
        } = req.body;

        // La personalización de branding ahora está disponible para todos los planes

        // 1. Actualizar settings de diseño y horario
        const updated = await pool.query(
            `UPDATE business_settings 
             SET primary_color = COALESCE($1, primary_color),
                 secondary_color = COALESCE($2, secondary_color),
                 background_color = COALESCE($3, background_color),
                 text_color = COALESCE($4, text_color),
                 business_description = COALESCE($5, business_description),
                 logo_url = COALESCE($6, logo_url),
                 opening_time = COALESCE($7, opening_time),
                 closing_time = COALESCE($8, closing_time)
             WHERE user_id = $9 
             RETURNING user_id, primary_color, secondary_color, background_color, text_color, business_description, logo_url, opening_time, closing_time`,
            [primary_color, secondary_color, background_color, text_color, business_description, logo_url, opening_time, closing_time, req.user.id]
        );

        let settingsResult = updated.rows[0];

        if (updated.rows.length === 0) {
            const newSettings = await pool.query(
                `INSERT INTO business_settings (user_id, primary_color, secondary_color, background_color, text_color, business_description, logo_url, opening_time, closing_time)
                 VALUES ($1, COALESCE($2, '#7c3aed'), COALESCE($3, '#10b981'), COALESCE($4, '#0b090a'), COALESCE($5, '#ffffff'), COALESCE($6, ''), COALESCE($7, ''), COALESCE($8, '09:00'), COALESCE($9, '17:00'))
                 RETURNING user_id, primary_color, secondary_color, background_color, text_color, business_description, logo_url, opening_time, closing_time`,
                [req.user.id, primary_color, secondary_color, background_color, text_color, business_description, logo_url, opening_time, closing_time]
            );
            settingsResult = newSettings.rows[0];
        }

        // 2. Actualizar campos públicos del usuario en la tabla users
        await pool.query(
            `UPDATE users 
             SET bio = COALESCE($1, bio),
                 instagram_url = COALESCE($2, instagram_url),
                 whatsapp_number = COALESCE($3, whatsapp_number),
                 banner_image = COALESCE($4, banner_image),
                 stripe_account_id = COALESCE($5, stripe_account_id),
                 manual_payment_info = COALESCE($6, manual_payment_info)
             WHERE id = $7`,
            [bio, instagram_url, whatsapp_number, banner_image, stripe_account_id, manual_payment_info ? JSON.stringify(manual_payment_info) : null, req.user.id]
        );

        res.json(settingsResult);
    } catch (error) {
        console.error('Error updating business settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se subió ningún archivo' });
        }

        // En Cloudinary con Multer Storage, req.file.path contiene la URL completa
        const logoUrl = req.file.path;
        
        res.json({ 
            message: 'Logo subido correctamente',
            logoUrl: logoUrl 
        });
    } catch (error) {
        logger.error('Error in uploadLogo:', error);
        res.status(500).json({ message: 'Error al subir el logo a la nube' });
    }
};

const uploadBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se subió ningún archivo para el banner' });
        }

        const bannerUrl = req.file.path;
        
        res.json({ 
            message: 'Banner subido correctamente',
            bannerUrl: bannerUrl 
        });
    } catch (error) {
        logger.error('Error in uploadBanner:', error);
        res.status(500).json({ message: 'Error al subir el banner a la nube' });
    }
};

module.exports = { getBusinessSettings, updateBusinessSettings, uploadLogo, uploadBanner };