#!/bin/bash
# Test de Concurrencia B2C para Validar Pessimistic Lock

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoibmVpdGFANDIwLmNvbSIsInJvbGVzIjpbImN1c3RvbWVyIl0sImlhdCI6MTc3Njg5NDQwMn0.4W1kXSn8ieaBJRveGpdTLOTHhMrroaKpSkWuGldyENE"

echo "Disparando 5 peticiones concurrentes de checkout..."

for i in {1..5}; do
  curl -s -X POST http://localhost:3000/orders/checkout \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"productId": 1, "quantity": 1}' &
done

wait
echo ""
echo "Test finalizado."
