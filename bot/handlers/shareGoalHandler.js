const { getGoals, shareGoal, addSharedGoal } = require('../common/goalRepository.js');
const { getUser } = require('../common/userRepository.js');
const { sendMessage, sendError } = require('../bot.js');
const { listGoals } = require('./listHandler.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');

async function shareExistingGoal(chatId, args) {
	const index = parseInt(args.trim()) - 1;
	if (isNaN(index)) {
		await sendMessage(chatId, 'Usage: /share <goal number>');
		return;
	}

	try {
		const user = await getUser(chatId);
		if (!user?.PartnerId) {
			await sendMessage(chatId, 'You need a partner set up to share goals.');
			return;
		}

		const goals = (await getGoals(chatId))
			.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduledDate));

		if (index < 0 || index >= goals.length) {
			await sendMessage(chatId, 'Invalid goal number.');
			return;
		}

		const goal = goals[index];
		if (goal.sharedGoalId) {
			await sendMessage(chatId, 'That goal is already shared with your partner.');
			return;
		}

		await shareGoal(chatId, goal.goalId, user.PartnerId);
		await sendMessage(user.PartnerId, `🤝 Your partner shared a goal with you: ${goal.text}`);
		await sendMessage(chatId, '🤝 Goal shared with your partner!');
		await listGoals(chatId);
	} catch (error) {
		console.error('Error sharing goal:', error);
		await sendError(chatId, error);
	}
}
exports.shareExistingGoal = shareExistingGoal;

async function addAndShareGoal(chatId, text) {
	if (!text?.trim()) {
		await sendMessage(chatId, 'Usage: /addshare <goal text>');
		return;
	}

	try {
		const user = await getUser(chatId);
		if (!user?.PartnerId) {
			await sendMessage(chatId, 'You need a partner set up to share goals.');
			return;
		}

		await addSharedGoal(chatId, user.PartnerId, text.trim());
		await sendMessage(user.PartnerId, `🤝 Your partner added a shared goal: ${text.trim()}`);
		await sendMessage(chatId, '🤝 Shared goal added to both lists!');
		await listGoals(chatId);
	} catch (error) {
		console.error('Error adding shared goal:', error);
		await sendError(chatId, error);
	}
}
exports.addAndShareGoal = addAndShareGoal;
