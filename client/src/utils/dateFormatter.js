export const formatDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date).replace(/\//g, '-');
};

export const formatDateTimeDDMMYYYY = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  
  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);

  // en-IN Intl output format is usually DD/MM/YYYY, h:mm am/pm
  // Reformat to DD-MM-YYYY hh:mm A
  const [datePart, timePart] = formatted.split(', ');
  if (!datePart || !timePart) return formatted;
  const dashedDate = datePart.replace(/\//g, '-');
  const upperTime = timePart.toUpperCase();
  return `${dashedDate} ${upperTime}`;
};
