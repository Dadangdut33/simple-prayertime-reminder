import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';
import './Font.css';

const Hello = () => {
	const testIpc = () => {
		const testPing = window.electron.ipcRenderer.sendSync('test-sync', 'bruh');
		console.log('outside ipc', testPing);
	};

	return (
		<div>
			<div className='Hello'>
				<img width='200px' alt='icon' src={icon} />
			</div>
			<h1>electron-react-boilerplate</h1>
			<div className='Hello'>
				<a href='/#' onClick={() => testIpc()}>
					<button type='button'>
						<span role='img' aria-label='books'>
							📚
						</span>
						Test
					</button>
				</a>
				<a href='https://electron-react-boilerplate.js.org/' target='_blank' rel='noreferrer'>
					<button type='button'>
						<span role='img' aria-label='books'>
							📚
						</span>
						Read our docs
					</button>
				</a>
				<a href='https://github.com/sponsors/electron-react-boilerplate' target='_blank' rel='noreferrer'>
					<button type='button'>
						<span role='img' aria-label='books'>
							🙏
						</span>
						Donate
					</button>
				</a>
			</div>
		</div>
	);
};

export default function App() {
	return (
		<Router>
			<Routes>
				<Route path='/' element={<Hello />} />
			</Routes>
		</Router>
	);
}
