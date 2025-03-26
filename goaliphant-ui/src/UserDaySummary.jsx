import Goal from './Goal'
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa';

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
		<hr />
		<li className="rewards">
			{user.Rewards.map((r, j) => (
				<div key={j} className="reward">
					<div className="reward-content">
						<h4><span>{r.Title}</span><span>🎟️{r.Cost == 0 ? '?' : r.Cost}</span></h4>
						<p>{r.Description}</p>
					</div>
					<div className="actions">
						{/* Add icons or buttons for actions */}
						<button className="icon-button secondary" onClick={() => console.log('Edit reward', r)}>
							<FaPencilAlt />
						</button>
						<button className="icon-button danger" onClick={() => console.log('Delete reward', r)}>
							<FaTrashAlt />
						</button>
					</div>
				</div>
			))}
		</li>
	</div>
}

export default UserDaySummary;