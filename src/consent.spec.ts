import { beforeAll, describe, expect, it } from 'vitest';
import { Consent, getConsentSingleton } from './consent.js';
import { IHS } from './ihs.js';

let consent: Consent;

beforeAll(() => {
	const ihs = new IHS();
	consent = getConsentSingleton(ihs);
});

describe('consent', () => {
	it('instance should be object and valid', async () => {
		expect(consent).toBeTypeOf('object');
		expect(consent).toBeInstanceOf(Consent);
	});
});
