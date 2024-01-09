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

	private readonly authManager = new AuthManager();

	constructor(userConfig?: Partial<IHSConfig>) {
		this.config = this.applyUserConfig(userConfig);
		Object.freeze(this.config);
	}

	private applyUserConfig(userConfig?: Partial<IHSConfig>) {
		const defaultConfig: Readonly<IHSConfig> = {
			mode: process.env['NODE_ENV'] === 'production' ? 'production' : 'development',
			clientSecret: process.env['IHS_CLIENT_SECRET'] || '',
			secretKey: process.env['IHS_SECRET_KEY'] || '',
			kycPemFile: process.env['IHS_KYC_PEM_FILE'] || ''
		};

		const mergedConfig = { ...defaultConfig, ...userConfig };
		if (!mergedConfig.kycPemFile) {
			mergedConfig.kycPemFile =
				mergedConfig.mode === 'development' ? 'publickey.dev.pem' : 'publickey.pem';
		}
		return mergedConfig;
	}

	get baseUrls() {
		return defaultBaseUrls[this.config.mode];
	}

	async auth(): Promise<AuthDetail> {
		if (!this.authManager.isTokenExpired) {
			return this.authManager.authDetail!;
		}

		if (!this.config.clientSecret || !this.config.secretKey) {
			const message = `Missing credentials. The "clientSecret" and "secretKey" config are required.`;
			throw new Error(message);
		}

		const url = this.baseUrls.auth + '/accesstoken?grant_type=client_credentials';
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams([
				['client_id', this.config.clientSecret],
				['client_secret', this.config.secretKey]
			])
		});
		if (!response.ok) {
			const messages = await response.text();
			throw new Error('Authentication failed. ' + messages);
		}
		this.authManager.authDetail = await response.json();
		return this.authManager.authDetail!;
	}

	async fhir(
		path: `/${Omit<fhir4.FhirResource, 'Bundle'>['resourceType']}${string}` | `/`,
		init?: { searchParams?: URLSearchParams | Record<string, string> } & RequestInit
	): Promise<Response> {
		const authResult = await this.auth();
		const { searchParams, ...request_init } = init || {};
		const url = new URL(this.baseUrls.fhir + path);
		url.search = searchParams ? new URLSearchParams(searchParams).toString() : url.search;
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
}

/**
 * @internal
 */
export class AuthManager {
	private readonly ANTICIPATION = 300; // seconds

	authDetail: AuthDetail | undefined;

	constructor(private readonly currentTimeProvider?: () => Date) {}

	get isTokenExpired(): boolean {
		if (!this.authDetail) return true;
		const issuedAt = parseInt(this.authDetail.issued_at, 10);
		const expiresIn = parseInt(this.authDetail.expires_in, 10);

		// Calculate the expiration time in milliseconds
		const expirationTime = issuedAt + expiresIn * 1000;

		// Calculate the anticipation time in milliseconds
		const anticipationTime = this.ANTICIPATION * 1000;

		// Calculate the time when the token is considered about to expire
		const aboutToExpireTime = expirationTime - anticipationTime;

		// Compare with the current time
		const currentTime = this.currentTimeProvider?.()?.getTime() ?? Date.now();
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
