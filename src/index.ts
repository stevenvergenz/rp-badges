import { resolve } from 'path';
import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import App from './app';

process.on('uncaughtException', ex => MRE.log.error('app', ex.message));
process.on('unhandledRejection', err => MRE.log.error('app', err));

const server = new MRE.WebHost({
	baseDir: resolve(__dirname, '..', 'public')
});

server.adapter.onConnection(context => new App(context, server.baseUrl));
