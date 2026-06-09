const getAgeDateRange = (ageFilter) => {
  if (!ageFilter) {
    return null;
  }

  const normalizedAge = String(ageFilter).trim().replace(/\s+/g, ' ').toLowerCase();

  if (normalizedAge === 'all' || normalizedAge === '') {
    return null;
  }

  let minAge = null;
  let maxAge = null;

  if (normalizedAge === 'today') {
    minAge = 1;
    maxAge = 1;
  } else if (normalizedAge === '> 5 days' || normalizedAge === '>5 days' || normalizedAge === '5-14') {
    minAge = 5;
    maxAge = 14;
  } else if (normalizedAge === '> 15 days' || normalizedAge === '>15 days' || normalizedAge === '15-24') {
    minAge = 15;
    maxAge = 24;
  } else if (normalizedAge === '> 25 days' || normalizedAge === '>25 days' || normalizedAge === '25-30') {
    minAge = 25;
    maxAge = 30;
  } else {
    return null;
  }

  const currentDate = new Date();
  // Use start of day for stable calendar-day queries
  const startOfToday = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate())
  );
  
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const query = {};

  if (maxAge !== null) {
    // If maxAge = 14, oldest allowed date is start of 13 days ago
    // Age 1 = today (0 days ago)
    // Age 14 = 13 days ago
    const gteDate = new Date(startOfToday.getTime() - (maxAge - 1) * MS_PER_DAY);
    query.$gte = gteDate;
  }

  if (minAge !== null) {
    // If minAge = 5, newest allowed date is end of 4 days ago
    const lteDate = new Date(startOfToday.getTime() - (minAge - 1) * MS_PER_DAY);
    lteDate.setUTCHours(23, 59, 59, 999);
    query.$lte = lteDate;
  }

  return query;
};

const calculateAgeInDays = (createdAt) => {
  if (!createdAt) return 0;
  const currentDate = new Date();
  const createdDate = new Date(createdAt);
  
  // Use UTC start-of-day to calculate calendar days accurately
  const utcCurrent = Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate());
  const utcCreated = Date.UTC(createdDate.getUTCFullYear(), createdDate.getUTCMonth(), createdDate.getUTCDate());
  
  const diffInMs = utcCurrent - utcCreated;
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1;
};

module.exports = { getAgeDateRange, calculateAgeInDays };
