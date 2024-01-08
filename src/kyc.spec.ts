import { beforeAll, describe, expect, it } from 'vitest';
import { KYC, getKycSingleton } from './kyc.js';
import IHS from './ihs.js';

let kyc: KYC;

beforeAll(() => {
	const ihs = new IHS();
	kyc = getKycSingleton(ihs);
});

describe('kyc', () => {
	it('instance should be object and valid', async () => {
		expect(kyc).toBeTypeOf('object');
		expect(kyc).toBeInstanceOf(KYC);
	});

	it('generate validation url', async () => {
		const result = await kyc.generateValidationUrl({
			name: 'Example Agent',
			nik: '1673000000000001'
		});
		console.log(result);
		expect(result).contains('ENCRYPTED');
	});
});
