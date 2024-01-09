import typescript from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions} */
export default {
	input: 'src/ihs.ts',
	output: {
		format: 'esm',
		dir: 'dist'
	},
	plugins: [typescript()],
	external: (id) => /^node:/i.test(id)
};
