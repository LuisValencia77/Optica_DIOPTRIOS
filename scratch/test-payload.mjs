
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

const payload = {
  type: 'point',
  external_reference: 'test-12345',
  transactions: {
    payments: [{ amount: '10.00' }]
  },
  config: {
    point: { terminal_id: 'CAJAOPTICA01' }
  }
};

async function test() {
  const resMp = await fetch('https://api.mercadopago.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Idempotency-Key': '1234567890'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await resMp.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
