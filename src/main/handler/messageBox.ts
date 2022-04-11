import { BrowserWindow, dialog } from 'electron';

export function onUnresponsiveWindow(_e: any) {
	dialog.showMessageBoxSync({
		title: 'Application is not responding',
		buttons: ['Dismiss'],
		type: 'warning',
		message: 'Application is not responding…',
	});
}

export function errorBox(title: string, errorMsg: string) {
	dialog.showErrorBox(title, errorMsg);
	return 'Closed';
}

export function infoBox(title: string, infoMsg: string, window: BrowserWindow) {
	return dialog.showMessageBoxSync(window, {
		title: `Info: ${title}`,
		buttons: ['Ok'],
		type: 'info',
		message: infoMsg,
	});
}

export function successBox(title: string, successMsg: string, window: BrowserWindow) {
	return dialog.showMessageBoxSync(window, {
		title: `Success: ${title}`,
		buttons: ['Ok'],
		type: 'success',
		message: successMsg,
	});
}

export function warningBox(title: string, warningMsg: string, window: BrowserWindow) {
	return dialog.showMessageBoxSync(window, {
		title: `Warning: ${title}`,
		buttons: ['No', 'Yes'],
		type: 'warning',
		message: warningMsg,
	});
}

export function NoYesBox(title: string, warningMsg: string, window: BrowserWindow) {
	return dialog.showMessageBoxSync(window, {
		title: `Warning: ${title}`,
		buttons: ['No', 'Yes'],
		type: 'warning',
		message: warningMsg,
	});
}

export function openDirectory(window: BrowserWindow) {
	return dialog.showOpenDialogSync(window, {
		properties: ['openDirectory'],
	});
}

export function openFile(window: BrowserWindow) {
	return dialog.showOpenDialogSync(window, {
		properties: ['openFile'],
	});
}
