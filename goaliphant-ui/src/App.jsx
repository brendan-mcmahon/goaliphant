import { useEffect, useState } from 'react'
import './App.scss'
import { addNames, fetchData } from './api'

function App() {
	const [data, setData] = useState({});
	const [todayData, setTodayData] = useState([]);

	useEffect(() => {
		async function fetchDataAsync() {
			const _data = await fetchData();
			setData(_data.filter(d => d.chatId !== '-4711773993'));
		}
		fetchDataAsync();
	}, []);

	useEffect(() => {
		setTodayData(data.filter(d => d.date === new Date().toISOString().split('T')[0]));
	}, [data]);

	return (
		<>
			<header>
				<h1>Goaliphant</h1>
			</header>
			<div id="Users">
				{todayData.map((d, i) => (
					<div key={i}>
						<h3>{d.chatId}</h3>
					</div>
				))
				}
			</div>
		</>
	)
}

export default App
