const { OpenAI } = require('openai');
const { sendMessage } = require('../bot.js');
const { tools, availableFunctions } = require('./agents/tools.js');
const userRepo = require('../common/userRepository.js');

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `You are Goaliphant, a helpful assistant integrated with a goal tracking Telegram bot. 
You can help users manage their goals by:
- Listing their current goals
- Adding new goals to their list
- Marking goals as completed

Be friendly, supportive, and encouraging. Keep responses concise and conversational.

When users ask you to perform actions like adding or completing goals, use the appropriate function rather than just explaining how to do it.
Respond naturally as if you're having a conversation, but handle the user's requests efficiently.

Don't ask for confirmation if you believe the user's request is clear and unambiguous.

If you make changes to the user's goals, send an updated list of goals to the user.

If the user sends a message that isn't an explicit request, let them know and ask them to try again.

Feel free to ask follow-up questions.

You are only seeing (up to) the last 20 messages in the chat history.
`;

async function handleAIMessage(chatId, userMessage) {
	try {

		const chatHistory = (await userRepo.getUser(chatId)).chatHistory;

		const messages = [
			{
				role: "system",
				content: SYSTEM_PROMPT
			},
			...chatHistory,
			{
				role: "user",
				content: userMessage
			}
		];

		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: messages,
			tools: tools,
			tool_choice: "auto"
		});

		const responseMessage = response.choices[0].message;

		let sendSecondMessage = false;

		if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
			const secondMessages = [...messages, responseMessage];

			for (const toolCall of responseMessage.tool_calls) {
				const functionName = toolCall.function.name;
				const functionToCall = availableFunctions[functionName];

				if (functionToCall) {
					let functionArgs;
					try {
						functionArgs = JSON.parse(toolCall.function.arguments);
					} catch (error) {
						console.error('Error parsing function arguments:', error);
						continue;
					}

					const functionResponse = await functionToCall(chatId, functionArgs);
					sendSecondMessage = functionResponse.sendMessage;

					secondMessages.push({
						role: "tool",
						tool_call_id: toolCall.id,
						name: functionName,
						content: functionResponse
					});
				}
			}

			if (sendSecondMessage) {
				const secondResponse = await openai.chat.completions.create({
					model: "gpt-4o-mini",
					messages: secondMessages
				});

				const finalResponseMsg = secondResponse.choices[0].message;
				await sendMessage(chatId, finalResponseMsg.content);
			}
		} else {
			console.log("No tool calls");
			await sendMessage(chatId, responseMessage.content);
		}
	} catch (error) {
		console.error('Error in AI handler:', error);
		console.error(error.stack);
		await sendMessage(chatId, "Sorry, I encountered an error while processing your message. Please try again later.");
	}
}

module.exports = {
	handleAIMessage
}; 