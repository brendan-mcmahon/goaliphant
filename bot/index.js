// This is the main entry point for the bot lambda function.
// It handles incoming messages from the Telegram API and passes them to the appropriate handler.
const { sendMessage, sendThinkingMessage, getUserProfilePhoto } = require('./bot.js');
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
const { handleRequestRewardStep } = require('./handlers/requestRewardHandler.js');
const { editGoal } = require('./handlers/editGoalHandler.js');
const { swapGoals } = require('./handlers/swapGoalsHandler.js');
const { getHelp } = require('./handlers/helpHandler.js');
const { addNote, showGoalDetails } = require('./handlers/noteHandler.js');
const { makeGoalRecurring } = require('./handlers/recurringGoalsHandler.js');
const { handleAIMessage, clearChat } = require('./handlers/aiHandler');
const { moveGoals } = require('./handlers/moveHandler.js');
const userRepo = require('./common/userRepository.js');
const { config } = require('./common/configs.js');
exports.handler = async (event) => {
	const body = JSON.parse(event.body);
	console.log("body:", body);

	if (body.message) {
		const chatId = body.message.chat.id;
		await sendThinkingMessage(chatId);

		let text = body.message.text;
		let ticketRecipientId = chatId;

		console.log("message from", chatId, body.message.from.first_name, ":", text);

		if (!text) {
			console.log("no text");
			return { statusCode: 200, body: 'OK' };
		}

		const user = await userRepo.getUser(chatId);
		if (user) {
			const userMsg = {
				role: "user",
				content: text
			};

			const chatHistory = user.chatHistory || [];

			chatHistory.push(userMsg);

			if (chatHistory.length > config.MAX_HISTORY_LENGTH) {
				chatHistory.splice(0, chatHistory.length - config.MAX_HISTORY_LENGTH);
			}
			await userRepo.updateUserField(chatId, 'chatHistory', chatHistory);
		}

		if (body.message && body.message.chat && body.message.chat.type === 'group') {
			console.log("group chat", body.message.chat.id);
			ticketRecipientId = body.message.from.id;
		}

		const chatStateResponseInvoked = await handleChatState(text, chatId);
		console.log("chatStateResponse:", chatStateResponseInvoked);
		if (chatStateResponseInvoked) { return { statusCode: 200, body: 'OK' }; }

		if (text[0] === '/') { text = text.substring(1).trim(); }

		const command = text.split(' ')[0].toLowerCase();
		const args = text.substring(command.length).trim();

		switch (command) {
			// DEFINITION: /add {goal: text}
			case 'add':
				await addGoals(args, chatId);
				break;
			// DEFINITION: /list
			case 'list':
				await listGoals(chatId, args);
				break;
			// DEFINITION: /delete {index: number}
			case 'delete':
				const goalsToDelete = text.replace('delete', '').trim();
				await deleteGoals(goalsToDelete, chatId);
				break;
			// DEFINITION: /edit {index: number} {text: text}
			case 'edit':
				const goalToEditIndex = args.split(' ')[0];
				const newText = args.substring(goalToEditIndex.length).trim();
				console.log("editing goal", goalToEditIndex, newText);
				await editGoal(goalToEditIndex, newText, chatId);
				break;
			// DEFINITION: /swap {index1: number} {index2: number}
			case 'swap':
				const indices = args.split(' ');
				await swapGoals(indices[0], indices[1], chatId);
				break;
			case 'move':
				const goalsToMove = args.split(' ');
				await moveGoals(goalsToMove[0], goalsToMove[1], chatId);
				break;
			// DEFINITION: /complete {index: number}
			case 'complete':
				const goalToComplete = text.replace('complete', '').trim();
				await completeGoals(goalToComplete, chatId, ticketRecipientId);
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
				await addHoney(chatId, honeyToAdd);
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
			// DEFINITION: /requestreward
			case 'requestreward':
				await handleRequestRewardStep(chatId, 0);
				break;
			// DEFINITION: /note {index: number} {note: text}
			case 'note':
				const noteIndex = args.split(' ')[0];
				const noteText = args.substring(noteIndex.length).trim();
				await addNote(noteIndex, noteText, chatId);
				break;
			// DEFINITION: /details {index: number}
			case 'detail':
			case 'details':
				await showGoalDetails(args.trim(), chatId);
				break;
			case 'dashboard':
				await sendMessage(chatId, '*📊 Dashboard*\nAccess your goals dashboard at: [Goaliphant Dashboard](https://goaliphant.netlify.app/)');
				break;
			case 'help':
				await getHelp(chatId, args);
				break;
			case 'recurring':
				const goalNumber = args.split(' ')[0];
				const cronExpression = args.substring(goalNumber.length).trim();
				await makeGoalRecurring(goalNumber, cronExpression, chatId);
				break;
			case 'clearchat':
				await clearChat(chatId);
				break;
			default:
				// If it's not a recognized command, treat it as a message for the AI
				await handleAIMessage(chatId, text);
		}
	}

	return { statusCode: 200, body: 'OK' };
};
