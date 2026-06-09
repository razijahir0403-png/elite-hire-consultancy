require('dotenv').config();
const mongoose = require('mongoose');
const RequestInfo = require('./models/RequestInfo');
const { getAgeDateRange } = require('./utils/ageFilterHelper');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/elite-hire', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const ageQuery = getAgeDateRange('> 5 Days');
  console.log("ageQuery:", ageQuery);
  const query = { createdAt: ageQuery };
  console.log("Full Mongo Query:", JSON.stringify(query, null, 2));
  
  const records = await RequestInfo.find(query).select('createdAt').limit(5);
  console.log("> 5 Days records:", records);

  mongoose.disconnect();
});
