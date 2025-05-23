const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { addTicket, getUser } = require('../common/userRepository.js');
const { sendMessage, sendError } = require('../bot.js');
const { listGoals } = require('./listHandler.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');

async function completeGoals(text, chatId, ticketRecipientId) {
	console.log("text:", text);
	const indexText = text.replace('/complete', '').trim();
	console.log('indexText:', indexText);
	if (!indexText) {
		await sendMessage(chatId, 'You must send the goal numbers to mark as complete (separated by spaces).');
	} else {
		const indexes = indexText.split(' ').map(n => parseInt(n.trim()) - 1);
		await markGoalsAsComplete(indexes, chatId, ticketRecipientId);
	}
}
exports.completeGoals = completeGoals;

async function markGoalsAsComplete(indexes, chatId, ticketRecipientId) {
	try {
		const user = await getUser(chatId);
		const partnerId = user.PartnerId;
		const goals = (await getGoals(chatId))
			.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduledDate));
		let updated = false;
		indexes.forEach(index => {
			if (index >= 0 && index < goals.length && !goals[index].completed) {
				goals[index].completed = true;
				if (goals[index][0] === "🐝") {
					sendMessage(partnerId, `Your partner has completed a 🐝 task: ${goals[index].text}`);
				}
				updated = true;
			}
		});
		if (updated) {
			await updateGoals(chatId, goals);
			await addTicket(ticketRecipientId);
			await sendMessage(chatId, 'Goals marked as completed.');
			await listGoals(chatId);
		} else {
			await sendMessage(chatId, 'No valid goals to mark as completed.');
		}
	} catch (error) {
		console.error('Error marking goals as completed:', error);
		await sendError(chatId, error);
	}
}
