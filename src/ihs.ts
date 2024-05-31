import { getConsentSingleton } from './consent.js';
import { getKycSingleton } from './kyc.js';

type MaybePromise<T> = T | Promise<T>;
type Mode = 'development' | 'staging' | 'production';
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
	 * Mode environment API antara `development`, `staging`, atau `production`
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

type UserConfig = Partial<IHSConfig> | (() => MaybePromise<Partial<IHSConfig>>);

type RequestConfig = {
	type: Exclude<API, 'auth'>;
	path: `/${string}`;
	searchParams?: URLSearchParams | Record<string, string> | [string, string][];
} & RequestInit;

export interface AuthStore {
	/**
	 * Autentikasi akan terjadi ketika method
	 * ini mengembalikan nilai `undefined`
	 */
	get(): MaybePromise<AuthDetail | undefined>;

	set(detail: AuthDetail): MaybePromise<void>;
}

const defaultBaseUrls: BaseURL = {
	development: {
		auth: `https://api-satusehat-dev.dto.kemkes.go.id/oauth2/v1`,
		fhir: `https://api-satusehat-dev.dto.kemkes.go.id/fhir-r4/v1`,
		consent: `https://api-satusehat-dev.dto.kemkes.go.id/consent/v1`,
		kyc: `https://api-satusehat-dev.dto.kemkes.go.id/kyc/v1`
	},
	staging: {
		auth: `https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1`,
		fhir: `https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1`,
		consent: `https://api-satusehat-stg.dto.kemkes.go.id/consent/v1`,
		kyc: `https://api-satusehat-stg.dto.kemkes.go.id/kyc/v1`
	},
	production: {
		auth: `https://api-satusehat.kemkes.go.id/oauth2/v1`,
		fhir: `https://api-satusehat.kemkes.go.id/fhir-r4/v1`,
		consent: `https://api-satusehat.kemkes.go.id/consent/v1`,
		kyc: `https://api-satusehat.kemkes.go.id/kyc/v1`
	}
} as const;

export default class IHS {
	private config: Readonly<IHSConfig> | undefined;
	private currentAuthStore: AuthStore = new DefaultAuthStore();

	constructor(private readonly userConfig?: UserConfig) {}

	private async applyUserConfig(): Promise<void> {
		const defaultConfig: Readonly<IHSConfig> = {
			mode: (process.env['NODE_ENV'] as Mode) || 'development',
			clientSecret: process.env['IHS_CLIENT_SECRET'] || '',
			secretKey: process.env['IHS_SECRET_KEY'] || '',
			kycPemFile: process.env['IHS_KYC_PEM_FILE'] || ''
		};

		const resolveUserConfig =
			typeof this.userConfig === 'function' ? await this.userConfig() : this.userConfig;

		const mergedConfig = { ...defaultConfig, ...resolveUserConfig };
		if (!mergedConfig.kycPemFile) {
			mergedConfig.kycPemFile =
				mergedConfig.mode === 'development' ? 'publickey.dev.pem' : 'publickey.pem';
		}
		this.config = mergedConfig;
	}

	/**
	 * Atur custom auth store untuk menyimpan atau men-cache auth detail.
	 * Secara default menggunakan {@link DefaultAuthStore}.
	 */
	set authStore(store: AuthStore) {
		this.currentAuthStore = store;
	}

	async getConfig(): Promise<IHSConfig> {
		if (!this.config) await this.applyUserConfig();
		return this.config!;
	}

	async invalidateConfig(): Promise<void> {
		this.config = undefined;
		await this.applyUserConfig();
	}

	/**
	 * Request ke API `consent`, `fhir`, dan `kyc` yang dapat diatur
	 * pada property `type` pada parameter `config`. Autentikasi sudah
	 * ditangani secara otomatis pada method ini.
	 */
	async request(config: RequestConfig): Promise<Response> {
		const { mode } = await this.getConfig();
		const { type, path, searchParams, ...init } = config;
		const url = new URL(defaultBaseUrls[mode][type] + path);
		url.search = searchParams ? new URLSearchParams(searchParams).toString() : url.search;
		const auth = await this.auth();
		init.headers = {
			Authorization: `Bearer ${auth['access_token']}`,
			...init.headers
		};
		return fetch(url, init);
	}

	/**
	 * Autentikasi menggunakan `clientSecret` dan `secretKey` dengan kembalian
	 * berupa detail autentikasi termasuk `access_token` yang digunakan untuk
	 * request ke API `consent`, `fhir`, dan `kyc`.
	 *
	 * IHS Note: Rate limit is 1 request per minute after a failed attempt.
	 */
	async auth(): Promise<AuthDetail> {
		const currentAuthDetail = await this.currentAuthStore.get();
		if (currentAuthDetail) return currentAuthDetail;

		const { clientSecret, secretKey, mode } = await this.getConfig();
		if (!clientSecret || !secretKey) {
			const message = `Missing credentials. The "clientSecret" and "secretKey" config are required.`;
			throw new Error(message);
		}

		const url = defaultBaseUrls[mode]['auth'] + '/accesstoken?grant_type=client_credentials';
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: clientSecret,
				client_secret: secretKey
			})
		});

		if (!response.ok) {
			const messages = await response.text();
			throw new Error('Authentication failed. ' + messages);
		}
		const newAuthDetail = await response.json();
		this.currentAuthStore.set(newAuthDetail);
		return newAuthDetail;
	}

	async fhir(
		path: `/${Exclude<fhir4.FhirResource['resourceType'], 'Bundle'>}${string}` | `/`,
		init?: Omit<RequestConfig, 'path' | 'type'>
	): Promise<Response> {
		return this.request({ ...init, type: 'fhir', path });
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
 * Implementasi default dari {@link AuthStore} yang menyimpan auth
 * detail di-cache di cluster/process memory
 */
export class DefaultAuthStore implements AuthStore {
	readonly ANTICIPATION = 300; // seconds

	private authDetail: AuthDetail | undefined;

	get(): AuthDetail | undefined {
		if (this.authDetail) {
			const { issued_at, expires_in } = this.authDetail;
			const issuedAt = parseInt(issued_at, 10);
			const expiresIn = parseInt(expires_in, 10);
			if (!issuedAt || !expiresIn) {
				this.authDetail = undefined;
				return;
			}

			// expiration time in milliseconds
			const expirationTime = issuedAt + expiresIn * 1000;

			// time when the token is considered about to expire
			const aboutToExpireTime = expirationTime - this.ANTICIPATION * 1000;

			// compare with the current time, if expired set detail to undefined
			if (aboutToExpireTime <= Date.now()) {
				this.authDetail = undefined;
			}
		}
		return this.authDetail;
	}

	set(detail: AuthDetail): void {
		this.authDetail = detail;
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
