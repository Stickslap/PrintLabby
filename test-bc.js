import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

console.log('Testing BigCommerce Connection...');
console.log('Store Hash:', storeHash);
console.log('Access Token Length:', accessToken?.length);

if (!storeHash || !accessToken) {
  console.error('Missing credentials in .env');
  process.exit(1);
}

const bc = axios.create({
  baseURL: `https://api.bigcommerce.com/stores/${storeHash}/v3`,
  headers: {
    'X-Auth-Token': accessToken,
    'Accept': 'application/json'
  }
});

async function test() {
  try {
    const res = await bc.get('/catalog/products?limit=1');
    console.log('Success! Found', res.data.data.length, 'products');
    console.log('First product name:', res.data.data[0]?.name);
  } catch (err) {
    console.error('Failure:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    }
  }
}

test();
