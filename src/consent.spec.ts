import { beforeAll, describe, expect, it } from 'vitest';
import { Consent, getConsentSingleton } from './consent.js';
import IHS from './ihs.js';

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

	it('get method should return Consent resource', async () => {
		const result = await consent.get(process.env.TEST_PATIENT_ID!);
		expect(result.resourceType === 'Consent').toBe(true);
	});

	it('get method should return OperationOutcome resource', async () => {
		const result = await consent.get('1');
		expect(result.resourceType === 'OperationOutcome').toBe(true);
	});

	it('update method should return Consent resource', async () => {
		const result = await consent.update({
			patientId: process.env.TEST_PATIENT_ID!,
			action: 'OPTIN',
			agent: process.env.TEST_AGENT_NAME!
		});
		expect(result.resourceType === 'Consent').toBe(true);
	});

	it('update method should return OperationOutcome resource', async () => {
		const result = await consent.update({
			patientId: '',
			action: 'OPTOUT',
			agent: ''
		});
		expect(result.resourceType === 'OperationOutcome').toBe(true);
	});
});
