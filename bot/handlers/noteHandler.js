const { sendMessage } = require('../bot.js');
const { getGoals, updateGoal } = require('../common/goalRepository.js');

async function addNote(goalIndex, noteText, chatId) {
	try {
		const index = parseInt(goalIndex) - 1;

		if (isNaN(index) || index < 0) {
			await sendMessage(chatId, '⚠️ Please provide a valid goal number.');
			return;
		}

		if (!noteText || noteText.trim() === '') {
			await sendMessage(chatId, '⚠️ Please provide some text for your note.');
			return;
		}

		const goals = await getGoals(chatId);

		if (!goals || goals.length === 0) {
			await sendMessage(chatId, '⚠️ You have no goals. Add some with /add');
			return;
		}

		if (index >= goals.length) {
			await sendMessage(chatId, `⚠️ You only have ${goals.length} goals. Please provide a valid number.`);
			return;
		}

		const goal = goals[index];
		const notes = [...(goal.notes || []), {
			text: noteText,
			createdAt: new Date().toISOString()
		}];

		await updateGoal(chatId, goal.goalId, { notes });
		await sendMessage(chatId, `✅ Note added to goal #${index + 1}: "${goal.text}"`);
	} catch (error) {
		console.error('Error adding note:', error);
		await sendMessage(chatId, '❌ Error adding note. Please try again.');
	}
}

async function showGoalDetails(goalIndex, chatId) {
	try {
		const index = parseInt(goalIndex) - 1;

		if (isNaN(index) || index < 0) {
			await sendMessage(chatId, '⚠️ Please provide a valid goal number.');
			return;
		}

		const goals = await getGoals(chatId);

		if (!goals || goals.length === 0) {
			await sendMessage(chatId, '⚠️ You have no goals. Add some with /add');
			return;
		}

		if (index >= goals.length) {
			await sendMessage(chatId, `⚠️ You only have ${goals.length} goals. Please provide a valid number.`);
			return;
		}

		const goal = goals[index];

		let messageText = `📝 *Goal #${index + 1} Details:*\n\n`;
		messageText += `*${goal.text}*\n`;
		messageText += `*Status:* ${goal.completed ? '✅ Completed' : '⬜ Not completed'}\n`;

		if (goal.createdAt) {
			messageText += `*Created:* ${new Date(goal.createdAt).toLocaleString()}\n`;
		}

		if (goal.scheduledDate) {
			messageText += `*Scheduled for:* ${new Date(goal.scheduledDate).toLocaleDateString()}\n`;
		}

		if (goal.dueDate) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const due = new Date(goal.dueDate);
			due.setHours(0, 0, 0, 0);
			const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
			const dueDateStr = due.toLocaleDateString();

			if (diffDays < 0) {
				messageText += `*Due Date:* ${dueDateStr} ⚠️ (${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue)\n`;
			} else if (diffDays === 0) {
				messageText += `*Due Date:* ${dueDateStr} 📅 (Due today!)\n`;
			} else if (diffDays === 1) {
				messageText += `*Due Date:* ${dueDateStr} 📅 (Due tomorrow)\n`;
			} else {
				messageText += `*Due Date:* ${dueDateStr} 📅 (${diffDays} days remaining)\n`;
			}
		}

		if (goal.isRecurring) {
			messageText += `*Recurring:* Yes\n`;
			if (goal.recurrencePattern) {
				messageText += `*Schedule:* ${goal.recurrencePattern}\n`;
			}
		}

		if (goal.notes && goal.notes.length > 0) {
			messageText += `\n*Notes:*\n`;
			goal.notes.forEach((note, i) => {
				const noteDate = new Date(note.createdAt || note.timestamp).toLocaleString();
				messageText += `\n${i + 1}. ${note.text}\n   _Added: ${noteDate}_\n`;
			});
		}

		await sendMessage(chatId, messageText, { parse_mode: 'Markdown' });
	} catch (error) {
		console.error('Error showing goal details:', error);
		await sendMessage(chatId, '❌ Error retrieving goal details. Please try again.');
	}
}

module.exports = { addNote, showGoalDetails };
