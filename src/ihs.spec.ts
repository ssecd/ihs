import { describe, expect, it } from 'vitest';
import IHS, { AuthManager } from './ihs.js';

describe('ihs', () => {
	it('instance should be object and valid', () => {
		const ihs = new IHS();
		expect(ihs).toBeTypeOf('object');
		expect(ihs).toBeInstanceOf(IHS);
	});

	it('config must be valid from env file', () => {
		const ihs = new IHS();
		const config = ihs.config;
		expect(config).toBeTypeOf('object');
		expect(config.clientSecret).toBeDefined();
		expect(config.clientSecret).toBeTypeOf('string');
		expect(config.secretKey).toBeDefined();
		expect(config.secretKey).toBeTypeOf('string');
		expect(config.mode).toBe('development');
		expect(config.kycPemFile).toBe('publickey.dev.pem');
	});

	it('config kycPemFile should be valid between development and production', () => {
		const ihsDev = new IHS();
		expect(ihsDev.config.mode).toBe('development');
		expect(ihsDev.config.kycPemFile).toBe('publickey.dev.pem');

		const ihsProd = new IHS({ mode: 'production' });
		expect(ihsProd.config.mode).toBe('production');
		expect(ihsProd.config.kycPemFile).toBe('publickey.pem');
	});

	it('cached auth token should not be expired in expiration period', async () => {
		const ihs = new IHS();
		const authDetail = await ihs.auth();
		expect(authDetail['expires_in']).toBeDefined();
		expect(authDetail['expires_in']).toBeTypeOf('string');
		expect(+authDetail['expires_in']).toBeTypeOf('number');

		const delay = 0.5; //seconds
		const expiresIn = +authDetail['expires_in']; // 3599 seconds as this test written
		const anticipation = 300 + delay; // seconds
		const dateProvider = () => {
			const current = new Date();
			return new Date(current.getTime() + (expiresIn - anticipation) * 1000);
		};

		const authManager = new AuthManager(dateProvider);
		expect(authManager.isTokenExpired).toBe(true);

		authManager.authDetail = authDetail;
		expect(authManager.isTokenExpired).toBe(false);

		await new Promise((resolve) => setTimeout(resolve, delay * 1000));
		expect(authManager.isTokenExpired).toBe(true);
	});

	it('get patient resource should be return ok', async () => {
		const ihs = new IHS();
		const response = await ihs.fhir(`/Patient/${process.env.TEST_PATIENT_ID}`);
		expect(response.ok).toBe(true);

		const patient: fhir4.Patient = await response.json();
		expect(patient.resourceType === 'Patient').toBe(true);
	});
});
