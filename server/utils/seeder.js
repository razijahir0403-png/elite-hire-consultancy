const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const User = require('../models/User');
const Role = require('../models/Role');
const RequestInfo = require('../models/RequestInfo');
const Client = require('../models/Client');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const defaultRoles = [
  {
    name: 'admin',
    description: 'Full system administrator',
    permissions: ['users:read', 'users:write', 'roles:read', 'roles:write', 'requestinfos:read', 'requestinfos:write', 'clients:read', 'clients:write'],
  },
  {
    name: 'recruiter',
    description: 'Recruitment operations user',
    permissions: ['requestinfos:read', 'requestinfos:write', 'clients:read', 'clients:write'],
  },
];

const mockRequestInfos = [
  {
    idnumber: 'EH-2026-001',
    companyName: 'TechNova Solutions',
    domain: 'React Native Developer',
    location: 'Bangalore',
    email: 'ananya.sharma@technova.example',
    contactNumber: '9876543210',
    resourcePerson: 'Ananya Sharma',
    portalLink: 'https://www.naukri.com/job-listings-react-native',
    status: 0,
    description: 'Candidate verified. Experience matches requirements.',
    updatedBy: 'Admin Seeder',
    updatedOn: new Date(Date.now() - 3600000 * 24 * 5),
    statusHistory: [
      {
        status: 9,
        description: 'Application received through portal link.',
        updatedBy: 'Admin Seeder',
        updatedOn: new Date(Date.now() - 3600000 * 24 * 7),
      },
      {
        status: 0,
        description: 'Candidate verified. Experience matches requirements.',
        updatedBy: 'Admin Seeder',
        updatedOn: new Date(Date.now() - 3600000 * 24 * 5),
      },
    ],
  },
  {
    idnumber: 'EH-2026-002',
    companyName: 'CloudStack India',
    domain: 'Node.js Backend Engineer',
    location: 'Hyderabad',
    email: 'vikram.malhotra@cloudstack.example',
    contactNumber: '9988776655',
    resourcePerson: 'Vikram Malhotra',
    portalLink: 'https://www.indeed.com/viewjob?jk=backend123',
    status: 7,
    description: 'Discussed expectations. Candidate is interested.',
    updatedBy: 'Admin Seeder',
    updatedOn: new Date(Date.now() - 3600000 * 24 * 3),
    statusHistory: [
      {
        status: 9,
        description: 'Applied via Indeed listing.',
        updatedBy: 'Admin Seeder',
        updatedOn: new Date(Date.now() - 3600000 * 24 * 4),
      },
      {
        status: 7,
        description: 'Discussed expectations. Candidate is interested.',
        updatedBy: 'Admin Seeder',
        updatedOn: new Date(Date.now() - 3600000 * 24 * 3),
      },
    ],
  },
];

const seedDB = async () => {
  try {
    const roleMap = {};
    for (const roleData of defaultRoles) {
      let role = await Role.findOne({ name: roleData.name });
      if (!role) {
        role = await Role.create(roleData);
      }
      roleMap[roleData.name] = role._id;
    }

    const adminEmail = 'admin@elitehire.com';
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      admin = await User.create({
        name: 'Admin Manager',
        email: adminEmail,
        password: 'EliteHire@2026',
        isApproved: true,
        role: roleMap.admin,
      });
    } else {
      admin.isApproved = true;
      if (!admin.role) admin.role = roleMap.admin;
      await admin.save();
    }

    const count = await RequestInfo.countDocuments();
    if (count === 0) {
      await RequestInfo.insertMany(mockRequestInfos);
    }

    const clientCount = await Client.countDocuments();
    if (clientCount === 0) {
      await Client.insertMany([
        {
          clientId: 'CL-2026-001',
          clientName: 'Apex Retail Group',
          mobile: '9123456780',
          email: 'contact@apexretail.example',
          category: 'Retail & E-Commerce',
          status: 0,
          description: 'Client information verified.',
          createdBy: 'Admin Seeder',
          updatedBy: 'Admin Seeder',
          updatedOn: new Date(),
          statusHistory: [
            {
              status: 0,
              description: 'Client information verified.',
              updatedBy: 'Admin Seeder',
              updatedOn: new Date(),
            },
          ],
        },
      ]);
    }
  } catch (error) {
    // Seeding errors are non-fatal; server continues without seed data
  }
};

module.exports = seedDB;

if (require.main === module) {
  const connectDB = require('../config/db');

  connectDB()
    .then(async () => {
      await seedDB();
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}
