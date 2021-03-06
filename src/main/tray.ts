import { app, Menu, Tray, BrowserWindow, nativeImage } from 'electron';
import { configInterface, getPrayerTimes_I } from './interfaces';
import Moment from 'moment-timezone';

export default class TrayManager {
	private tray: Tray;
	private iconPath: string;
	private mainWindow: BrowserWindow;
	constructor(mainWindow: BrowserWindow, iconPath: string) {
		this.mainWindow = mainWindow;
		this.iconPath = iconPath;
		this.tray = new Tray(iconPath);
	}

	createTray() {
		const contextMenu = Menu.buildFromTemplate([
			{
				label: 'Show',
				click: () => {
					this.mainWindow.show();
				},
			},
			{
				label: 'Quit',
				click: () => {
					app.exit(0);
				},
			},
		]);

		this.tray.setToolTip(`Simple PrayerTime Reminder - v${app.getVersion()}`);
		this.tray.setContextMenu(contextMenu);

		this.tray.on('click', () => {
			const wasVisible = this.mainWindow.isVisible();
			this.mainWindow.show();

			if (!wasVisible) this.mainWindow.webContents.send('refresh-from-main');
		});
	}

	parseDate(theDate: string, appConfig: configInterface) {
		return Moment(new Date(theDate))
			.tz(appConfig.timezoneOption.timezone)
			.format(appConfig.clockStyle === '24h' ? 'HH:mm' : 'hh:mm A');
	}

	updatePrayTime(prayerTimes: getPrayerTimes_I, appConfig: configInterface) {
		const image = nativeImage.createFromPath(this.iconPath);
		const contextMenu = Menu.buildFromTemplate([
			{
				label: `Today's Prayer Times`,
				icon: image.resize({ width: 32, height: 32 }),
				enabled: false,
				sublabel: `${Moment().tz(appConfig.timezoneOption.timezone).format('MMM DD, YYYY')}`,
			},
			{
				label: 'Fajr: ' + this.parseDate(prayerTimes.fajrTime, appConfig),
				enabled: false,
			},
			{
				label: 'Sunrise: ' + this.parseDate(prayerTimes.sunriseTime, appConfig),
				enabled: false,
			},
			{
				label: 'Dhuhr: ' + this.parseDate(prayerTimes.dhuhrTime, appConfig),
				enabled: false,
			},
			{
				label: 'Asr: ' + this.parseDate(prayerTimes.asrTime, appConfig),
				enabled: false,
			},
			{
				label: 'Maghrib: ' + this.parseDate(prayerTimes.maghribTime, appConfig),
				enabled: false,
			},
			{
				label: 'Isha: ' + this.parseDate(prayerTimes.ishaTime, appConfig),
				enabled: false,
			},
			{
				type: 'separator',
			},
			{
				label: 'Show',
				click: () => {
					const wasVisible = this.mainWindow.isVisible();
					this.mainWindow.show();

					if (!wasVisible) this.mainWindow.webContents.send('refresh-from-main');
				},
			},
			{
				label: 'Quit',
				click: () => {
					app.exit(0);
				},
			},
		]);

		this.tray.setContextMenu(contextMenu);
	}
}
