const { getGoals } = require('../common/goalRepository.js');
const { getHoney } = require('../common/honeyRepository.js');
const { getUser } = require('../common/userRepository.js');
const { sendMessage, sendError } = require('../bot.js');

async function listGoals(chatId) {
	try {
		console.log("listing...");
		const goals = await getGoals(chatId);
		const goalsList = goals.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		await sendMessage(chatId, goalsList || 'No goals set for today.');
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
		const user = await getUser(chatId);
		const partnerId = user.partnerId;
		const goals = await getGoals(partnerId);
		const goalsList = goals.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		await sendMessage(chatId, goalsList || 'No goals set for partner today.');
	} catch (error) {
		console.error('Error listing partner goals:', error);
		await sendError(chatId, error);
	}
}
exports.listPartner = listPartner;