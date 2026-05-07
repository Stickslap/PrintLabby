import axios from 'axios';
async function run() {
  try {
    await axios.post('http://127.0.0.1:3000/api/checkout/process', {
      cart: [{ id: 114, quantity: 1, name: "Test product", price: 10, selectedOptions: {} }],
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
  } catch (err: any) {
    if (err.response) {
      console.log(JSON.stringify(err.response.data, null, 2));
    }
  }
}
run();
