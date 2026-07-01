const { getAgeDateRange } = require('./server/utils/ageFilterHelper');

process.stdout.write(require('util').format("Today:", getAgeDateRange("Today")) + "\n");
process.stdout.write(require('util').format("> 5 Days:", getAgeDateRange("> 5 Days")) + "\n");
process.stdout.write(require('util').format("> 15 Days:", getAgeDateRange("> 15 Days")) + "\n");
process.stdout.write(require('util').format("> 25 Days:", getAgeDateRange("> 25 Days")) + "\n");
