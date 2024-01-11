import { describe, expect, it } from 'vitest';
import IHS, { AuthDetail, DefaultAuthStore, IHSConfig } from './ihs.js';

describe('ihs', () => {
	it('instance should be object and valid instance', () => {
		const ihs = new IHS();
		expect(ihs).toBeTypeOf('object');
		expect(ihs).toBeInstanceOf(IHS);
	});

	it('config should be valid from env file', async () => {
		const ihs = new IHS();
		const config = await ihs.getConfig();
		expect(config).toBeTypeOf('object');
		expect(config.clientSecret).toBeDefined();
		expect(config.clientSecret).toBeTypeOf('string');
		expect(config.secretKey).toBeDefined();
		expect(config.secretKey).toBeTypeOf('string');
		expect(config.mode).toBe('development');
		expect(config.kycPemFile).toBe('publickey.dev.pem');
	});

	it('config should be valid from async config', async () => {
		const userConfig: Partial<IHSConfig> = {
			clientSecret: 'th3-53cREt',
			secretKey: 'th3_keY',
			kycPemFile: 'server-key.pem',
			mode: 'development'
		};

		const ihs = new IHS(async () => {
			return new Promise((resolve) => {
				setTimeout(() => resolve({ ...userConfig }), 100);
			});
		});

		const config = await ihs.getConfig();
		expect(config).toEqual(userConfig);
	});

	it('config kycPemFile should be valid between development and production', async () => {
		const ihsDev = new IHS();
		const devConfig = await ihsDev.getConfig();
		expect(devConfig.mode).toBe('development');
		expect(devConfig.kycPemFile).toBe('publickey.dev.pem');

		const ihsProd = new IHS({ mode: 'production' });
		const prodConfig = await ihsProd.getConfig();
		expect(prodConfig.mode).toBe('production');
		expect(prodConfig.kycPemFile).toBe('publickey.pem');
	});

	it('the DefaultAuthStore should store and handle expiration correctly', async () => {
		const store = new DefaultAuthStore();
		expect(store.get()).toBeFalsy();

		const delay = 1; // seconds
		const expiresIn = 3599; // IHS expiration in seconds as this test written
		const issuedAt = Date.now() - (expiresIn - (store.ANTICIPATION + delay)) * 1000;
		const authDetail = {
			issued_at: String(issuedAt),
			expires_in: String(expiresIn)
		} as AuthDetail;

		store.set(authDetail);
		expect(store.get()).toBeDefined();
		expect(store.get()).toEqual(authDetail);

		await new Promise((resolve) => setTimeout(resolve, delay * 1000));
		expect(store.get()).toBeUndefined();
	});

	it('get patient resource should be return ok', async () => {
		const ihs = new IHS();
		const response = await ihs.fhir(`/Patient/${process.env.TEST_PATIENT_ID}`);
		expect(response.ok).toBe(true);

		const patient: fhir4.Patient = await response.json();
		expect(patient.resourceType === 'Patient').toBe(true);
	});
});
