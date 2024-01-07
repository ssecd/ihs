import { beforeAll, describe, expect, it } from 'vitest';
import { IHS, initIHS } from './index.js';

let ihs: IHS;

beforeAll(() => {
	ihs = initIHS();
});

describe('index', () => {
	it('instance should be object and valid', async () => {
		expect(ihs).toBeTypeOf('object');
		expect(ihs).toBeInstanceOf(IHS);
	});

	it('config must be valid from env file', async () => {
		const config = ihs.config;
		expect(config).toBeTypeOf('object');
		expect(config.clientSecret).toBeDefined();
		expect(config.clientSecret).toBeTypeOf('string');
		expect(config.secretKey).toBeDefined();
		expect(config.secretKey).toBeTypeOf('string');
		expect(config.mode).toBe('development');
	});
});
