
const { bot } = require('./bot.js');
const { start } = require('./handlers/startHandler.js');
const { deleteGoals } = require('./handlers/deleteGoalsHandler.js');
const { addGoals } = require('./handlers/addGoalsHandler.js');
const { listGoals } = require('./handlers/listHandler.js');
const { handleChatState } = require('./handlers/chatStateHandler.js');
const { completeGoals } = require('./handlers/completeGoalsHandler.js');
const { uncompleteGoals } = require('./handlers/uncompleteGoalsHandler.js');
const { getTickets } = require('./handlers/walletHandler.js');
const { listRewards } = require('./handlers/rewardsHandler.js');
const { createReward } = require('./handlers/createRewardHandler.js');

exports.handler = async (event) => {
	const body = JSON.parse(event.body);

	if (body.message) {
		const chatId = body.message.chat.id;
		const text = body.message.text;

		console.log("message from", chatId, body.message.from.first_name, ":", text);

		const chatStateResponse = await handleChatState(text, chatId);
		if (chatStateResponse) { return chatStateResponse; }

		if (text === '/start') {
			await start(chatId);
		} else if (text.startsWith('/add')) {
			await addGoals(text, chatId);
		} else if (text === '/list') {
			await listGoals(chatId);
		} else if (text.startsWith('/delete')) {
			await deleteGoals(text, chatId);
		} else if (text.startsWith('/complete')) {
			await completeGoals(text, chatId);
		} else if (text.startsWith('/uncomplete')) {
			await uncompleteGoals(text, chatId);
		} else if (text === '/wallet') {
			await getTickets(chatId);
		} else if (text === '/rewards') {
			await listRewards(chatId);
		} else if (text === '/add-reward') {
			await createReward(chatId);
		}
		else {
			await bot.sendMessage(chatId, 'Unrecognized command. Use /add, /list, /delete, /complete, or /uncomplete.');
		}
	}

	return { statusCode: 200, body: 'OK' };
};
