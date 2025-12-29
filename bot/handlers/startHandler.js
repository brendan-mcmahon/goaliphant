const { saveUser } = require('../common/userRepository.js');
const { sendMessage } = require('../bot.js');


async function start(chatId) {
	await saveUser(chatId);

	const welcomeMessage = `*Welcome to Goaliphant!* 🎯🐘

Your AI-powered daily goal tracker and reward system.

*🎯 Core Features:*
• Track daily goals with /add and /list
• Earn tickets by completing goals
• Schedule goals for future dates
• Set recurring goals that auto-create
• Chat naturally with AI to manage goals

*🎁 Partner & Rewards:*
• Link with a partner to share rewards
• Create custom rewards with /createreward
• Redeem rewards with earned tickets
• Send honey-do tasks to your partner
• Get bonus tickets for completing 3+ goals/day

*📊 Dashboard:*
View your progress at the web dashboard with /dashboard

*💡 Quick Start:*
1. Add your first goal: /add [your goal]
2. View your list: /list
3. Complete a goal: /complete [number]
4. Check your tickets: /wallet

Type /help to see all commands, or just chat with me naturally!`;

	await sendMessage(chatId, welcomeMessage);
}
exports.start = start;