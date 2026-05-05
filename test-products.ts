import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config({ override: true });

const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

async function test() {
  const bc = axios.create({
    baseURL: `https://api.bigcommerce.com/stores/${storeHash}/v3`,
    headers: {
      'X-Auth-Token': accessToken,
      'Accept': 'application/json'
    }
  });

  try {
    const res = await bc.get('/catalog/products?limit=5');
    console.log('--- PRODUCTS FOUND ---');
    res.data.data.forEach(p => {
      console.log(`ID: ${p.id}, Name: ${p.name}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.log(err.response.data);
  }
}

test();
