require('dotenv').config();
const mongoose = require('mongoose');
const RequestInfo = require('./models/RequestInfo');
const { getAgeDateRange } = require('./utils/ageFilterHelper');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/elite-hire');
  
  // Create test records
  const currentDate = new Date();
  
  const ages = [
    { name: 'Age 1 (Today)', daysAgo: 0.1 }, 
    { name: 'Age 7 (> 5 Days)', daysAgo: 6.5 },
    { name: 'Age 18 (> 15 Days)', daysAgo: 17.5 },
    { name: 'Age 27 (> 25 Days)', daysAgo: 26.5 },
  ];
  
  const testIds = [];

  for (const t of ages) {
    const createdDate = new Date(currentDate.getTime() - t.daysAgo * 24 * 60 * 60 * 1000);
    const doc = await RequestInfo.create({
      idnumber: `TEST-${t.name}`,
      companyName: 'Test Corp',
      domain: 'IT',
      location: 'Remote',
      updatedBy: 'Admin',
    });
    // Use collection.updateOne to bypass mongoose timestamps
    await mongoose.connection.collection('requestinfos').updateOne(
      { _id: doc._id }, 
      { $set: { createdAt: createdDate } }
    );
    testIds.push(doc._id);
    process.stdout.write(require('util').format(`Inserted ${t.name} with expected createdAt: ${createdDate.toISOString()}`) + "\n");
  }
  
  // Verify what was actually saved
  const savedDocs = await RequestInfo.find({ _id: { $in: testIds } }).select('idnumber createdAt');
  process.stdout.write(require('util').format("\nActual saved createdAt values:") + "\n");
  savedDocs.forEach(d => process.stdout.write(require('util').format(`${d.idnumber}: ${d.createdAt.toISOString()}`) + "\n"));
  
  // Test filters
  const filters = ['Today', '> 5 Days', '> 15 Days', '> 25 Days'];
  
  process.stdout.write(require('util').format("\n--- RUNNING QUERIES ---") + "\n");
  for (const filter of filters) {
    const query = getAgeDateRange(filter);
    const records = await RequestInfo.find({ _id: { $in: testIds }, createdAt: query }).select('idnumber createdAt');
    process.stdout.write(require('util').format(`\nResults for '${filter}':`) + "\n");
    records.forEach(r => {
      process.stdout.write(require('util').format(`- ${r.idnumber}`) + "\n");
    });
  }

  // Cleanup
  await RequestInfo.deleteMany({ _id: { $in: testIds } });
  await mongoose.disconnect();
}

test();
