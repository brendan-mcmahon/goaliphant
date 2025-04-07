const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { sendMessage, sendError } = require('../bot.js');

/**
 * Makes a goal recurring with the specified cron expression
 * @param {string} goalNumber - The number of the goal to make recurring
 * @param {string} cronExpression - The cron expression for recurrence
 * @param {number} chatId - The chat ID of the user
 */
async function makeGoalRecurring(goalNumber, cronExpression, chatId) {
    try {
        // Validate input
        const index = parseInt(goalNumber) - 1;
        
        if (isNaN(index) || index < 0) {
            await sendMessage(chatId, '⚠️ Please provide a valid goal number.');
            return;
        }

        if (!isValidCronExpression(cronExpression)) {
            await sendMessage(chatId, '⚠️ Invalid cron expression. Please use a valid format.');
            return;
        }

        // Get the goals
        const goals = await getGoals(chatId);
        
        if (!goals || goals.length === 0) {
            await sendMessage(chatId, '⚠️ You have no goals. Add some with /add');
            return;
        }

        if (index >= goals.length) {
            await sendMessage(chatId, `⚠️ You only have ${goals.length} goals. Please provide a valid number.`);
            return;
        }

        // Update the goal with recurring information
        const goalToUpdate = goals[index];
        goalToUpdate.isRecurring = true;
        goalToUpdate.recurringSchedule = cronExpression;
        
        // Save the updated goals
        await updateGoals(chatId, goals);
        
        await sendMessage(chatId, `✅ Goal "${goalToUpdate.text}" is now recurring with schedule: ${cronExpression}`);
    } catch (error) {
        console.error('Error making goal recurring:', error);
        await sendError(chatId, error);
    }
}

/**
 * Validates a cron expression (basic validation)
 * @param {string} cron - The cron expression to validate
 * @returns {boolean} - Whether the cron expression is valid
 */
function isValidCronExpression(cron) {
    // Basic validation - checks if there are at least 5 parts in the cron expression
    const parts = cron.split(' ');
    return parts.length >= 5;
}

module.exports = {
    makeGoalRecurring
}; 