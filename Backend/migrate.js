require('dotenv').config({ path: './.env' });
const pool = require('./config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('Altering services table for numeric duration...');
        await client.query(`
            ALTER TABLE services 
            ALTER COLUMN duration TYPE NUMERIC(5,2) USING (duration::NUMERIC(5,2));
        `);
        
        console.log('Adding advance payment columns to services...');
        await client.query(`
            ALTER TABLE services 
            ADD COLUMN IF NOT EXISTS requires_advance BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS advance_percentage NUMERIC(5,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS payment_options JSONB DEFAULT '[]'::jsonb;
        `);

        console.log('Creating notifications table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('COMMIT');
        console.log('Migration successful.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
