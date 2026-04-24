const { Client } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
  const client = new Client({
    user: 'root',
    password: '123456',
    database: 'auth_db',
    host: 'localhost'
  });
  
  try {
    await client.connect();
    const res = await client.query('SELECT id, email, role FROM "user" LIMIT 1');
    if (res.rows.length === 0) {
      console.log('No users found in database.');
      return;
    }
    const user = res.rows[0];
    const payload = { sub: user.id, email: user.email, roles: [user.role] };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret');
    console.log(token);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
