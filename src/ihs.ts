import { getConsentSingleton } from './consent.js';
import { getKycSingleton } from './kyc.js';

type Mode = 'development' | 'production';
type API = 'auth' | 'fhir' | 'consent' | 'kyc';
type BaseURL = Record<Mode, Record<API, string>>;

export interface IHSConfig {
	clientSecret: string;
	secretKey: string;
	mode: Mode;
}

const defaultBaseUrls: BaseURL = {
	development: {
		auth: `https://api-satusehat-dev.dto.kemkes.go.id/oauth2/v1`,
		fhir: `https://api-satusehat-dev.dto.kemkes.go.id/fhir-r4/v1`,
		consent: `https://api-satusehat-dev.dto.kemkes.go.id/consent/v1`,
		kyc: `https://api-satusehat-dev.dto.kemkes.go.id/kyc/v1`
	},
	production: {
		auth: `https://api-satusehat.kemkes.go.id/oauth2/v1`,
		fhir: `https://api-satusehat.kemkes.go.id/fhir-r4/v1`,
		consent: `https://api-satusehat.kemkes.go.id/consent/v1`,
		kyc: `https://api-satusehat.kemkes.go.id/kyc/v1`
	}
} as const;

export class IHS {
	readonly config: Readonly<IHSConfig> = {
		mode: process.env['NODE_ENV'] === 'production' ? 'production' : 'development',
		clientSecret: process.env['IHS_CLIENT_SECRET'] || '',
		secretKey: process.env['IHS_SECRET_KEY'] || ''
	};

	constructor(private readonly userConfig?: Partial<IHSConfig>) {
		this.config = { ...this.config, ...this.userConfig };
		Object.freeze(this.config);
	}

	get baseUrls() {
		return defaultBaseUrls[this.config.mode];
	}

	async auth() {
		const response = await this.authenticate();
		const authResult = await response.json();
		return authResult; // TODO: handle cache and expiration
	}

	async fhir(
		path: `/${fhir4.FhirResource['resourceType']}${string}`,
		init?: { params?: URLSearchParams | Record<string, string> } & RequestInit
	) {
		const authResult = await this.auth();
		const { params, ...request_init } = init || {};
		const url = new URL(this.baseUrls.fhir + path);
		url.search = params ? new URLSearchParams(params).toString() : url.search;
		return fetch(url, {
			...request_init,
			headers: {
				Authorization: `Bearer ${authResult['access_token']}`,
				...(request_init?.headers || {})
			}
		});
	}

	get consent() {
		const instance = getConsentSingleton(this);
		return instance;
	}

	get kyc() {
		const instance = getKycSingleton(this);
		return instance;
	}

	private async authenticate() {
		if (!this.config.clientSecret || !this.config.secretKey) {
			const message = `Missing credentials. The "clientSecret" and "secretKey" config are required.`;
			throw new Error(message);
		}

		const url = this.baseUrls.auth + '/accesstoken?grant_type=client_credentials';
		return fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams([
				['client_id', this.config.clientSecret],
				['client_secret', this.config.secretKey]
			])
		});
	}
}
