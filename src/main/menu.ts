import { app, Menu, shell, BrowserWindow, MenuItemConstructorOptions } from 'electron';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
	selector?: string;
	submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
	mainWindow: BrowserWindow;

	constructor(mainWindow: BrowserWindow) {
		this.mainWindow = mainWindow;
	}

	buildMenu(): Menu {
		if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
			this.setupDevelopmentEnvironment();
		}

		const template = process.platform === 'darwin' ? this.buildDarwinTemplate() : this.buildDefaultTemplate();

		const menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);

		return menu;
	}

	setupDevelopmentEnvironment(): void {
		this.mainWindow.webContents.on('context-menu', (_, props) => {
			const { x, y } = props;

			Menu.buildFromTemplate([
				{
					label: 'Inspect element',
					click: () => {
						this.mainWindow.webContents.inspectElement(x, y);
					},
				},
			]).popup({ window: this.mainWindow });
		});
	}

	buildDarwinTemplate(): MenuItemConstructorOptions[] {
		const subMenuFile: DarwinMenuItemConstructorOptions = {
			label: 'File',
			submenu: [
				{
					label: 'Hide',
					accelerator: 'Command+H',
					click: () => {
						this.mainWindow.hide();
					},
				},
				{
					label: 'Quit',
					accelerator: 'Command+Q',
					click: () => {
						app.quit();
					},
				},
			],
		};
		const subMenuViewDev: MenuItemConstructorOptions = {
			label: 'View',
			submenu: [
				{
					label: 'Reload',
					accelerator: 'Command+R',
					click: () => {
						this.mainWindow.webContents.reload();
					},
				},
				{
					label: 'Toggle Full Screen',
					accelerator: 'Ctrl+Command+F',
					click: () => {
						this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
					},
				},
				{
					label: 'Toggle Developer Tools',
					accelerator: 'Alt+Command+I',
					click: () => {
						this.mainWindow.webContents.toggleDevTools();
					},
				},
			],
		};
		const subMenuViewProd: MenuItemConstructorOptions = {
			label: 'View',
			submenu: [
				{
					label: 'Toggle Full Screen',
					accelerator: 'Ctrl+Command+F',
					click: () => {
						this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
					},
				},
			],
		};
		const subMenuHelp: MenuItemConstructorOptions = {
			label: 'Help',
			submenu: [
				{
					label: 'Project Repository',
					click() {
						shell.openExternal('https://github.com/dadangdut33/simple-prayertime-reminder');
					},
				},
				{ type: 'separator' },
				{
					label: 'Wiki/Documentation',
					click() {
						shell.openExternal('https://github.com/Dadangdut33/simple-prayertime-reminder/wiki');
					},
				},
				{
					label: 'Discussions',
					click() {
						shell.openExternal('https://github.com/Dadangdut33/simple-prayertime-reminder/discussions');
					},
				},
				{
					label: 'Issues',
					click() {
						shell.openExternal('https://github.com/Dadangdut33/simple-prayertime-reminder/issues');
					},
				},
			],
		};

		const subMenuView = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true' ? subMenuViewDev : subMenuViewProd;

		return [subMenuFile, subMenuView, subMenuHelp];
	}

	buildDefaultTemplate() {
		const templateDefault: MenuItemConstructorOptions[] = [
			{
				label: '&File',
				submenu: [
					{
						label: '&Hide to Tray',
						accelerator: 'Ctrl+W',
						click: () => {
							this.mainWindow.hide();
						},
					},
					{
						label: '&Quit',
						accelerator: 'Ctrl+Q',
						click: () => {
							app.quit();
						},
					},
				],
			},
			{
				label: '&View',
				submenu:
					process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'
						? [
								{
									label: '&Reload',
									accelerator: 'Ctrl+R',
									click: () => {
										this.mainWindow.webContents.reload();
									},
								},
								{
									label: 'Toggle &Full Screen',
									accelerator: 'F11',
									click: () => {
										this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
									},
								},
								{
									label: 'Toggle &Developer Tools',
									accelerator: 'Alt+Ctrl+I',
									click: () => {
										this.mainWindow.webContents.toggleDevTools();
									},
								},
						  ]
						: [
								{
									label: 'Toggle &Full Screen',
									accelerator: 'F11',
									click: () => {
										this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
									},
								},
						  ],
			},
			{
				label: 'Help',
				submenu: [
					{
						label: 'Project Repository',
						click() {
							shell.openExternal('https://github.com/dadangdut33/simple-prayertime-reminder');
						},
					},
					{ type: 'separator' },
					{
						label: 'Wiki/Documentation',
						click() {
							shell.openExternal('https://github.com/Dadangdut33/simple-prayertime-reminder/wiki');
						},
					},
					{
						label: 'Discussions',
						click() {
							shell.openExternal('https://github.com/Dadangdut33/simple-prayertime-reminder/discussions');
						},
					},
					{
						label: 'Issues',
						click() {
							shell.openExternal('https://github.com/Dadangdut33/simple-prayertime-reminder/issues');
						},
					},
				],
			},
		];

		return templateDefault;
	}
}
