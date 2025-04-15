function isScheduledDateInTheFuture(date) {
	// date is in the format mm/dd/yyyy
	console.log("isScheduledDateInTheFuture", date);
	if (!date) return false;
	const [month, day, year] = date.split('/').map(x => parseInt(x));
	console.log("month:", month, "day:", day, "year:", year);
	const today = new Date();
	console.log("today:", today);
	const scheduledDate = new Date(year, month - 1, day);
	console.log("scheduledDate:", scheduledDate);
	return scheduledDate > today;
}
exports.isScheduledDateInTheFuture = isScheduledDateInTheFuture;

const TIME_ZONE = 'America/Indiana/Indianapolis';
function getLocalDate(offsetDays = 0) {
	const date = new Date();
	date.setDate(date.getDate() + offsetDays);
	const localDate = date.toLocaleString('en-US', { timeZone: TIME_ZONE });
	return new Date(localDate).toISOString().split('T')[0];
}
exports.getLocalDate = getLocalDate;