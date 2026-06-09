const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://localhost:5000/api/request-info', {
      params: { age: '> 5 Days' }
    });
    const records = res.data.records || [];
    console.log("Records returned for '> 5 Days':", records.length);
    if (records.length > 0) {
      console.log("Sample createdAt:", records[0].createdAt);
    }
  } catch (err) {
    console.error(err.message);
  }
}
test();
