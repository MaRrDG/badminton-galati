import { SERVERS, type ServerName } from './servers';
import { stop } from './site';

/** Stops every preview a setup project started, also after an interrupted run (Ctrl-C). */
export default async function globalTeardown() {
  await Promise.all((Object.keys(SERVERS) as ServerName[]).map(stop));
}
