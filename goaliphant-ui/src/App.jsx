import { useEffect, useState } from 'react'
import './App.scss'
import { completeGoal, fetchData } from './api'
import { FaAngleLeft, FaAngleRight } from 'react-icons/fa'

const dateOptions = {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
};


function App() {
	const [data, setData] = useState([]);
	const [todaysGoals, setTodaysGoals] = useState([]);
	const [date, setDate] = useState(new Date());
	const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

	useEffect(() => {
		async function fetchDataAsync() {
			const _data = await fetchData();
			// setData(_data.filter(d => d.chatId !== '-4711773993'));
			console.log("fetched data", _data);
			setData(_data);
		}
		fetchDataAsync();
	}, []);

	useEffect(() => {
		console.log("data changed", data);
		setTodaysGoals(data.goals?.filter(d => d.date === date.toISOString().split('T')[0]));
		console.log("loaded");
	}, [data, date]);

	const handleDateChange = (offset) => {
		if (isToday && offset >= 1) {
			return;
		}
		const newDate = new Date(date);
		newDate.setDate(newDate.getDate() + offset);
		setDate(newDate);
	}

	const checked = async (e, index) => {
		const isChecked = e.target.checked;
		const chatId = todaysGoals[0].chatId;

		if (isChecked) {
			await completeGoal(chatId, index);
		}

	}

	if (!todaysGoals) {
		return <div>Loading...</div>
	}

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
						<h3>{g.name}</h3>
						<h3>Goals</h3>
						<li className="goals">
							{g.goals.map((g, j) => (
								<div key={j} className="goal">
									<input disabled={!isToday} onChange={(e) => checked(e, j)} type="checkbox" checked={g.completed} />
									{g.text}
								</div>
							))}
						</li>
						<h3>Rewards</h3>
						{/* <li className="rewards">
							{Object.groupBy(g.rewards, r => r.ChatId).group.map((r, j) => (
								<div key={j} className="reward">
									{r.text}
								</div>
							))}
						</li> */}
					</div>
				))
				}
			</div>
		</>
	)
}

export default App
