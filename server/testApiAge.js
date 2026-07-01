const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://localhost:5000/api/request-info', {
      params: { age: '> 5 Days' }
    });
    const records = res.data.records || [];
    process.stdout.write("Records returned for '> 5 Days': " + records.length + "\n");
    if (records.length > 0) {
      process.stdout.write("Sample createdAt: " + records[0].createdAt + "\n");
    }
  } catch (err) {
    console.error(err.message);
  }
}
test();
