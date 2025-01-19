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
	const [todayData, setTodayData] = useState([]);
	const [date, setDate] = useState(new Date());
	const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

	useEffect(() => {
		async function fetchDataAsync() {
			const _data = await fetchData();
			setData(_data.filter(d => d.chatId !== '-4711773993'));
		}
		fetchDataAsync();
	}, []);

	useEffect(() => {
		setTodayData(data.filter(d => d.date === date.toISOString().split('T')[0]));
		console.log("loaded");
	}, [data]);

	const handleDateChange = (offset) => {
		if (isToday && offset >= 1) {
			return;
		}
		const newDate = new Date(date);
		newDate.setDate(newDate.getDate() + offset);
		setDate(newDate);
		setTodayData(data.filter(d => d.date === newDate.toISOString().split('T')[0]));
	}

	const checked = async (e, index) => {
		const isChecked = e.target.checked;
		const chatId = todayData[0].chatId;

		if (isChecked) {
			await completeGoal(chatId, index);
		}

	}

	if (!todayData) {
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
				{todayData.map((d, i) => (
					<div key={i}>
						<h3>{d.name}</h3>
						<li className="goals">
							{d.goals.map((g, j) => (
								<div key={j} className="goal">
									<input disabled={!isToday} onChange={(e) => checked(e, j)} type="checkbox" checked={g.completed} />
									{g.text}
								</div>
							))}
						</li>
					</div>
				))
				}
			</div>
		</>
	)
}

export default App
