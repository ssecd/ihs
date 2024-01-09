import { describe, expect, it } from 'vitest';
import IHS from './ihs.js';

describe('index', () => {
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
});
