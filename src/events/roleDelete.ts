import { Events, AuditLogEvent, type Role } from 'discord.js';
import { getRecentExecutor, handleSuspiciousAction } from '../utils/antinuke';

export const name = Events.GuildRoleDelete;
export const once = false;

export async function execute(role: Role) {
    const executor = await getRecentExecutor(role.guild, AuditLogEvent.RoleDelete);
    if (!executor) return;

    await handleSuspiciousAction({ guild: role.guild, actor: executor, actionType: 'roleDelete' });
}
