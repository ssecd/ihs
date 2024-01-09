import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import IHS from './ihs.js';

let instance: KYC | undefined;

/**
 * Verifikasi Profil (KYC) merupakan proses yang dilakukan untuk mem-verifikasi
 * identitas pengguna SatuSehat Mobile dengan mengumpulkan informasi dan data
 * tentang pengguna SatuSehat Mobile
 */
export class KYC {
	private readonly IV_LENGTH = 12;
	private readonly TAG_LENGTH = 16;
	private readonly KEY_SIZE = 256;
	private readonly ENCRYPTED_TAG = {
		BEGIN: `-----BEGIN ENCRYPTED MESSAGE-----`,
		END: `-----END ENCRYPTED MESSAGE-----`
	};

	constructor(private readonly ihs: IHS) {}

	async generateValidationUrl(agent: {
		name: string;
		nik: string;
	}): Promise<KycResponse<KycValidationUrlData> | KycResponse<{ error: string }>> {
		const authResult = await this.ihs.auth();
		const url = new URL(this.ihs.baseUrls.kyc + '/generate-url');

		// 1) Generate RSA Key Pairs
		const [publicKey, privateKey] = await this.generateRsaKeyPairs();
		const payload = await this.encrypt(
			JSON.stringify({
				agent_name: agent.name,
				agent_nik: agent.nik,
				public_key: publicKey
			})
		);
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${authResult['access_token']}`,
				'Content-Type': 'text/plain'
			},
			method: 'POST',
			body: payload
		});
		const cipher = await response.text();
		if (response.ok && cipher.startsWith(this.ENCRYPTED_TAG.BEGIN)) {
			const plain = await this.decrypt(cipher, privateKey);
			return JSON.parse(plain);
		}
		return JSON.parse(cipher);
	}

	async generateVerificationCode(patient: {
		nik: string;
		name: string;
	}): Promise<KycResponse<KycVerificationCodeData> | KycResponse<{ error: string }>> {
		const authResult = await this.ihs.auth();
		const url = new URL(this.ihs.baseUrls.kyc + '/challenge-code');
		const payload = JSON.stringify({
			metadata: { method: 'request_per_nik' },
			data: patient
		});
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${authResult['access_token']}`,
				'Content-Type': 'application/json'
			},
			method: 'POST',
			body: payload
		});
		return response.json();
	}

	private async generateRsaKeyPairs(): Promise<[string, string]> {
		return new Promise((resolve, reject) => {
			crypto.generateKeyPair(
				'rsa',
				{
					modulusLength: 2048,
					publicKeyEncoding: { type: 'spki', format: 'pem' },
					privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
				},
				(err, publicKey, privateKey) => {
					if (err) reject(err);
					resolve([publicKey, privateKey]);
				}
			);
		});
	}

	private async encrypt(plain: string): Promise<string> {
		// 2) Generate AES Symmetric Key
		const aesKey = crypto.randomBytes(this.KEY_SIZE / 8);

		// 3) Encrypt message with AES Symmetric Key
		const iv = crypto.randomBytes(this.IV_LENGTH);
		const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
		const encryptedMessage = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
		const tag = cipher.getAuthTag();

		// 4) Encrypt AES Symmetric Key with RSA server's Public Key
		const ihsPublicKey = await this.getIhsPublicKey();
		const encryptedAesKey = crypto.publicEncrypt(
			{
				key: ihsPublicKey,
				padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
				oaepHash: 'sha256'
			},
			aesKey
		);

		// 5) Concat encrypted AES Symmetric Key and encrypted message
		const merge = Buffer.concat([encryptedAesKey, iv, encryptedMessage, tag]);
		return `${this.ENCRYPTED_TAG.BEGIN}\r\n${merge.toString('base64')}\n${this.ENCRYPTED_TAG.END}`;
	}

	private async decrypt(text: string, privateKey: string): Promise<string> {
		// 6) Encrypted server's AES Symmetric Key + encrypted message
		const content = text
			.replace(this.ENCRYPTED_TAG.BEGIN, '')
			.replace(this.ENCRYPTED_TAG.END, '')
			.replace(/\s+/g, '');

		const contentBuffer = Buffer.from(content, 'base64');
		const aesKey = contentBuffer.subarray(0, this.KEY_SIZE);
		const message = contentBuffer.subarray(this.KEY_SIZE);

		// 7) Decrypt server's AES Symmetric Key with client's RSA Private Key
		const decryptedAesKey = crypto.privateDecrypt(
			{
				key: privateKey,
				padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
				oaepHash: 'sha256'
			},
			aesKey
		);

		const iv = message.subarray(0, this.IV_LENGTH);
		const tag = message.subarray(-this.TAG_LENGTH);
		const cipher = message.subarray(this.IV_LENGTH, -this.TAG_LENGTH);

		// 8) Decrypt message with decrypted server's AES Symmetric Key
		const decipher = crypto.createDecipheriv('aes-256-gcm', decryptedAesKey, iv);
		decipher.setAuthTag(tag);

		const decryptedMessage = Buffer.concat([
			decipher.update(cipher.toString('binary'), 'binary'),
			decipher.final()
		]);

		return decryptedMessage.toString('utf8');
	}

	/**
	 * IHS public key atau Server's public key adalah public key
	 * yang diberikan oleh platform SatuSehat
	 */
	private async getIhsPublicKey(): Promise<string> {
		const pemPath = this.ihs.config.kycPemFile;
		const resolvePath = path.isAbsolute(pemPath) ? pemPath : path.resolve(process.cwd(), pemPath);
		return await fs.readFile(resolvePath, 'utf8');
	}
}

export function getKycSingleton(...params: ConstructorParameters<typeof KYC>): KYC {
	if (!instance) instance = new KYC(...params);
	return instance;
}

export interface KycResponse<T> {
	metadata: {
		/**
		 * HTTP code
		 */
		code: string;

		/**
		 * Pesan sesuai HTTP code
		 */
		message: string;
	};
	data: T;
}

export interface KycValidationUrlData {
	/**
	 * Informasi nama petugas/operator Fasilitas Pelayanan Kesehatan
	 * (Fasyankes) yang akan melakukan validasi
	 */
	agent_name: string;

	/**
	 * Informasi nomor identitas petugas/operator Fasilitas Pelayanan
	 * Kesehatan (Fasyankes) yang akan melakukan validasi
	 */
	agent_nik: string;

	/**
	 * Nilai token yang terdapat pada URL sesuai nilai property
	 * `data.url` yang terdapat pada response ini
	 */
	token: string;

	/**
	 * URL lengkap beserta token-nya yang digunakan untuk melakukan validasi
	 */
	url: string;
}

export interface KycVerificationCodeData {
	/**
	 * Informasi nomor identitas pasien yang akan di-verifikasi oleh
	 * petugas/operator Fasilitas Pelayanan Kesehatan (Fasyankes)
	 */
	nik: string;

	/**
	 * Informasi nama pasien yang akan di-verifikasi oleh petugas/operator
	 * Fasilitas Pelayanan Kesehatan (Fasyankes).
	 */
	name: string;

	/**
	 * Nomor id SatuSehat pasien
	 */
	ihs_number: string;

	/**
	 * Nilai kode verifikasi pasien untuk proses validasi
	 */
	challenge_code: number;

	/**
	 * Informasi waktu kode verifikasi dibuat
	 */
	created_timestamp: string;

	/**
	 * Informasi kedaluwarsa kode verifikasi
	 */
	expired_timestamp: string;
}
