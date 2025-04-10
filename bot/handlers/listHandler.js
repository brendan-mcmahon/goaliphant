const { getGoals } = require('../common/goalRepository.js');
const { getUser } = require('../common/userRepository.js');
const { sendMessage, sendError } = require('../bot.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');
const { shouldShowRecurringGoalToday } = require('./cronUtils.js');

async function listGoals(chatId, args) {
	try {
		console.log("listing...", args);
		const goals = await getGoals(chatId);
		console.log("goals:", goals);

		const filter = args?.toLowerCase() || 'today';
		console.log("filter:", filter);

		let filteredGoals = goals;
		let messagePrefix = '';

		// Filter based on command arguments
		switch (filter) {
			case 'all':
				console.log("listing all goals");
				messagePrefix = 'All goals:';
				break;

			case 'todo':
				console.log("listing todo goals");
				filteredGoals = goals.filter(g => !g.completed);
				filteredGoals = filteredGoals.filter(g => 
					(!g.scheduled || !isScheduledDateInTheFuture(g.scheduled)) ||
					(g.isRecurring && shouldShowRecurringGoalToday(g))
				);
				messagePrefix = 'To-do goals:';
				break;

			case 'done':
				console.log("listing done goals");
				filteredGoals = goals.filter(g => g.completed);
				filteredGoals = filteredGoals.filter(g => 
					(!g.scheduled || !isScheduledDateInTheFuture(g.scheduled))
				);
				messagePrefix = 'Completed goals:';
				break;

			case 'scheduled':
				console.log("listing scheduled goals");
				filteredGoals = goals.filter(g => g.scheduled && isScheduledDateInTheFuture(g.scheduled));
				messagePrefix = 'Scheduled goals:';
				break;

			case 'today':
			default:
				console.log("listing today's goals");
				filteredGoals = goals.filter(g => 
					(!g.scheduled || !isScheduledDateInTheFuture(g.scheduled)) ||
					(g.isRecurring && shouldShowRecurringGoalToday(g))
				);
				messagePrefix = 'Today\'s goals:';
		}

		const goalsList = filteredGoals.map((g, i) => { 
			let goalText = g.completed ? '✅' : '⬜';
			
			// Add scheduled indicator if applicable
			if (g.scheduled) {
				goalText = `${goalText} 🗓️ ${g.scheduled}`;
			}
			
			// Add recurring indicator if applicable
			if (g.isRecurring) {
				goalText = `${goalText} 🔄`;
			}
			
			return `${i + 1}. ${goalText} ${g.text}`;
		}).join('\n');
		console.log("goalsList:", goalsList);

		await sendMessage(chatId, `${messagePrefix}\n${goalsList || 'No goals found.'}`);
	} catch (error) {
		console.error('Error listing goals:', error);
		await sendError(chatId, error);
	}
}
exports.listGoals = listGoals;

async function listPartner(chatId) {
	try {
		console.log("listing partner...");
		const user = await getUser(chatId);
		const partnerId = user.PartnerId;
		console.log("partnerId:", partnerId);
		const goals = await getGoals(partnerId);
		const goalsList = goals
			.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduled))
			.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		await sendMessage(chatId, goalsList || 'No goals set for partner today.');
	} catch (error) {
		console.error('Error listing partner goals:', error);
		await sendError(chatId, error);
	}
}
exports.listPartner = listPartner;
