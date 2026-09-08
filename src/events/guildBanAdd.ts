import { Events, AuditLogEvent, type GuildBan } from 'discord.js';
import { getRecentExecutor, handleSuspiciousAction } from '../utils/antinuke';

export const name = Events.GuildBanAdd;
export const once = false;

export async function execute(ban: GuildBan) {
    const executor = await getRecentExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
    if (!executor) return;

    await handleSuspiciousAction({ guild: ban.guild, actor: executor, actionType: 'ban' });
}
