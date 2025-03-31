const cron = require('node-cron');
const { roiIncome, weeklyDistribution, monthlyDistribution } = require('./model');

// Schedule tasks with Asia/Kolkata timezone
// Cron syntax: minute hour day-of-month month day-of-week

// Run Daily @ 12:10 AM Asia/Kolkata
cron.schedule('10 0 * * *', () => {
    roiIncome();
}, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
});

// Run weekly on every Monday morning 12:05 AM Asia/Kolkata
cron.schedule('5 0 * * 1', () => {
    weeklyDistribution();
}, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
});

// Run monthly on every 1st date of the month at 12:30 AM Asia/Kolkata
cron.schedule('30 0 1 * *', () => {
    monthlyDistribution();
}, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
});

console.log('Cron jobs scheduled with Asia/Kolkata timezone');