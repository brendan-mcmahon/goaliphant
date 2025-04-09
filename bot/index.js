// This is the main entry point for the bot lambda function.
// It handles incoming messages from the Telegram API and passes them to the appropriate handler.
const { sendMessage, sendThinkingMessage, getUserProfilePhoto, addMessageToHistory } = require('./bot.js');
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
const { handleAIMessage } = require('./handlers/aiHandler');
const userRepo = require('./common/userRepository.js');

exports.handler = async (event) => {
	const body = JSON.parse(event.body);
	console.log("body:", body);

	if (body.message) {
		const chatId = body.message.chat.id;
		await sendThinkingMessage(chatId);

		console.log(await getUserProfilePhoto(chatId));
		console.log(await getUserProfilePhoto(body.message.from.id));

		let text = body.message.text;
		let ticketRecipientId = chatId;

		console.log("message from", chatId, body.message.from.first_name, ":", text);

		if (!text) {
			console.log("no text");
			return { statusCode: 200, body: 'OK' };
		}

		// Add user message to chat history
		try {
			const user = await userRepo.getUser(chatId);
			if (user) {
				const userMsg = {
					role: "user",
					content: text
				};
				
				// Get existing chat history or initialize
				const chatHistory = user.chatHistory || [];
				
				// Add system message if needed
				if (chatHistory.length === 0) {
					chatHistory.push({
						role: "system",
						content: "You are Goaliphant, a helpful goal tracking assistant."
					});
				}
				
				chatHistory.push(userMsg);
				
				// Trim if needed (keeping system message)
				const MAX_HISTORY_LENGTH = 10;
				if (chatHistory.length > MAX_HISTORY_LENGTH) {
					const systemMessage = chatHistory.find(msg => msg.role === "system");
					if (systemMessage) {
						const recentMessages = chatHistory.slice(-MAX_HISTORY_LENGTH + 1);
						chatHistory.splice(0, chatHistory.length, systemMessage, ...recentMessages);
					} else {
						chatHistory.splice(0, chatHistory.length - MAX_HISTORY_LENGTH);
					}
				}
				
				await userRepo.updateUserField(chatId, 'chatHistory', chatHistory);
			}
		} catch (error) {
			console.error("Error recording user message:", error);
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
			default:
				// If it's not a recognized command, treat it as a message for the AI
				await handleAIMessage(chatId, text);
		}
	}

	return { statusCode: 200, body: 'OK' };
};
