const { Client } = require('pg');
const client = new Client({
  user: 'root',
  password: '123456',
  host: 'localhost',
  port: 5432,
  database: 'auth_db'
});
async function run() {
  await client.connect();
  const users = await client.query('SELECT * FROM users LIMIT 1');
  const products = await client.query('SELECT * FROM product LIMIT 1');
  console.log('User:', users.rows[0]);
  console.log('Product:', products.rows[0]);
  await client.end();
}
run();
