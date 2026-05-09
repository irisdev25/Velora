require('dotenv').config({ path: '../.env' });
const pool = require('../config/db');

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('Creating customer_notes table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS customer_notes (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
                business_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Migrar notas existentes si hay alguna en la tabla customers
        console.log('Migrating existing notes...');
        await client.query(`
            INSERT INTO customer_notes (customer_id, business_id, content, created_at)
            SELECT id, business_id, notes, last_visit
            FROM customers 
            WHERE notes IS NOT NULL AND notes != '';
        `);

        await client.query('COMMIT');
        console.log('Success! Table created and notes migrated.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

run();
