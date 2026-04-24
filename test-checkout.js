const { Client } = require('pg');

async function testCheckout() {
  const client = new Client({
    user: 'root',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'auth_db'
  });
  await client.connect();

  // Create a category and product if not exists
  await client.query(`INSERT INTO category (name, description) VALUES ('Cat 1', 'Desc') ON CONFLICT DO NOTHING`);
  await client.query(`
    INSERT INTO product (name, description, price, stock, "categoryId") 
    VALUES ('Concurrent Product', 'Test', 100, 10, (SELECT id FROM category LIMIT 1))
    ON CONFLICT DO NOTHING;
  `);

  const prod = await client.query('SELECT * FROM product LIMIT 1');
  const user = await client.query('SELECT * FROM users LIMIT 1');
  
  if (!prod.rows[0] || !user.rows[0]) {
    console.error('Missing prod or user');
    return;
  }
  
  const productId = prod.rows[0].id;
  
  await client.end();

  // Login
  const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'neita@420.com', password: '123' }) // wait, is the password 123456? The test before used something else, let's just create a token locally
  });
  
  // wait, what is the password? I don't know the plain password. 
  // Let me just manually generate the JWT!
}
testCheckout();
