import path from 'node:path';
import IHS from './ihs.js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

let instance: KYC | undefined;

export class KYC {
	constructor(private readonly ihs: IHS) {}

	async generateValidationUrl(agent: { name: string; nik: string }) {
		const [publicKey, privateKey] = await this.generateRsaKeyPairs();
		const authResult = await this.ihs.auth();
		const url = new URL(this.ihs.baseUrls.kyc + '/generate-url');
		const payload = JSON.stringify({
			agent_name: agent.name,
			agent_nik: agent.nik,
			public_key: publicKey
		});
		const payload_encrypted = await this.encryptMessage(payload);
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${authResult['access_token']}`,
				'Content-Type': 'text/plain'
			},
			method: 'POST',
			body: payload_encrypted
		});
		const cipher = await response.text();
		const plain = await this.decrypt(cipher, privateKey);
		return plain;
	}

	async generateVerificationCode(patient: { nik: string; name: string }) {
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
		return response;
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

	private generateAesSymmetricKey(): Buffer {
		return crypto.randomBytes(32);
	}

	private async encryptMessage(plain: string): Promise<string> {
		const symmetric = this.generateAesSymmetricKey();
		const encryptedSymmetric = await this.encryptAesSymmetricKey(symmetric);
		const iv = crypto.randomBytes(12);
		const cipherIv = crypto.createCipheriv('aes-256-gcm', symmetric, iv);
		const cipher = Buffer.concat([cipherIv.update(plain, 'utf8'), cipherIv.final()]);
		const tag = cipherIv.getAuthTag();
		const merge = Buffer.concat([encryptedSymmetric, iv, cipher, tag]).toString('base64');
		const result = merge.match(/.{1,64}/g)?.join('\r\n') || '';
		return `-----BEGIN ENCRYPTED MESSAGE-----\r\n${result}\n-----END ENCRYPTED MESSAGE-----`;
	}

	private async encryptAesSymmetricKey(key: Buffer): Promise<Buffer> {
		const ihsPublicKey = await this.getPublicPemFile();
		const config: crypto.RsaPublicKey = {
			key: ihsPublicKey,
			padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
		};
		return crypto.publicEncrypt(config, key);
	}

	private async decrypt(cipher: string, privateKey: string): Promise<string> {
		privateKey;
		return cipher;
	}

	private async getPublicPemFile() {
		const pemPath = this.ihs.config.kycPemFile;
		const resolvePath = path.isAbsolute(pemPath) ? pemPath : path.resolve(process.cwd(), pemPath);
		return await fs.readFile(resolvePath, 'utf8');
	}
}

export function getKycSingleton(...params: ConstructorParameters<typeof KYC>): KYC {
	if (!instance) instance = new KYC(...params);
	return instance;
}
