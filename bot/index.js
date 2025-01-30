
const { sendMessage } = require('./bot.js');
const { start } = require('./handlers/startHandler.js');
const { deleteGoals } = require('./handlers/deleteGoalsHandler.js');
const { addGoals, addHoney } = require('./handlers/addGoalsHandler.js');
const { listGoals, listPartner } = require('./handlers/listHandler.js');
const { handleChatState } = require('./handlers/chatStateHandler.js');
const { completeGoals } = require('./handlers/completeGoalsHandler.js');
const { uncompleteGoals } = require('./handlers/uncompleteGoalsHandler.js');
const { getTickets } = require('./handlers/walletHandler.js');
const { listRewards } = require('./handlers/rewardsHandler.js');
const { handleCreateRewardStep } = require('./handlers/createRewardHandler.js');
const { redeemReward } = require('./handlers/redeemRewardHandler.js');
const { scheduleGoal } = require('./handlers/scheduleHandler.js');

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

		const x = text.split(' ');
		let command = x[0];
		if (command[0] === '/') {
			command = command.substring(1);
		}
		const args = x[1];

		switch (command) {
			case 'start':
				await start(chatId);
				break;
			case 'add':
				const goalsToAdd = text.replace('add', '').trim();
				await addGoals(goalsToAdd, chatId);
				break;
			case 'list':
				await listGoals(chatId);
				break;
			case 'delete':
				const goalsToDelete = text.replace('delete', '').trim();
				await deleteGoals(goalsToDelete, chatId);
				break;
			case 'complete':
				const goalToComplete = text.replace('complete', '').trim();
				await completeGoals(goalToComplete, chatId);
				break;
			case 'uncomplete':
				const goalToUncomplete = text.replace('uncomplete', '').trim();
				await uncompleteGoals(goalToUncomplete, chatId);
				break;
			case 'wallet':
				await getTickets(chatId);
				break;
			case 'rewards':
				await listRewards(chatId);
				break;
			case 'createreward':
				await handleCreateRewardStep(chatId, 0);
				break;
			case 'redeem':
				await redeemReward(chatId, args);
				break;
			case 'honey':
				const honeyToAdd = text.replace('honey', '').trim();
				await addHoney(honeyToAdd, chatId);
				break;
			case 'partner':
				console.log("getting partner list", chatId)
				await listPartner(chatId);
				break;
			case 'schedule':
				const goalToSchedule = text.replace('schedule', '').trim();
				console.log("scheduling goal", goalToSchedule);
				console.log(!!scheduleGoal);
				await scheduleGoal(chatId, args);
				break;
			default:
				await sendMessage(chatId, 'Unrecognized command. Use /add, /list, /delete, /complete, or /uncomplete.');
		}
	}

	return { statusCode: 200, body: 'OK' };
};
