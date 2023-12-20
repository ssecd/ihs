import { describe, expect, it } from 'vitest';
import { MODULE_NAME } from './index.js';

describe('index', () => {
	it('module name valid', () => {
		expect(MODULE_NAME).toBe('ihs');
	});
});
