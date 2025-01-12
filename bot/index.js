
const { sendMessage } = require('./bot.js');
const { start } = require('./handlers/startHandler.js');
const { deleteGoals } = require('./handlers/deleteGoalsHandler.js');
const { addGoals, addHoney } = require('./handlers/addGoalsHandler.js');
const { listGoals } = require('./handlers/listHandler.js');
const { handleChatState } = require('./handlers/chatStateHandler.js');
const { completeGoals } = require('./handlers/completeGoalsHandler.js');
const { uncompleteGoals } = require('./handlers/uncompleteGoalsHandler.js');
const { getTickets } = require('./handlers/walletHandler.js');
const { listRewards } = require('./handlers/rewardsHandler.js');
const { handleCreateRewardStep } = require('./handlers/createRewardHandler.js');
const { redeemReward } = require('./handlers/redeemRewardHandler.js');

exports.handler = async (event) => {
	const body = JSON.parse(event.body);
	console.log("body:", body);

	if (body.message) {
		const chatId = body.message.chat.id;
		const text = body.message.text;

		console.log("message from", chatId, body.message.from.first_name, ":", text);

		if (!text) {
			console.log("no text");
			return { statusCode: 200, body: 'OK' };
		}

		const chatStateResponseInvoked = await handleChatState(text, chatId);
		console.log("chatStateResponse:", chatStateResponseInvoked);
		if (chatStateResponseInvoked) { return { statusCode: 200, body: 'OK' }; }

		const command = text.split(' ')[0];

		switch (command) {
			case '/start':
			case 'start':
				await start(chatId);
				break;
			case '/add':
			case 'add':
				await addGoals(text, chatId);
				break;
			case '/list':
			case 'list':
				await listGoals(chatId);
				break;
			case '/delete':
			case 'delete':
				await deleteGoals(text, chatId);
				break;
			case '/complete':
			case 'complete':
				await completeGoals(text, chatId);
				break;
			case '/uncomplete':
			case 'uncomplete':
				await uncompleteGoals(text, chatId);
				break;
			case '/wallet':
			case 'wallet':
				await getTickets(chatId);
				break;
			case '/rewards':
			case 'rewards':
				await listRewards(chatId);
				break;
			case '/createreward':
			case 'createreward':
				await handleCreateRewardStep(chatId, 0);
				break;
			case '/redeem':
			case 'redeem':
				await redeemReward(chatId, text);
				break;
			case '/honey':
			case 'honey':
				await addHoney(text, chatId);
				break;
			default:
				await sendMessage(chatId, 'Unrecognized command. Use /add, /list, /delete, /complete, or /uncomplete.');
		}
	}

	return { statusCode: 200, body: 'OK' };
};
