import type { ZeroDegree } from '../client';

export const name = 'ready';
export const once = true;

export function execute(client: ZeroDegree) {
    console.log(`[Ready] Logged in as ${client.user?.tag}`);
    console.log(`[Ready] Serving ${client.guilds.cache.size} guild(s)`);
}
