import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);

// example of calling IPC exposed from preload script
// check in app / browser console for result
/**
window.electron.ipcRenderer.once('ipc-example', (arg) => {
	// eslint-disable-next-line no-console
	console.log(arg);
});

const testPing = window.electron.ipcRenderer.sendSync('test-sync', 'bruh');
		console.log('outside ipc', testPing);
 */
