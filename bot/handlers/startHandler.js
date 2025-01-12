const { saveUser } = require('../common/userRepository.js');
const { sendMessage } = require('../bot.js');


async function start(chatId) {
	await saveUser(chatId);
	await sendMessage(chatId, 'Welcome to Goaliphant! Use /add to set goals, /list to view them, /delete {index} to remove, /complete {index} to mark complete, and /uncomplete {index} to unmark complete.');
}
exports.start = start;