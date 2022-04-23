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

export function NoYesBox(title: string, question: string, window: BrowserWindow) {
	return dialog.showMessageBoxSync(window, {
		title: `${title}`,
		buttons: ['No', 'Yes'],
		type: 'info',
		message: question,
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

export function prayerTime_IntrusiveNotification(title: string, msg: string, icon: string, mainWindow: BrowserWindow) {
	if (mainWindow)
		dialog.showMessageBox(mainWindow, {
			title: title,
			buttons: ['Ok'],
			type: 'info',
			message: msg,
			icon: icon,
		});
	else
		dialog.showMessageBoxSync({
			title: title,
			buttons: ['Ok'],
			type: 'info',
			message: msg,
			icon: icon,
		});
}
