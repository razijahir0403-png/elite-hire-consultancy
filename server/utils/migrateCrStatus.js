const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { toCrStatusCode, CR_KEY_TO_CODE } = require('./crStatusMaster');

const migrateCrStatus = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MongoDB URI found in environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB. Starting CR Status migration...');

    const collection = mongoose.connection.collection('requestinfos');
    const records = await collection.find({}).toArray();
    console.log(`Found ${records.length} records to inspect.`);

    let updatedCount = 0;

    for (const record of records) {
      let numericCode = toCrStatusCode(record.crStatus);

      if (!numericCode && record.activeCondition) {
        numericCode = toCrStatusCode(record.activeCondition);
      }

      if (!numericCode && record.conditionsRequired && typeof record.conditionsRequired === 'object') {
        const trueKey = Object.keys(CR_KEY_TO_CODE).find((k) => Boolean(record.conditionsRequired[k]));
        if (trueKey) {
          numericCode = CR_KEY_TO_CODE[trueKey];
        }
      }

      const documents = Array.isArray(record.documents) ? [...record.documents] : [];

      if (record.requestLetter?.path) {
        const exists = documents.some((d) => d.fileUrl === record.requestLetter.path);
        if (!exists) {
          documents.push({
            fileName: record.requestLetter.name || 'Request-Letter',
            fileUrl: record.requestLetter.path,
            fileSize: record.requestLetter.size || 0,
            uploadedAt: record.requestLetter.uploadedAt || new Date(),
            uploadedBy: record.requestLetter.uploadedBy || 'System',
          });
        }
      }

      if (record.urlLetter?.path) {
        const exists = documents.some((d) => d.fileUrl === record.urlLetter.path);
        if (!exists) {
          documents.push({
            fileName: record.urlLetter.name || 'URL-Letter',
            fileUrl: record.urlLetter.path,
            fileSize: record.urlLetter.size || 0,
            uploadedAt: record.urlLetter.uploadedAt || new Date(),
            uploadedBy: record.urlLetter.uploadedBy || 'System',
          });
        }
      }

      await collection.updateOne(
        { _id: record._id },
        {
          $set: {
            crStatus: numericCode || null, // Stored strictly as numeric value (1-10) or null
            documents,
          },
        }
      );
      updatedCount += 1;
    }

    console.log(`Successfully migrated ${updatedCount} records to numeric CR status!`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  migrateCrStatus();
}

module.exports = migrateCrStatus;
