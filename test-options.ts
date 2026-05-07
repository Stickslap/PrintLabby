import axios from 'axios';
const url = 'http://127.0.0.1:3000/api/products/114';

async function run() {
  try {
    const res = await axios.get(url);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error(err.message);
  }
}
run();
