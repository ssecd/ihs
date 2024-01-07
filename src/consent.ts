import IHS from './ihs.js';

let instance: Consent | undefined;

export class Consent {
	constructor(private readonly ihs: IHS) {}

	async get(patientId: string) {
		const authResult = await this.ihs.auth();
		const url = new URL(this.ihs.baseUrls.consent + '/Consent');
		url.searchParams.set('patient_id', patientId);
		return fetch(url, {
			headers: {
				Authorization: `Bearer ${authResult['access_token']}`
			}
		});
	}

	async update(data: { patientId: string; action: 'OPTIN' | 'OPTOUT'; agent: string }) {
		const authResult = await this.ihs.auth();
		const url = new URL(this.ihs.baseUrls.consent + '/Consent');
		const payload = JSON.stringify({ patient_id: data.patientId, ...data });
		return fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${authResult['access_token']}`,
				'Content-Type': 'application/json'
			},
			body: payload
		});
	}
}

export function getConsentSingleton(...params: ConstructorParameters<typeof Consent>): Consent {
	if (!instance) instance = new Consent(...params);
	return instance;
}
