import { beforeAll, describe, expect, it } from 'vitest';
import IHS from './ihs.js';
import { getKFASingleton, KFA } from './kfa.js';

let kfa: KFA;

beforeAll(() => {
	const ihs = new IHS();
	kfa = getKFASingleton(ihs);
});

describe('kfa', () => {
	it('instance should be object and valid', async () => {
		expect(kfa).toBeTypeOf('object');
		expect(kfa).toBeInstanceOf(KFA);
	});

	it('get price jkn', async () => {
		const result = await kfa.getPriceJKN({ kfaCode: '' });
		expect(result.error).toBe(false);
	});
});
