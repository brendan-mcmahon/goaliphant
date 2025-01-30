import { useEffect, useState } from 'react'
import './App.scss'
import { fetchData } from './api'
import { FaAngleLeft, FaAngleRight } from 'react-icons/fa'
import Goal from './Goal'
import Modal from './Modal'
import EditModalGoal from './EditGoalModal'

const dateOptions = {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
};

const dateEquals = (date1, date2) => {
	return new Date(date1).toISOString().split('T')[0] === new Date(date2).toISOString().split('T')[0];
}

function App() {
	const [data, setData] = useState([]);
	const [todaysGoals, setTodaysGoals] = useState([]);
	const [date, setDate] = useState(new Date());
	console.log(date.toISOString().split('T')[0]);
	const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
	const [selectedGoal, setSelectedGoal] = useState(null);
	const [goalToDelete, setGoalToDelete] = useState(null);

	useEffect(() => {
		async function fetchDataAsync() {
			let _data = await fetchData();
			_data.goals = _data.goals.filter(d => d.chatId !== '-4711773993');
			setData(_data);
		}
		fetchDataAsync();
	}, []);

	useEffect(() => {
		setTodaysGoals(data.goals?.filter(d => d.date === date.toISOString().split('T')[0]));
	}, [data, date]);

	const handleDateChange = (offset) => {
		if (isToday && offset >= 1) {
			return;
		}
		const newDate = new Date(date);
		newDate.setDate(newDate.getDate() + offset);
		setDate(newDate);
	}

	if (!todaysGoals) {
		return <div>Loading...</div>
	}

	console.log('todaysGoals', todaysGoals);

	return (
		<>
			<header>
				{/* <h1>Goaliphant</h1> */}
				<div className="date-picker">
					<button className="icon-button" onClick={() => handleDateChange(-1)} > <FaAngleLeft /> </button>
					<h2>{isToday ? "Today" : date.toLocaleString('en-US', dateOptions)}</h2>
					<button className="icon-button" disabled={isToday} onClick={() => handleDateChange(1)} > <FaAngleRight /> </button>
				</div>
			</header>
			<div id="Users">
				{todaysGoals.map((g, i) => (
					<div key={i}>
						<h2>{g.name}</h2>
						<h3>Goals</h3>
						<li className="goals">
							{g.goals.map((goal, j) => <Goal
								key={j}
								disabled={!isToday}
								goal={goal}
								chatId={g.chatId}
								index={j}
								onEdit={() => setSelectedGoal({ chatId: g.chatId, index: j, goal })}
								onDelete={() => setGoalToDelete({ chatId: g.chatId, index: j, goal })}
							/>)}
						</li>
						<h3>Rewards</h3>
						<li className="rewards">
							{data.rewards.filter(r => r.ChatId === g.chatId).map((r, j) => (
								<div key={j} className="reward">
									{/* <pre>{JSON.stringify(r)}</pre> */}
									<h4>{r.Title}</h4>
									<p>{r.Description}</p>
								</div>
							))}
						</li>
					</div>
				))
				}
			</div>

			<EditModalGoal
				isOpen={!!selectedGoal}
				onClose={() => setSelectedGoal(null)}
				goalData={selectedGoal}
				onSave={(newGoalData) => {
					const newGoals = [...data.goals];
					console.log(newGoals.filter(g => g.date === date));
					newGoals.filter(g => g.date === date).goals[newGoalData.index] = newGoalData.goal;
					setData({ ...data, goals: newGoals });
				}}
			/>

			<Modal isOpen={!!goalToDelete} title="Delete Goal" onClose={() => setGoalToDelete(null)}>
				<p>Are you sure you want to delete this goal?</p>
				<p>{goalToDelete?.goal.text}</p>
				<div className="modal-actions">
					<button onClick={() => deleteGoal(goalToDelete.chatId, goalToDelete.index)} >Yes</button>
					<button onClick={() => setGoalToDelete(null)} >No</button>
				</div>
			</Modal>
		</>
	)
}

export default App
