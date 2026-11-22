/**
 * Migrate Existing Documents to GridFS
 *
 * This script reads all existing document references from the database,
 * finds their corresponding local files, uploads them to MongoDB GridFS
 * using the "toolDocuments" bucket, and updates the DB records with the
 * new GridFS file IDs.
 *
 * Safety:
 *  - Does NOT delete any local files.
 *  - Skips records that already have a gridfsId (idempotent / re-runnable).
 *  - Reports files that could not be found on disk.
 *  - Verifies each upload can be retrieved before marking as migrated.
 *
 * Usage:
 *   node utils/migrateToGridFS.js
 */

const path = require('path');
const dns = require('dns');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { initGridFS } = require('../config/gridfs');
const { uploadLocalFileToGridFS, getGridFSFileMetadata } = require('../services/gridfsService');

// Models
const RequestInfo = require('../models/RequestInfo');
const Client = require('../models/Client');
const ReceivedInfo = require('../models/ReceivedInfo');

// Path resolvers
const { resolveAnalyticsDocumentPath, getMimeType: getAnalyticsMime } = require('./analyticsDocumentPaths');
const { resolveClientDocumentPath } = require('./clientDocumentPaths');
const { resolveClientAuditDocumentPath, getMimeType: getAuditMime } = require('./clientAuditDocumentPaths');
const { resolveReceivedInfoAuditDocumentPath, getMimeType: getRiAuditMime } = require('./receivedInfoAuditDocumentPaths');

const stats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  alreadyMigrated: 0,
  missingFile: 0,
  errors: [],
};

const log = (msg) => console.log(`[Migration] ${msg}`);
const warn = (msg) => console.warn(`[Migration] ⚠ ${msg}`);

// ────────────────────────────────────────────────────────────
// ANALYTICS (RequestInfo) MIGRATION
// ────────────────────────────────────────────────────────────

const migrateAnalyticsDocs = async () => {
  const docFields = [
    { field: 'requestLetter', docType: 'request-letter' },
    { field: 'urlLetter', docType: 'url-letter' },
    { field: 'companyProfile', docType: 'company-profile' },
  ];

  const records = await RequestInfo.find({}).lean();
  log(`Found ${records.length} RequestInfo records to scan.`);

  for (const record of records) {
    for (const { field, docType } of docFields) {
      const docObj = record[field];
      if (!docObj) continue;

      stats.total++;

      // Already migrated?
      if (docObj.gridfsId) {
        stats.alreadyMigrated++;
        continue;
      }

      const storedPath = docObj.path || docObj.fileUrl;
      if (!storedPath) {
        stats.skipped++;
        continue;
      }

      const absolutePath = await resolveAnalyticsDocumentPath(storedPath, {
        id: record._id.toString(),
        docType,
      });

      if (!absolutePath) {
        stats.missingFile++;
        const msg = `MISSING: RequestInfo ${record._id} [${record.idnumber}] → ${field} → ${storedPath}`;
        warn(msg);
        stats.errors.push(msg);
        continue;
      }

      try {
        const filename = docObj.fileName || docObj.originalName || docObj.name || path.basename(absolutePath);
        const mimeType = getAnalyticsMime(filename);

        const result = await uploadLocalFileToGridFS(absolutePath, filename, mimeType, {
          recordId: record._id.toString(),
          documentType: docType,
          migratedFrom: storedPath,
          migratedAt: new Date().toISOString(),
        });

        // Verify retrieval
        const meta = await getGridFSFileMetadata(result.gridfsId);
        if (!meta) {
          throw new Error('Verification failed: uploaded file not found in GridFS');
        }

        // Update DB record
        await RequestInfo.updateOne(
          { _id: record._id },
          {
            $set: {
              [`${field}.gridfsId`]: result.gridfsId,
              [`${field}.contentType`]: result.contentType,
            },
          }
        );

        stats.migrated++;
        log(`✓ RequestInfo ${record.idnumber} → ${field} → GridFS ${result.gridfsId}`);
      } catch (err) {
        const msg = `ERROR: RequestInfo ${record._id} [${record.idnumber}] → ${field}: ${err.message}`;
        warn(msg);
        stats.errors.push(msg);
      }
    }
  }
};

// ────────────────────────────────────────────────────────────
// CLIENT PROFILE / PROOF DOCUMENT MIGRATION
// ────────────────────────────────────────────────────────────

const migrateClientDocs = async () => {
  const records = await Client.find({}).lean();
  log(`Found ${records.length} Client records to scan.`);

  for (const record of records) {
    // Profile Document
    if (record.profileDocumentPath) {
      stats.total++;

      if (record.profileDocumentGridfsId) {
        stats.alreadyMigrated++;
      } else {
        const absolutePath = await resolveClientDocumentPath(record.profileDocumentPath, {
          clientId: record.clientId || record._id.toString(),
          documentType: 'profile',
        });

        if (!absolutePath) {
          stats.missingFile++;
          const msg = `MISSING: Client ${record._id} [${record.clientId}] → profileDocument → ${record.profileDocumentPath}`;
          warn(msg);
          stats.errors.push(msg);
        } else {
          try {
            const filename = record.profileDocumentName || path.basename(absolutePath);
            const result = await uploadLocalFileToGridFS(absolutePath, filename, 'application/pdf', {
              recordId: record._id.toString(),
              documentType: 'profile',
              migratedFrom: record.profileDocumentPath,
              migratedAt: new Date().toISOString(),
            });

            const meta = await getGridFSFileMetadata(result.gridfsId);
            if (!meta) throw new Error('Verification failed');

            await Client.updateOne(
              { _id: record._id },
              {
                $set: {
                  profileDocumentGridfsId: result.gridfsId,
                  profileDocumentContentType: result.contentType,
                },
              }
            );

            stats.migrated++;
            log(`✓ Client ${record.clientId} → profileDocument → GridFS ${result.gridfsId}`);
          } catch (err) {
            const msg = `ERROR: Client ${record._id} [${record.clientId}] → profileDocument: ${err.message}`;
            warn(msg);
            stats.errors.push(msg);
          }
        }
      }
    }

    // Proof Document
    if (record.proofDocumentPath) {
      stats.total++;

      if (record.proofDocumentGridfsId) {
        stats.alreadyMigrated++;
      } else {
        const absolutePath = await resolveClientDocumentPath(record.proofDocumentPath, {
          clientId: record.clientId || record._id.toString(),
          documentType: 'proof',
        });

        if (!absolutePath) {
          stats.missingFile++;
          const msg = `MISSING: Client ${record._id} [${record.clientId}] → proofDocument → ${record.proofDocumentPath}`;
          warn(msg);
          stats.errors.push(msg);
        } else {
          try {
            const filename = record.proofDocumentName || path.basename(absolutePath);
            const result = await uploadLocalFileToGridFS(absolutePath, filename, 'application/pdf', {
              recordId: record._id.toString(),
              documentType: 'proof',
              migratedFrom: record.proofDocumentPath,
              migratedAt: new Date().toISOString(),
            });

            const meta = await getGridFSFileMetadata(result.gridfsId);
            if (!meta) throw new Error('Verification failed');

            await Client.updateOne(
              { _id: record._id },
              {
                $set: {
                  proofDocumentGridfsId: result.gridfsId,
                  proofDocumentContentType: result.contentType,
                },
              }
            );

            stats.migrated++;
            log(`✓ Client ${record.clientId} → proofDocument → GridFS ${result.gridfsId}`);
          } catch (err) {
            const msg = `ERROR: Client ${record._id} [${record.clientId}] → proofDocument: ${err.message}`;
            warn(msg);
            stats.errors.push(msg);
          }
        }
      }
    }

    // Client Audit Documents (clProofDoc, coverLetter, clProfileDoc)
    const auditFields = [
      { field: 'clProofDoc', docType: 'cl-proof-doc' },
      { field: 'coverLetter', docType: 'cover-letter' },
      { field: 'clProfileDoc', docType: 'cl-profile-doc' },
    ];

    for (const { field, docType } of auditFields) {
      const docObj = record[field];
      if (!docObj) continue;

      stats.total++;

      if (docObj.gridfsId) {
        stats.alreadyMigrated++;
        continue;
      }

      const storedPath = docObj.path || docObj.fileUrl;
      if (!storedPath) {
        stats.skipped++;
        continue;
      }

      const absolutePath = await resolveClientAuditDocumentPath(storedPath, {
        id: record._id.toString(),
        docType,
      });

      if (!absolutePath) {
        stats.missingFile++;
        const msg = `MISSING: Client ${record._id} [${record.clientId}] → ${field} → ${storedPath}`;
        warn(msg);
        stats.errors.push(msg);
        continue;
      }

      try {
        const filename = docObj.fileName || path.basename(absolutePath);
        const mimeType = getAuditMime(filename);

        const result = await uploadLocalFileToGridFS(absolutePath, filename, mimeType, {
          recordId: record._id.toString(),
          documentType: docType,
          migratedFrom: storedPath,
          migratedAt: new Date().toISOString(),
        });

        const meta = await getGridFSFileMetadata(result.gridfsId);
        if (!meta) throw new Error('Verification failed');

        await Client.updateOne(
          { _id: record._id },
          {
            $set: {
              [`${field}.gridfsId`]: result.gridfsId,
              [`${field}.contentType`]: result.contentType,
            },
          }
        );

        stats.migrated++;
        log(`✓ Client ${record.clientId} → ${field} → GridFS ${result.gridfsId}`);
      } catch (err) {
        const msg = `ERROR: Client ${record._id} [${record.clientId}] → ${field}: ${err.message}`;
        warn(msg);
        stats.errors.push(msg);
      }
    }
  }
};

// ────────────────────────────────────────────────────────────
// RECEIVED INFO AUDIT DOCUMENT MIGRATION
// ────────────────────────────────────────────────────────────

const migrateReceivedInfoAuditDocs = async () => {
  const docFields = [
    { field: 'proposalRequest', docType: 'proposal-request' },
    { field: 'contractAgreement', docType: 'contract-agreement' },
    { field: 'mouFile', docType: 'mou-file' },
  ];

  const records = await ReceivedInfo.find({}).lean();
  log(`Found ${records.length} ReceivedInfo records to scan.`);

  for (const record of records) {
    for (const { field, docType } of docFields) {
      const docObj = record[field];
      if (!docObj) continue;

      stats.total++;

      if (docObj.gridfsId) {
        stats.alreadyMigrated++;
        continue;
      }

      const storedPath = docObj.path || docObj.fileUrl;
      if (!storedPath) {
        stats.skipped++;
        continue;
      }

      const absolutePath = await resolveReceivedInfoAuditDocumentPath(storedPath, {
        id: record._id.toString(),
        docType,
      });

      if (!absolutePath) {
        stats.missingFile++;
        const msg = `MISSING: ReceivedInfo ${record._id} [${record.requestId}] → ${field} → ${storedPath}`;
        warn(msg);
        stats.errors.push(msg);
        continue;
      }

      try {
        const filename = docObj.fileName || docObj.originalName || docObj.name || path.basename(absolutePath);
        const mimeType = getRiAuditMime(filename);

        const result = await uploadLocalFileToGridFS(absolutePath, filename, mimeType, {
          recordId: record._id.toString(),
          documentType: docType,
          migratedFrom: storedPath,
          migratedAt: new Date().toISOString(),
        });

        const meta = await getGridFSFileMetadata(result.gridfsId);
        if (!meta) throw new Error('Verification failed');

        await ReceivedInfo.updateOne(
          { _id: record._id },
          {
            $set: {
              [`${field}.gridfsId`]: result.gridfsId,
              [`${field}.contentType`]: result.contentType,
            },
          }
        );

        stats.migrated++;
        log(`✓ ReceivedInfo ${record.requestId} → ${field} → GridFS ${result.gridfsId}`);
      } catch (err) {
        const msg = `ERROR: ReceivedInfo ${record._id} [${record.requestId}] → ${field}: ${err.message}`;
        warn(msg);
        stats.errors.push(msg);
      }
    }
  }
};

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────

const run = async () => {
  log('Connecting to MongoDB...');
  await connectDB();
  initGridFS();
  log('Connected. Starting migration...\n');

  await migrateAnalyticsDocs();
  await migrateClientDocs();
  await migrateReceivedInfoAuditDocs();

  log('\n════════════════════════════════════════');
  log('           MIGRATION SUMMARY');
  log('════════════════════════════════════════');
  log(`Total document references scanned:  ${stats.total}`);
  log(`Successfully migrated to GridFS:    ${stats.migrated}`);
  log(`Already migrated (skipped):         ${stats.alreadyMigrated}`);
  log(`Skipped (no stored path):           ${stats.skipped}`);
  log(`Missing local files:                ${stats.missingFile}`);
  log(`Errors:                             ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    log('\n── Errors & Missing Files ──');
    stats.errors.forEach((e) => log(`  • ${e}`));
  }

  if (stats.missingFile > 0) {
    log('\n⚠ Files marked MISSING were not found on the local disk.');
    log('  These must be restored from a backup or another surviving copy');
    log('  before they can be migrated to GridFS.');
  }

  log('\n✅ Migration complete. Local files have NOT been deleted.');
  log('   Verify everything works, then remove local files at your discretion.\n');

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('[Migration] Fatal error:', err);
  process.exit(1);
});
