function isScheduledDateInTheFuture(date) {
	// date is in the format mm/dd
	const [month, day] = date.split('/').map(x => parseInt(x));
	const today = new Date();
	const scheduledDate = new Date(today.getFullYear(), month - 1, day);
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