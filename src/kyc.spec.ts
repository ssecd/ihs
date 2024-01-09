import { beforeAll, describe, expect, it } from 'vitest';
import IHS from './ihs.js';
import { KYC, KycValidationUrlData, KycVerificationCodeData, getKycSingleton } from './kyc.js';

let kyc: KYC;

beforeAll(() => {
	const ihs = new IHS();
	kyc = getKycSingleton(ihs);
});

describe('kyc', () => {
	it('instance should be object and valid KYC instance', async () => {
		expect(kyc).toBeTypeOf('object');
		expect(kyc).toBeInstanceOf(KYC);
	});

	it('generate validation url should return data with agent, token, and url', async () => {
		const agent = {
			name: process.env.TEST_AGENT_NAME!,
			nik: process.env.TEST_AGENT_NIK!
		};
		const result = await kyc.generateValidationUrl(agent);
		const data = result.data as KycValidationUrlData;
		expect(data.agent_name).toBe(agent.name);
		expect(data.agent_nik).toBe(agent.nik);
		expect(data.token).toBeTypeOf('string');
		expect(/^(http|https):\/\/[^ "]+$/.test(data.url)).toBe(true);
	});

	it('generate validation url should return data with error property', async () => {
		const result = await kyc.generateValidationUrl({ name: '', nik: '' });
		expect('error' in result.data).toBe(true);
	});

	it('generate verification code should return data with patient and challenge code', async () => {
		const patient = {
			name: process.env.TEST_PATIENT_NAME!,
			nik: process.env.TEST_PATIENT_NIK!
		};
		const result = await kyc.generateVerificationCode(patient);
		const data = result.data as KycVerificationCodeData;
		expect(data.nik).toBe(patient.nik);
		expect(data.name).toBe(patient.name);
		expect(data.ihs_number).toBeTypeOf('string');
		expect(data.challenge_code).toBeTypeOf('string');
		expect(data.created_timestamp).toBeTypeOf('string');
		expect(data.expired_timestamp).toBeTypeOf('string');
	});

	it('generate verification code should return data with error property', async () => {
		const result = await kyc.generateVerificationCode({ name: '', nik: '' });
		expect('error' in result.data).toBe(true);
	});
});
