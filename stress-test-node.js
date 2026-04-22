const http = require('http');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoibmVpdGFANDIwLmNvbSIsInJvbGVzIjpbImN1c3RvbWVyIl0sImlhdCI6MTc3Njg5NDQwMn0.4W1kXSn8ieaBJRveGpdTLOTHhMrroaKpSkWuGldyENE";

console.log("Disparando 5 peticiones concurrentes de checkout...");

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/orders/checkout',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

const postData = JSON.stringify({ productId: 2, quantity: 1 });

const promises = Array.from({ length: 5 }).map((_, i) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Request ${i + 1} finished with status code: ${res.statusCode}`);
        if (res.statusCode >= 400) console.log(`Response ${i + 1}:`, data);
        resolve(res.statusCode);
      });
    });

    req.on('error', (e) => {
      console.error(`Request ${i + 1} failed: ${e.message}`);
      resolve(500);
    });

    req.write(postData);
    req.end();
  });
});

Promise.all(promises).then(() => {
  console.log("\nTest finalizado.");
});
