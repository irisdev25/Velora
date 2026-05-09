const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const isSsl = !!connectionString || (process.env.DB_HOST && !process.env.DB_HOST.includes('localhost'));

console.log('Intentando conectar a la DB en:', connectionString ? 'DATABASE_URL' : process.env.DB_HOST || 'localhost');

const poolConfig = connectionString ? {
  connectionString,
  ssl: { rejectUnauthorized: false }
} : {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'velora_bd',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  ssl: isSsl ? { rejectUnauthorized: false } : false
};

const pool = new Pool(poolConfig);

// Verificar conexión a la base de datos
const checkConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error('Please check your PostgreSQL configuration');
    return false;
  }
};

// Crear tablas si no existen con el esquema completo
const createTables = async () => {
  try {
    // Primero verificar conexión
    const isConnected = await checkConnection();
    if (!isConnected) {
      console.error('Cannot create tables: Database connection failed');
      return;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        business_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMP,
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token VARCHAR(255),
        bio TEXT,
        instagram_url VARCHAR(255),
        whatsapp_number VARCHAR(20),
        banner_image VARCHAR(255),
        stripe_account_id VARCHAR(255),
        manual_payment_info TEXT,
        plan VARCHAR(20) DEFAULT 'free',
        subscription_status VARCHAR(20) DEFAULT 'inactive',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS business_types (
        id SERIAL PRIMARY KEY,
        internal_name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        icon_name VARCHAR(50) DEFAULT 'star'
      );

      CREATE TABLE IF NOT EXISTS business_type_fields (
        id SERIAL PRIMARY KEY,
        business_type_id INTEGER REFERENCES business_types(id) ON DELETE CASCADE,
        field_name VARCHAR(50) NOT NULL,
        label VARCHAR(100) NOT NULL,
        data_type VARCHAR(20) NOT NULL,
        options JSONB DEFAULT '[]'::jsonb,
        validation_rules JSONB DEFAULT '{}'::jsonb,
        is_required BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        capacity INTEGER DEFAULT 1,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        duration NUMERIC(5,2) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        base_price DECIMAL(10,2),
        color VARCHAR(7) DEFAULT '#7c3aed',
        image_url VARCHAR(255),
        business_type_id INTEGER REFERENCES business_types(id),
        requires_advance BOOLEAN DEFAULT false,
        advance_percentage NUMERIC(5,2) DEFAULT 0,
        payment_options JSONB DEFAULT '[]'::jsonb,
        max_capacity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS service_custom_fields (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        field_name VARCHAR(50) NOT NULL,
        label VARCHAR(100) NOT NULL,
        data_type VARCHAR(20) NOT NULL,
        options JSONB DEFAULT '[]'::jsonb,
        validation_rules JSONB DEFAULT '{}'::jsonb,
        is_required BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS service_availability (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        max_capacity INTEGER DEFAULT 1,
        price_multiplier NUMERIC(3,2) DEFAULT 1.0
      );

      CREATE TABLE IF NOT EXISTS service_options (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        price_adjustment DECIMAL(10,2) DEFAULT 0,
        max_quantity INTEGER DEFAULT 1,
        is_required BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS service_resources (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
        quantity_required INTEGER DEFAULT 1,
        is_mandatory BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS availability (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        client_name VARCHAR(100) NOT NULL,
        client_email VARCHAR(100) NOT NULL,
        client_phone VARCHAR(20),
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        total_price DECIMAL(10,2) DEFAULT 0,
        custom_data JSONB DEFAULT '{}'::jsonb,
        cancel_token VARCHAR(255),
        payment_status VARCHAR(20) DEFAULT 'pending',
        proof_of_payment_url VARCHAR(255),
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        total_appointments INTEGER DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0,
        last_visit TIMESTAMP,
        notes TEXT,
        UNIQUE(business_id, email)
      );

      CREATE TABLE IF NOT EXISTS business_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        primary_color VARCHAR(7) DEFAULT '#7c3aed',
        secondary_color VARCHAR(7) DEFAULT '#10b981',
        background_color VARCHAR(7) DEFAULT '#0b090a',
        text_color VARCHAR(7) DEFAULT '#ffffff',
        opening_time TIME DEFAULT '09:00',
        closing_time TIME DEFAULT '17:00',
        business_description TEXT,
        logo_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        features JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Semilla para subscription_plans si está vacío
    const plansCount = await pool.query('SELECT COUNT(*) FROM subscription_plans');
    if (parseInt(plansCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO subscription_plans (name, price, features) VALUES 
        ('Gratis', 0.00, '["Hasta 50 citas/mes", "Gestión básica", "Soporte estándar"]'),
        ('Pro', 29.00, '["Citas ilimitadas", "Estadísticas avanzadas", "Personalización total", "Soporte prioritario"]'),
        ('Ultra', 99.00, '["Todo lo de Pro", "Multiusuario", "API Access", "Account Manager dedicado"]');
      `);
    }

    // Semilla para business_types si está vacío
    const typesCount = await pool.query('SELECT COUNT(*) FROM business_types');
    if (parseInt(typesCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO business_types (internal_name, display_name, icon_name) VALUES 
        ('barber', 'Barbería / Peluquería', 'scissors'),
        ('spa', 'Spa / Estética', 'flower-2'),
        ('medical', 'Hospital / Salud', 'droplet'),
        ('fitness', 'Gym / Pesas', 'dumbbell'),
        ('hotel', 'Hotel / Edificio', 'building-2'),
        ('consulting', 'Asesoría / Consultoría', 'briefcase'),
        ('education', 'Clases / Cuaderno', 'notebook'),
        ('other', 'Otro / Negocio', 'store');
      `);
    }
    console.log('Full schema tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
};

createTables();

module.exports = pool;