require('dotenv').config();
const mongoose = require('mongoose');
const RequestInfo = require('./server/models/RequestInfo');
const { getAgeDateRange } = require('./server/utils/ageFilterHelper');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/elite-hire', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const ageQuery = getAgeDateRange('> 5 Days');
  process.stdout.write(require('util').format("ageQuery:", ageQuery) + "\n");
  const query = { createdAt: ageQuery };
  process.stdout.write(require('util').format("Full Mongo Query:", JSON.stringify(query, null, 2)) + "\n");
  
  const records = await RequestInfo.find(query).select('createdAt').limit(5);
  process.stdout.write(require('util').format("> 5 Days records:", records) + "\n");

  const allRecords = await RequestInfo.find({}).sort({ createdAt: -1 }).select('createdAt').limit(5);
  process.stdout.write(require('util').format("All records:", allRecords) + "\n");

  mongoose.disconnect();
});
