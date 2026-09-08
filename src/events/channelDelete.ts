import { Events, AuditLogEvent, type DMChannel, type NonThreadGuildBasedChannel } from 'discord.js';
import { getRecentExecutor, handleSuspiciousAction } from '../utils/antinuke';

export const name = Events.ChannelDelete;
export const once = false;

export async function execute(channel: DMChannel | NonThreadGuildBasedChannel) {
    if (channel.isDMBased()) return;

    const executor = await getRecentExecutor(channel.guild, AuditLogEvent.ChannelDelete);
    if (!executor) return;

    await handleSuspiciousAction({ guild: channel.guild, actor: executor, actionType: 'channelDelete' });
}
