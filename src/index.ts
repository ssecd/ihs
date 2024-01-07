import { IHS, IHSConfig } from './ihs.js';

let instance: IHS | undefined;

export function initIHS(config?: IHSConfig): IHS {
	if (!instance) instance = new IHS(config);
	return instance;
}

export { IHS, IHSConfig };
