import { beforeAll, describe, expect, it } from 'vitest';
import IHS from './ihs.js';
import { KYC, KycValidationUrlData, getKycSingleton } from './kyc.js';

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
		console.log(result);

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
});
