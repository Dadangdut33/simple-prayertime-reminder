export type ModalContentInterface = {
	type: 'adhan' | 'adhan_fajr' | 'reminder' | '';
	title: string;
	time: string;
	location: string;
	coordinates: string;
};
