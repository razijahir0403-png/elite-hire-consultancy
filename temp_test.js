const { getAgeDateRange, calculateAgeInDays } = require('./server/utils/ageFilterHelper');
const MS = 1000 * 60 * 60 * 24;
const now = new Date();
const records = [
  { name: 'age 8', createdAt: new Date(now.getTime() - 7.5 * MS) },
  { name: 'age 15', createdAt: new Date(now.getTime() - 14.5 * MS) },
  { name: 'age 26', createdAt: new Date(now.getTime() - 25.5 * MS) }
];
const filters = ['> 5 Days', '> 15 Days', '> 25 Days'];
for (const filter of filters) {
  const query = getAgeDateRange(filter);
  process.stdout.write(require('util').format('Filter:', filter, 'query:', query) + "\n");
  for (const r of records) {
    const age = calculateAgeInDays(r.createdAt);
    const match = r.createdAt > query.$gt && r.createdAt <= query.$lte;
    process.stdout.write(require('util').format('  Record:', r.name, 'ageInDays:', age, 'match:', match) + "\n");
  }
}
