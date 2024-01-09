import { getConsentSingleton } from './consent.js';
import { getKycSingleton } from './kyc.js';

type Mode = 'development' | 'production';
type API = 'auth' | 'fhir' | 'consent' | 'kyc';
type BaseURL = Record<Mode, Record<API, string>>;

export interface IHSConfig {
	/**
	 * Client secret dari Akses Kode API di Platform SatuSehat
	 *
	 * @default process.env.IHS_CLIENT_SECRET
	 */
	clientSecret: string;

	/**
	 * Secret key dari Akses Kode API di Platform SatuSehat
	 *
	 * @default process.env.IHS_SECRET_KEY
	 */
	secretKey: string;

	/**
	 * Mode environment API antara `development` ata `production`
	 *
	 * @default process.env.NODE_ENV || 'development'
	 */
	mode: Mode;

	/**
	 * Path atau lokasi public key KYC dari SatuSehat. Dapat
	 * menggunakan absolute atau relative path. Secara default
	 * akan membaca nilai environment variable IHS_KYC_PEM_FILE
	 * atau `publickey.dev.pem` pada mode `development` dan
	 * `publickey.pem` pada mode `production`
	 *
	 * @default process.env.IHS_KYC_PEM_FILE
	 */
	kycPemFile: string;
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

export default class IHS {
	readonly config: Readonly<IHSConfig>;

	private authDetail: AuthDetail | undefined;

	constructor(userConfig?: Partial<IHSConfig>) {
		this.config = this.defineConfig(userConfig);
		Object.freeze(this.config);
	}

	private defineConfig(userConfig?: Partial<IHSConfig>) {
		const defaultConfig: Readonly<IHSConfig> = {
			mode: process.env['NODE_ENV'] === 'production' ? 'production' : 'development',
			clientSecret: process.env['IHS_CLIENT_SECRET'] || '',
			secretKey: process.env['IHS_SECRET_KEY'] || '',
			kycPemFile: process.env['IHS_KYC_PEM_FILE'] || ''
		};

		const merged = { ...defaultConfig, ...userConfig };
		if (!merged.kycPemFile) {
			merged.kycPemFile = merged.mode === 'development' ? 'publickey.dev.pem' : 'publickey.pem';
		}
		return merged;
	}

	get baseUrls() {
		return defaultBaseUrls[this.config.mode];
	}

	async auth(): Promise<AuthDetail> {
		if (this.authDetailExpired) {
			const response = await this.authenticate();
			this.authDetail = await response.json();
		}
		return this.authDetail!;
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

	private async authenticate(): Promise<Response> {
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

	private get authDetailExpired() {
		if (!this.authDetail) return true;
		const issuedAt = parseInt(this.authDetail.issued_at, 10);
		const expiresIn = parseInt(this.authDetail.expires_in, 10);

		// Calculate the expiration time in milliseconds
		const expirationTime = issuedAt + expiresIn * 1000;

		// Calculate the anticipation time in milliseconds
		const anticipation = 300; // seconds
		const anticipationTime = anticipation * 1000;

		// Calculate the time when the token is considered about to expire
		const aboutToExpireTime = expirationTime - anticipationTime;

		// Compare with the current time
		const currentTime = Date.now();
		return aboutToExpireTime <= currentTime;
	}
}

export interface AuthDetail {
	refresh_token_expires_in: string;
	api_product_list: string;
	api_product_list_json: string[];
	organization_name: string;
	'developer.email': string;
	token_type: string;
	/** elapsed time. eg: 1698379451736 */
	issued_at: string;
	client_id: string;
	access_token: string;
	application_name: string;
	scope: string;
	/** in seconds */
	expires_in: string;
	refresh_count: string;
	status: string;
}
