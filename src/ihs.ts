import { getConsentSingleton } from './consent.js';
import { getKFASingleton } from './kfa.js';
import { getKycSingleton } from './kyc.js';

type MaybePromise<T> = T | Promise<T>;
type Mode = 'sandbox' | 'production';
type API = 'auth' | 'fhir' | 'consent' | 'kyc' | 'kfa' | 'kfa2' | 'kfa3';
type EndpointURL = Record<Mode, Record<API, string>>;

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
	 * Mode environment API antara `sandbox` atau `production`
	 *
	 * @default process.env.NODE_ENV || 'sandbox'
	 */
	mode: Mode;

	/**
	 * Path atau lokasi public key KYC dari SatuSehat. Dapat
	 * menggunakan absolute atau relative path. Secara default
	 * akan membaca nilai environment variable IHS_KYC_PEM_FILE
	 * atau `publickey.sandbox.pem` pada mode `sandbox` dan
	 * `publickey.pem` pada mode `production`
	 *
	 * @default process.env.IHS_KYC_PEM_FILE
	 */
	kycPemFile: string;
}

type UserConfig = Partial<IHSConfig> | (() => MaybePromise<Partial<IHSConfig>>);

type RequestConfig = {
	/**
	 * Tipe dari RestAPI. Gunakan tipe `base` jika API belum diimplementasikan.
	 * Contoh:
	 *
	 * ```ts
	 * await ihs.request({
	 *		type: 'base',
	 *		path: '/masterdata/v1/mastersaranaindex/mastersarana', // <- include endpoint '/masterdata/v1/'
	 *		searchParams: {
	 *			limit: '10',
	 *			page: '1',
	 *			jenis_sarana: '121',
	 *		}
	 *	})
	 * ```
	 */
	type: 'base' | Exclude<API, 'auth'>;
	path: string;
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

const defaultBaseUrls: Record<Mode, string> = {
	sandbox: 'https://api-satusehat-stg.dto.kemkes.go.id',
	production: 'https://api-satusehat.kemkes.go.id'
};

const defaultEndpointUrls = Object.entries(defaultBaseUrls).reduce(
	(acc, [mode, url]) => {
		acc[mode as Mode] = {
			auth: `${url}/oauth2/v1`,
			fhir: `${url}/fhir-r4/v1`,
			consent: `${url}/consent/v1`,
			kyc: `${url}/kyc/v1`,
			kfa: `${url}/kfa`,
			kfa2: `${url}/kfa-v2`,
			kfa3: `${url}/kfa-v3`
		};
		return acc;
	},
	<EndpointURL>{}
);

function buildUrl(base: string, path: string) {
	// ensure base ends with a slash so it's treated as a directory
	const normalizedBase = base.endsWith('/') ? base : base + '/';

	/**
	 * URL constructor params rules
	 * - base must end with / otherwise it's treated as a file
	 * - path in input must NOT start with / otherwise it resets the path
	 */
	return new URL(path.replace(/^\/+/, ''), normalizedBase);
}

export default class IHS {
	private config: Readonly<IHSConfig> | undefined;
	private currentAuthStore: AuthStore = new DefaultAuthStore();

	constructor(private readonly userConfig?: UserConfig) {}

	private async applyUserConfig(): Promise<void> {
		const defaultConfig: Readonly<IHSConfig> = {
			mode: (process.env['NODE_ENV'] as Mode) || 'sandbox',
			clientSecret: process.env['IHS_CLIENT_SECRET'] || '',
			secretKey: process.env['IHS_SECRET_KEY'] || '',
			kycPemFile: process.env['IHS_KYC_PEM_FILE'] || ''
		};

		const resolveUserConfig =
			typeof this.userConfig === 'function' ? await this.userConfig() : this.userConfig;

		const mergedConfig = { ...defaultConfig, ...resolveUserConfig };

		if (!(<Mode[]>['sandbox', 'production']).includes(mergedConfig.mode)) {
			console.warn(`[ihs]: Invalid mode "${mergedConfig.mode}", falling back to "sandbox".`);
			mergedConfig.mode = 'sandbox';
		}

		if (!mergedConfig.kycPemFile) {
			mergedConfig.kycPemFile =
				mergedConfig.mode === 'sandbox' ? 'publickey.sandbox.pem' : 'publickey.pem';
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
	 * Request ke API `consent`, `fhir`, `kyc`, dan `kfa` yang dapat diatur
	 * pada property `type` pada parameter `config`. Autentikasi sudah
	 * ditangani secara otomatis pada method ini.
	 */
	async request(config: RequestConfig): Promise<Response> {
		const { mode } = await this.getConfig();
		const { type, path, searchParams, ...init } = config;
		const baseUrl = type == 'base' ? defaultBaseUrls[mode] : defaultEndpointUrls[mode][type];
		const url = buildUrl(baseUrl, path);
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
	 * request ke API `consent`, `fhir`, `kyc`, dan `kfa`.
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

		const url = defaultEndpointUrls[mode]['auth'] + '/accesstoken?grant_type=client_credentials';
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
		const newAuthDetail = <AuthDetail>await response.json();
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

	get kfa() {
		const instance = getKFASingleton(this);
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
