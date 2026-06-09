const { getAgeDateRange } = require('./server/utils/ageFilterHelper');

console.log("Today:", getAgeDateRange("Today"));
console.log("> 5 Days:", getAgeDateRange("> 5 Days"));
console.log("> 15 Days:", getAgeDateRange("> 15 Days"));
console.log("> 25 Days:", getAgeDateRange("> 25 Days"));
