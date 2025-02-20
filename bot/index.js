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
		let text = body.message.text;

		console.log("message from", chatId, body.message.from.first_name, ":", text);

		if (!text) {
			console.log("no text");
			return { statusCode: 200, body: 'OK' };
		}

		const chatStateResponseInvoked = await handleChatState(text, chatId);
		console.log("chatStateResponse:", chatStateResponseInvoked);
		if (chatStateResponseInvoked) { return { statusCode: 200, body: 'OK' }; }

		if (text[0] === '/') { text = text.substring(1).trim(); }

		const command = text.split(' ')[0].toLowerCase();
		const args = text.substring(command.length).trim();

		switch (command) {
			// DEFINITION: /start
			case 'start':
				await start(chatId);
				break;
			// DEFINITION: /add {goal: text}
			case 'add':
				await addGoals(args, chatId);
				break;
			// DEFINITION: /list
			case 'list':
				await listGoals(chatId);
				break;
			// DEFINITION: /delete {index: number}
			case 'delete':
				const goalsToDelete = text.replace('delete', '').trim();
				await deleteGoals(goalsToDelete, chatId);
				break;
			// DEFINITION: /complete {index: number}
			case 'complete':
				const goalToComplete = text.replace('complete', '').trim();
				await completeGoals(goalToComplete, chatId);
				break;
			// DEFINITION: /uncomplete {index: number}
			case 'uncomplete':
				const goalToUncomplete = text.replace('uncomplete', '').trim();
				await uncompleteGoals(goalToUncomplete, chatId);
				break;
			// DEFINITION: /wallet
			case 'wallet':
				await getTickets(chatId);
				break;
			// DEFINITION: /rewards
			case 'rewards':
				await listRewards(chatId);
				break;
			// DEFINITION: /createreward
			case 'createreward':
				await handleCreateRewardStep(chatId, 0);
				break;
			// DEFINITION: /redeem {index: number}
			case 'redeem':
				await redeemReward(chatId, args);
				break;
			// DEFINITION: /honey {honey: text}
			case 'honey':
				const honeyToAdd = text.replace('honey', '').trim();
				await addHoney(honeyToAdd, chatId);
				break;
			// DEFINITION: /partner
			case 'partner':
				console.log("getting partner list", chatId)
				await listPartner(chatId);
				break;
			// DEFINITION: /schedule {index: number} {date: text}
			case 'schedule':
				const goalToSchedule = text.replace('schedule', '').trim();
				console.log("scheduling goal", goalToSchedule);
				console.log(!!scheduleGoal);
				await scheduleGoal(chatId, args);
				break;
			case 'requestreward':
				await sendMessage(chatId, 'Requesting reward...');
				break;
			case 'help':
				await sendMessage(chatId, 'Commands: `add`, `list`, `delete`, `complete`, `uncomplete`, `wallet`, `rewards`, `createreward`, `redeem`, `honey`, `partner`, `schedule`');
				break
			default:
				await sendMessage(chatId, 'Unrecognized command. Use /add, /list, /delete, /complete, or /uncomplete.');
		}
	}

	return { statusCode: 200, body: 'OK' };
};
