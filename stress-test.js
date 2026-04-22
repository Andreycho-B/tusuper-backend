const { Client } = require('pg');
const jwt = require('jsonwebtoken');

async function testCheckout() {
  const client = new Client({
    user: 'root',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'auth_db'
  });
  await client.connect();

  // Ensure category
  await client.query(`INSERT INTO category (name, description) VALUES ('Cat 1', 'Desc') ON CONFLICT DO NOTHING`);
  
  // Ensure product
  await client.query(`
    INSERT INTO product (name, description, price, stock, "categoryId") 
    VALUES ('Concurrent Product', 'Test', 100, 10, (SELECT id FROM category LIMIT 1))
    ON CONFLICT DO NOTHING;
  `);

  const prodRes = await client.query('SELECT * FROM product LIMIT 1');
  const userRes = await client.query('SELECT * FROM users LIMIT 1');
  
  await client.end();
  
  const productId = prodRes.rows[0].id;
  const user = userRes.rows[0];

  const payload = { sub: user.id, roles: [] }; // The user might need a specific role? Maybe not for checkout.
  const token = jwt.sign(payload, 'Matrix');
  
  console.log(`Disparando 5 peticiones concurrentes de checkout para productId: ${productId}`);

  const makeRequest = async (i) => {
    try {
      const res = await fetch('http://localhost:3000/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId, quantity: 1 })
      });
      
      const text = await res.text();
      return `Petición ${i}: STATUS ${res.status} - BODY: ${text}`;
    } catch (err) {
      return `Petición ${i}: ERROR - ${err.message}`;
    }
  };

  const promises = [];
  for (let i = 1; i <= 5; i++) {
    promises.push(makeRequest(i));
  }

  const results = await Promise.all(promises);
  results.forEach(res => console.log(res));
}
testCheckout();
