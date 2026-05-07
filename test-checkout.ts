import axios from 'axios';
const url = 'http://127.0.0.1:3000/api/checkout/process';

async function run() {
  try {
    const res = await axios.post(url, {
      cart: [{ id: 114, quantity: 1, name: "Test product", price: 10, selectedOptions: { 114: 101, 156: 231 } }],
      email: "test@example.com",
      payment_method: "link",
      shipping_address: {
        first_name: "John",
        last_name: "Doe",
        street_1: "123 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701"
      }
    });
    console.log("Success:", res.data);
  } catch (err: any) {
    console.error("Error message:", err.message);
    if (err.response) {
      console.error("Error status:", err.response.status);
      console.error("Error data:", JSON.stringify(err.response.data, null, 2));
    }
  }
}
run();
