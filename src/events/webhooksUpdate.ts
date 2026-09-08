import { Events, AuditLogEvent, type TextChannel } from 'discord.js';
import { getRecentExecutor, handleSuspiciousAction } from '../utils/antinuke';

export const name = Events.WebhooksUpdate;
export const once = false;

// Fires whenever a webhook in the channel is created, updated, or deleted —
// we only care about creation here, so the audit log lookup itself is what
// filters for that (a fresh MATCHING entry within the last few seconds).
export async function execute(channel: TextChannel) {
    const executor = await getRecentExecutor(channel.guild, AuditLogEvent.WebhookCreate);
    if (!executor) return;

    await handleSuspiciousAction({ guild: channel.guild, actor: executor, actionType: 'webhookCreate' });
}
