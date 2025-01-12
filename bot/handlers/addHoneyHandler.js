const { getHoney, updateHoney } = require('../common/honeyRepository.js');
const { setChatState, getUser } = require('../common/userRepository.js');
const { listHoney } = require('./listHandler.js');
const { sendMessage, sendError } = require('../bot.js');

async function addHoney(text, chatId) {
	const user = await getUser(chatId);
	const partner = await getUser(user.PartnerId);
	const goalsText = text.replace('/addhoney', '').trim();
	if (!goalsText) {
		await setChatState(chatId, 'addGoals');
		await sendMessage(chatId, 'Send your honey-do items as comma-separated text.');
	} else {
		const newGoals = goalsText.split(',').map((goal) => goal.trim());
		await sendMessage(partner.ChatId, `Your partner added the following honey-do items: ${newGoals.join(', ')}`);
		await saveHoneyAndList(newGoals, partner.ChatId);
	}
}
exports.addHoney = addHoney;

async function saveHoneyAndList(newGoals, chatId, isPartner = true) {
	try {
		chatId = isPartner ? chatId : (await getUser(chatId)).PartnerId;
		const existingGoals = await getHoney(chatId);
		const updatedGoals = [...existingGoals, ...newGoals.map(goal => ({ text: goal, completed: false }))];
		await updateHoney(chatId, updatedGoals);
		await listHoney(chatId);
	} catch (error) {
		console.error('Error adding goals:', error);
		await sendError(chatId, error);
	}
}
exports.saveHoneyAndList = saveHoneyAndList;