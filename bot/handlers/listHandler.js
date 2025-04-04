const { getGoals } = require('../common/goalRepository.js');
const { getHoney } = require('../common/honeyRepository.js');
const { getUser } = require('../common/userRepository.js');
const { sendMessage, sendError } = require('../bot.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');

// `all` should list all completed, incompleted, and scheduled things
// `today` should list everything but scheduled items (scheduled items start with the calendar emoji) (also, if there are no args, it should default to today)
//  `todo` should only list things that are not completed
//  `done` should only list things that are completed
//  `scheduled` should only show things that are scheduled in the future
async function listGoals(chatId, args) {
	try {
		console.log("listing...", args);
		const goals = await getGoals(chatId);
		console.log("goals:", goals);
		
		const filter = args?.[0]?.toLowerCase() || 'today';
		
		let filteredGoals = goals;
		let messagePrefix = '';
		
		switch(filter) {
			case 'all':
				messagePrefix = 'All goals:';
				break;
			
			case 'todo':
				filteredGoals = goals.filter(g => !g.completed);
				messagePrefix = 'To-do goals:';
				break;
			
			case 'done':
				filteredGoals = goals.filter(g => g.completed);
				messagePrefix = 'Completed goals:';
				break;
			
			case 'scheduled':
				filteredGoals = goals.filter(g => g.scheduled && isScheduledDateInTheFuture(g.scheduled));
				messagePrefix = 'Scheduled goals:';
				break;
				
			case 'today':
			default:
				filteredGoals = goals.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduled));
				messagePrefix = 'Today\'s goals:';
		}
		
		const goalsList = filteredGoals.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		console.log("goalsList:", goalsList);
		
		await sendMessage(chatId, `${messagePrefix}\n${goalsList || 'No goals found.'}`);
	} catch (error) {
		console.error('Error listing goals:', error);
		await sendError(chatId, error);
	}
}
exports.listGoals = listGoals;

async function listHoney(chatId) {
	try {
		console.log("listing...");
		const goals = await getHoney(chatId);
		const goalsList = goals.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		await sendMessage(chatId, `<pre>${honeyDoBanner}</pre>`, { parse_mode: 'HTML' });
		await sendMessage(chatId, goalsList || 'No honey-do list for today.');
	} catch (error) {
		console.error('Error listing honey-do:', error);
		await sendError(chatId, error);
	}
}
exports.listHoney = listHoney;

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
