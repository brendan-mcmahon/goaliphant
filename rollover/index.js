const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const goalsTable = 'GoaliphantGoals';
const TIME_ZONE = 'America/Indiana/Indianapolis';

function getLocalDate(offsetDays = 0) {
	const date = new Date();
	date.setDate(date.getDate() + offsetDays);
	const localDate = date.toLocaleString('en-US', { timeZone: TIME_ZONE });
	return new Date(localDate).toISOString().split('T')[0];
}

async function getGoals(chatId, date) {
	const params = {
		TableName: goalsTable,
		Key: {
			chatId: chatId.toString(),
			date: date,
		},
	};

	try {
		const result = await dynamoDb.get(params).promise();
		return result.Item ? result.Item.goals : [];
	} catch (err) {
		console.error('Error fetching goals:', err);
		throw err;
	}
}

async function saveGoals(chatId, goals) {
	const date = getLocalDate();
	const formattedGoals = goals.map(goal => ({ text: goal.text, completed: false }));

	const params = {
		TableName: goalsTable,
		Item: {
			chatId: chatId.toString(),
			date: date,
			goals: formattedGoals,
		},
	};

	try {
		await dynamoDb.put(params).promise();
		console.log('Goals rolled over successfully');
	} catch (err) {
		console.error('Error saving goals:', err);
		throw err;
	}
}

async function rolloverGoals(chatId) {
	const yesterday = getLocalDate(-1);
	const today = getLocalDate();

	try {
		const previousGoals = await getGoals(chatId, yesterday);
		const todayGoals = await getGoals(chatId, today);

		const incompleteGoals = previousGoals.filter(goal => !goal.completed);
		const newGoals = [...incompleteGoals, ...todayGoals];

		await saveGoals(chatId, newGoals);
	} catch (error) {
		console.error('Error in rollover process:', error);
		throw error;
	}
}

exports.handler = async (event) => {
	console.log('Rollover triggered');
	const chatIds = event.chatIds || [];

	for (const chatId of chatIds) {
		await rolloverGoals(chatId);
	}

	return { statusCode: 200, body: 'Rollover completed' };
};
