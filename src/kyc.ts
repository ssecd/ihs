import IHS from './ihs.js';

let instance: KYC | undefined;

export class KYC {
	constructor(private readonly ihs: IHS) {}

	async generateValidationUrl(agent: { name: string; nik: string }) {
		const authResult = await this.ihs.auth();
		const url = new URL(this.ihs.baseUrls.kyc + '/generate-url');
		const payload = JSON.stringify({
			agent_name: agent.name,
			agent_nik: agent.nik,
			public_key: 'TODO'
		});
		const payload_encrypted = await this.encrypt(payload);
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${authResult['access_token']}`,
				'Content-Type': 'text/plain'
			},
			method: 'POST',
			body: payload_encrypted
		});
		return response;
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

	private async encrypt(plain: string): Promise<string> {
		return plain;
	}
}

export function getKycSingleton(...params: ConstructorParameters<typeof KYC>): KYC {
	if (!instance) instance = new KYC(...params);
	return instance;
}
