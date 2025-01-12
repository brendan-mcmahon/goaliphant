const { sendMessage } = require('./bot.js');
const { getTicketCount } = require('../common/repository.js');

async function getTickets(chatId) {
	const tickets = await getTicketCount(chatId);
	await sendMessage(chatId, `You have ${tickets} ticket${tickets === 1 ? '' : 's'} in your wallet.`);
}
exports.getTickets = getTickets;