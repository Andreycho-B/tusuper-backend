const { Client } = require('pg');
const jwt = require('jsonwebtoken'); // Assuming jsonwebtoken is installed, else I'll use auth_db to create it

async function run() {
  const client = new Client({
    user: 'root',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'auth_db'
  });
  await client.connect();
  
  // Create a product
  await client.query(`
    INSERT INTO product (name, description, price, stock, "categoryId") 
    VALUES ('Concurrent Product', 'Test', 100, 10, 1) 
    ON CONFLICT DO NOTHING RETURNING id;
  `);
  
  const productRes = await client.query('SELECT * FROM product LIMIT 1');
  const userRes = await client.query('SELECT * FROM users LIMIT 1');
  
  if (!productRes.rows[0]) {
    // maybe category doesn't exist?
    await client.query(`INSERT INTO category (name, description) VALUES ('Cat 1', 'Desc') ON CONFLICT DO NOTHING`);
    await client.query(`
      INSERT INTO product (name, description, price, stock, "categoryId") 
      VALUES ('Concurrent Product', 'Test', 100, 10, (SELECT id FROM category LIMIT 1))
    `);
  }
  
  const prod = await client.query('SELECT * FROM product LIMIT 1');
  const user = userRes.rows[0];
  
  console.log('PRODUCT_ID=' + prod.rows[0].id);
  
  // generate JWT manually
  // payload from JWT strategy should match what we use
  // The strategy probably expects { sub: user.id, email: user.email }
  // we can use standard fetch to login if we know the password.
  await client.end();
}
run().catch(console.error);
