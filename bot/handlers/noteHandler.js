const { sendMessage } = require('../bot.js');
const { getGoals, updateGoals } = require('../../common/goalRepository.js');

/**
 * Adds a note to a specific goal
 * @param {string} goalIndex - The index of the goal to add a note to
 * @param {string} noteText - The text of the note to add
 * @param {number} chatId - The chat ID of the user
 */
async function addNote(goalIndex, noteText, chatId) {
    try {
        // Parse index to number
        const index = parseInt(goalIndex);
        
        if (isNaN(index) || index <= 0) {
            await sendMessage(chatId, '⚠️ Please provide a valid goal number.');
            return;
        }

        if (!noteText || noteText.trim() === '') {
            await sendMessage(chatId, '⚠️ Please provide some text for your note.');
            return;
        }

        // Get goals for this user
        const goals = await getGoals(chatId);
        
        if (!goals || goals.length === 0) {
            await sendMessage(chatId, '⚠️ You have no goals. Add some with /add');
            return;
        }

        if (index > goals.length) {
            await sendMessage(chatId, `⚠️ You only have ${goals.length} goals. Please provide a valid number.`);
            return;
        }

        const goalToUpdate = goals[index - 1];
        
        // Initialize notes array if it doesn't exist
        if (!goalToUpdate.notes) {
            goalToUpdate.notes = [];
        }
        
        // Add the new note with a timestamp
        goalToUpdate.notes.push({
            text: noteText,
            timestamp: new Date().toISOString()
        });
        
        // Update the entire goals array
        await updateGoals(chatId, goals);
        
        await sendMessage(chatId, `✅ Note added to goal #${index}: "${goalToUpdate.text}"`);
    } catch (error) {
        console.error('Error adding note:', error);
        await sendMessage(chatId, '❌ Error adding note. Please try again.');
    }
}

/**
 * Shows details for a specific goal, including notes
 * @param {string} goalIndex - The index of the goal to show details for
 * @param {number} chatId - The chat ID of the user
 */
async function showGoalDetails(goalIndex, chatId) {
    try {
        // Parse index to number
        const index = parseInt(goalIndex);
        
        if (isNaN(index) || index <= 0) {
            await sendMessage(chatId, '⚠️ Please provide a valid goal number.');
            return;
        }

        // Get goals for this user
        const goals = await getGoals(chatId);
        
        if (!goals || goals.length === 0) {
            await sendMessage(chatId, '⚠️ You have no goals. Add some with /add');
            return;
        }

        if (index > goals.length) {
            await sendMessage(chatId, `⚠️ You only have ${goals.length} goals. Please provide a valid number.`);
            return;
        }

        const goal = goals[index - 1];
        
        // Format creation date if it exists
        let createdAt = 'Unknown';
        if (goal.createdAt) {
            createdAt = new Date(goal.createdAt).toLocaleString();
        }
        
        let messageText = `📝 *Goal #${index} Details:*\n\n`;
        messageText += `*Text:* ${goal.text}\n`;
        messageText += `*Status:* ${goal.completed ? '✅ Completed' : '⬜ Not completed'}\n`;
        
        // Add created date if it exists
        if (goal.createdAt) {
            messageText += `*Created:* ${createdAt}\n`;
        }
        
        // Add scheduled date if exists
        if (goal.scheduledDate) {
            const scheduledDate = new Date(goal.scheduledDate).toLocaleDateString();
            messageText += `*Scheduled for:* ${scheduledDate}\n`;
        }
        
        // Add notes section if there are notes
        if (goal.notes && goal.notes.length > 0) {
            messageText += `\n*Notes (${goal.notes.length}):*\n`;
            goal.notes.forEach((note, i) => {
                const noteDate = new Date(note.timestamp).toLocaleString();
                messageText += `\n${i+1}. ${note.text}\n   _Added: ${noteDate}_\n`;
            });
        } else {
            messageText += '\n_No notes added yet. Add notes with_ /note';
        }
        
        await sendMessage(chatId, messageText, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error showing goal details:', error);
        await sendMessage(chatId, '❌ Error retrieving goal details. Please try again.');
    }
}

module.exports = {
    addNote,
    showGoalDetails
}; 