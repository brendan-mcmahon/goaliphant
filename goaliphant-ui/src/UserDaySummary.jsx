import Goal from './Goal'

function UserDaySummary({ user, date, isToday, setSelectedGoal, setGoalToDelete }) {
	console.log("length", user.Days.length);

	if (user.Days.length === 0) {
		return <div className="user-day-summary">
			<h2>{user.Name}</h2>
			<h3>No goals set</h3>
		</div>
	}

	const todaysGoals = user.Days.filter(d => d.date === date.toISOString().split('T')[0]);

	return <div className="user-day-summary">
		<h3>Goals</h3>
		<hr />
		<li className="goals">
			{todaysGoals.length === 0
				? <p>No goals set</p>
				: todaysGoals[0].goals.map((goal, j) => <Goal
					key={j}
					disabled={!isToday}
					goal={goal}
					chatId={user.ChatId}
					index={j}
					onEdit={() => setSelectedGoal({ chatId: user.ChatId, index: j, goal })}
					onDelete={() => setGoalToDelete({ chatId: user.ChatId, index: j, goal })}
				/>)}
		</li>
		<h3>Rewards</h3>
		<li className="rewards">
			{user.Rewards.map((r, j) => (
				<div key={j} className="reward">
					<h4>{r.Title}</h4>
					<p>{r.Description}</p>
				</div>
			))}
		</li>
	</div>
}

export default UserDaySummary;