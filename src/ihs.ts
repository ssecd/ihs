type Mode = 'development' | 'production';
type API = 'auth' | 'fhir' | 'consent';

export interface IHSConfig {
	clientSecret: string;
	secretKey: string;
	mode: Mode;
}

const baseUrls: Record<API, Record<Mode, string>> = {
	auth: {
		development: `https://api-satusehat-dev.dto.kemkes.go.id/oauth2/v1`,
		production: `https://api-satusehat.kemkes.go.id/oauth2/v1`
	},
	fhir: {
		development: `https://api-satusehat-dev.dto.kemkes.go.id/fhir-r4/v1`,
		production: `https://api-satusehat.kemkes.go.id/fhir-r4/v1`
	},
	consent: {
		development: `https://api-satusehat-dev.dto.kemkes.go.id/consent/v1`,
		production: `https://api-satusehat.kemkes.go.id/consent/v1`
	}
} as const;

export class IHS {
	constructor(private readonly config: Partial<IHSConfig>) {}

	get mode(): Mode {
		return this.config?.mode || 'development';
	}

	async auth() {
		const clientId = this.config?.clientSecret || process.env?.['IHS_CLIENT_SECRET'];
		const clientSecret = this.config?.secretKey || process.env?.['IHS_SECRET_KEY'];
		if (!clientId || !clientSecret) {
			throw new Error(`Missing credentials. The "clientId" and "clientSecret" are required.`);
		}

		const url = baseUrls.auth[this.mode] + '/accesstoken?grant_type=client_credentials';
		return fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams([
				['client_id', clientId],
				['client_secret', clientSecret]
			])
		});
	}

	async consent({
		patientId,
		...rest
	}: {
		patientId: string;
		action: 'OPTIN' | 'OPTOUT';
		agent: string;
	}) {
		const credentials = await this.getCredentials();
		const url = new URL(baseUrls['consent'][this.mode] + '/Consent');
		return fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${credentials.access_token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ patient_id: patientId, ...rest })
		});
	}

	async fhir(
		path: `/${fhir4.FhirResource['resourceType']}${string}`,
		init?: { params?: URLSearchParams | Record<string, string> } & RequestInit
	) {
		const credentials = await this.getCredentials();
		const { params, ...request_init } = init || {};
		const url = new URL(baseUrls['fhir'][this.mode] + path);
		url.search = params ? new URLSearchParams(params).toString() : url.search;
		return fetch(url, {
			...request_init,
			headers: {
				Authorization: `Bearer ${credentials.access_token}`,
				...(request_init?.headers || {})
			}
		});
	}

	private async getCredentials() {
		const response = await this.auth();
		const credentials = await response.json();
		return credentials; // TODO: handle cache and expiration
	}
}
