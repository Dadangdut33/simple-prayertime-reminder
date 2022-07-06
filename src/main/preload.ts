import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electron', {
	ipcRenderer: {
		on(channel: string, func: (...args: unknown[]) => void) {
			const validChannels = ['open-changes-made', 'page-change', 'refresh-from-main', 'signal-modal-praytime', 'close-modal', 'path-updated'];
			if (validChannels.includes(channel)) {
				const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);
				// Deliberately strip event as it includes `sender`
				ipcRenderer.on(channel, subscription);

				return () => ipcRenderer.removeListener(channel, subscription);
			} else {
				throw new Error(`Invalid channel: ${channel}`);
			}
		},
		once(channel: string, func: (...args: unknown[]) => void) {
			const validChannels = [''];
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				ipcRenderer.once(channel, (_event, ...args) => func(...args));
			} else {
				throw new Error(`Invalid channel: ${channel}`);
			}
		},
		send(channel: string, ...args: unknown[]) {
			ipcRenderer.send(channel, ...args);
		},
		sendSync(channel: string, ...args: unknown[]) {
			return ipcRenderer.sendSync(channel, ...args);
		},
		removeEventListener(channel: string, func: (...args: unknown[]) => void) {
			ipcRenderer.removeListener(channel, func);
		},
	},
});
