import { beforeAll, describe, expect, it } from 'vitest';
import { KYC, getKycSingleton } from './kyc.js';
import { IHS } from './ihs.js';

let kyc: KYC;

beforeAll(() => {
	const ihs = new IHS();
	kyc = getKycSingleton(ihs);
});

describe('consent', () => {
	it('instance should be object and valid', async () => {
		expect(kyc).toBeTypeOf('object');
		expect(kyc).toBeInstanceOf(KYC);
	});
});
