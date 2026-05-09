const pool = require('../config/db');

const getServices = async (req, res) => {
  try {
    const services = await pool.query(
      'SELECT id, name, description, duration, price, base_price, color, image_url, business_type_id, requires_advance, advance_percentage, payment_options, max_capacity FROM services WHERE user_id = $1 ORDER BY id DESC',
      [req.user.id]
    );
    res.json(services.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const createService = async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
        name, description, duration, base_price, color, image_url, business_type_id,
        custom_fields, availability, options, resources,
        requires_advance, advance_percentage, payment_options,
        max_capacity
    } = req.body;

    // 1. VERIFICACIÓN DE PLAN (SEGURIDAD EXTRA)
    const userResult = await pool.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    const plan = userResult.rows[0]?.plan || 'free';
    
    const countResult = await pool.query('SELECT COUNT(*) FROM services WHERE user_id = $1', [req.user.id]);
    const currentCount = parseInt(countResult.rows[0].count);

    if (plan === 'free' && currentCount >= 5) {
        return res.status(403).json({ 
            message: `Límite alcanzado: El plan GRATIS solo permite 5 servicios (ya tienes ${currentCount}). Mejora tu plan para añadir más.` 
        });
    }
    
    if (plan === 'pro' && currentCount >= 10) {
        return res.status(403).json({ 
            message: `Límite alcanzado: El plan PRO permite 10 servicios. Sube a ULTRA PRO para servicios ilimitados.` 
        });
    }
    
    await client.query('BEGIN');

    // 1. Insert service base
    const serviceRes = await client.query(
      `INSERT INTO services (user_id, name, description, duration, price, base_price, color, image_url, business_type_id, requires_advance, advance_percentage, payment_options, max_capacity) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [req.user.id, name, description, parseFloat(duration) || 0, base_price, base_price, color, image_url, business_type_id, requires_advance || false, advance_percentage || 0, JSON.stringify(payment_options || []), parseInt(max_capacity) || 1]
    );
    const service = serviceRes.rows[0];

    // 2. Insert custom fields
    if (custom_fields && custom_fields.length > 0) {
        for (const field of custom_fields) {
            await client.query(
                `INSERT INTO service_custom_fields (service_id, field_name, label, data_type, options, validation_rules, is_required, display_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [service.id, field.field_name, field.label, field.data_type, JSON.stringify(field.options || []), JSON.stringify(field.validation_rules || {}), field.is_required || false, field.display_order || 0]
            );
        }
    }

    // 3. Insert availability
    if (availability && availability.length > 0) {
        for (const avail of availability) {
            await client.query(
                `INSERT INTO service_availability (service_id, day_of_week, start_time, end_time, max_capacity, price_multiplier)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [service.id, avail.day_of_week, avail.start_time, avail.end_time, avail.max_capacity || 1, avail.price_multiplier || 1.0]
            );
        }
    }

    // 4. Insert options/extras
    if (options && options.length > 0) {
        for (const opt of options) {
            await client.query(
                `INSERT INTO service_options (service_id, name, price_adjustment, max_quantity, is_required)
                 VALUES ($1, $2, $3, $4, $5)`,
                [service.id, opt.name, opt.price_adjustment || 0, opt.max_quantity || 1, opt.is_required || false]
            );
        }
    }

    // 5. Insert resources
    if (resources && resources.length > 0) {
        for (const resItem of resources) {
            await client.query(
                `INSERT INTO service_resources (service_id, resource_id, quantity_required, is_mandatory)
                 VALUES ($1, $2, $3, $4)`,
                [service.id, resItem.resource_id, resItem.quantity_required || 1, resItem.is_mandatory !== false]
            );
        }
    }

    await client.query('COMMIT');
    res.status(201).json(service);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Error al crear el servicio flexible' });
  } finally {
    client.release();
  }
};

const getServiceDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const serviceRes = await pool.query(
            'SELECT id, user_id, name, description, duration, price, base_price, color, image_url, business_type_id, requires_advance, advance_percentage, payment_options, max_capacity FROM services WHERE id = $1', 
            [id]
        );
        
        if (serviceRes.rows.length === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        const service = serviceRes.rows[0];

        const [fields, availability, options, resources] = await Promise.all([
            pool.query('SELECT id, service_id, field_name, label, data_type, options, validation_rules, is_required, display_order FROM service_custom_fields WHERE service_id = $1 ORDER BY display_order', [id]),
            pool.query('SELECT id, service_id, day_of_week, start_time, end_time, max_capacity, price_multiplier FROM service_availability WHERE service_id = $1 ORDER BY day_of_week, start_time', [id]),
            pool.query('SELECT id, service_id, name, price_adjustment, max_quantity, is_required FROM service_options WHERE service_id = $1', [id]),
            pool.query(`
                SELECT sr.id, sr.service_id, sr.resource_id, sr.quantity_required, sr.is_mandatory, r.name as resource_name, r.type as resource_type 
                FROM service_resources sr 
                JOIN resources r ON sr.resource_id = r.id 
                WHERE sr.service_id = $1`, [id])
        ]);

        res.json({
            ...service,
            custom_fields: fields.rows,
            availability: availability.rows,
            options: options.rows,
            resources: resources.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener detalles del servicio' });
    }
};

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'DELETE FROM services WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    res.json({ message: 'Servicio eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Obtener servicios públicos por user_id (sin autenticación)
const getPublicServices = async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id || user_id === 'null' || isNaN(parseInt(user_id))) {
            return res.status(400).json({ message: 'A valid user_id is required' });
        }

        const servicesRes = await pool.query(
            'SELECT id, name, description, duration, price, base_price, color, image_url, business_type_id, requires_advance, advance_percentage, payment_options, max_capacity FROM services WHERE user_id = $1', 
            [parseInt(user_id)]
        );
        const services = servicesRes.rows;

        // Fetch details for each service to make them dynamic
        const detailedServices = await Promise.all(services.map(async (s) => {
            const [fields, availability] = await Promise.all([
                pool.query('SELECT id, service_id, field_name, label, data_type, options, validation_rules, is_required, display_order FROM service_custom_fields WHERE service_id = $1 ORDER BY display_order', [s.id]),
                pool.query('SELECT id, service_id, day_of_week, start_time, end_time, max_capacity, price_multiplier FROM service_availability WHERE service_id = $1 ORDER BY day_of_week', [s.id])
            ]);
            return {
                ...s,
                custom_fields: fields.rows,
                availability: availability.rows
            };
        }));

        res.json(detailedServices);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching services' });
    }
};

const updateService = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { 
        name, description, duration, base_price, color, image_url, business_type_id,
        availability, resources,
        requires_advance, advance_percentage, payment_options,
        max_capacity
    } = req.body;
    
    await client.query('BEGIN');

    // 1. Update service base
    const serviceRes = await client.query(
      `UPDATE services 
       SET name = $1, description = $2, duration = $3, price = $4, base_price = $5, 
           color = $6, image_url = $7, business_type_id = $8, 
           requires_advance = $9, advance_percentage = $10, 
           payment_options = $11, max_capacity = $12 
       WHERE id = $13 AND user_id = $14 RETURNING *`,
      [name, description, parseFloat(duration) || 0, base_price, base_price, color, image_url, business_type_id, requires_advance || false, advance_percentage || 0, JSON.stringify(payment_options || []), parseInt(max_capacity) || 1, id, req.user.id]
    );

    if (serviceRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Servicio no encontrado o sin permisos' });
    }

    // 2. Clear and Insert availability
    await client.query('DELETE FROM service_availability WHERE service_id = $1', [id]);
    if (availability && availability.length > 0) {
        for (const avail of availability) {
            await client.query(
                `INSERT INTO service_availability (service_id, day_of_week, start_time, end_time, max_capacity, price_multiplier)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, avail.day_of_week, avail.start_time, avail.end_time, avail.max_capacity || 1, avail.price_multiplier || 1.0]
            );
        }
    }

    // 3. Clear and Insert resources
    await client.query('DELETE FROM service_resources WHERE service_id = $1', [id]);
    if (resources && resources.length > 0) {
        for (const resItem of resources) {
            await client.query(
                `INSERT INTO service_resources (service_id, resource_id, quantity_required, is_mandatory)
                 VALUES ($1, $2, $3, $4)`,
                [id, resItem.resource_id, resItem.quantity_required || 1, resItem.is_mandatory !== false]
            );
        }
    }

    await client.query('COMMIT');
    res.json(serviceRes.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar el servicio' });
  } finally {
    client.release();
  }
};

module.exports = { getServices, createService, deleteService, getPublicServices, getServiceDetails, updateService };