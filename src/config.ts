import 'dotenv/config';

function required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required env var: ${name}`);
    return value;
}

export const config = {
    token: required('DISCORD_TOKEN'),
    clientId: required('CLIENT_ID'),
    mongoUri: required('MONGODB_URI'),
    guildId: process.env.GUILD_ID || undefined, // for instant guild-scoped command deploys
    embedColor: `#${process.env.EMBED_COLOR || 'ED4245'}` as `#${string}`,
    // Comma-separated Discord user IDs allowed to run developer-only commands (/premium add|remove, full /devinfo)
    devIds: (process.env.DEV_IDS || '').split(',').map((id) => id.trim()).filter(Boolean),
    startedAt: Date.now(),
};

export function isDeveloper(userId: string): boolean {
    return config.devIds.includes(userId);
}
