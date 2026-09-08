import type { Guild, User, TextChannel } from 'discord.js';
import { ModCase, getNextCaseId, type ModActionType } from '../models/ModCase';
import { GuildConfig } from '../models/GuildConfig';
import { buildModDmEmbeds, buildModLogEmbed } from './embeds';

interface LogModActionOpts {
    guild: Guild;
    type: ModActionType;
    target: User;
    moderator: User;
    reason: string;
    duration?: string;
    /** Set false to skip DMing the user (e.g. they've already left on a ban). */
    notifyUser?: boolean;
}

/**
 * Creates the case record, DMs the target (Dyno-style embeds), and posts
 * to the guild's configured mod-log channel if one is set.
 * Returns the created case, and whether the DM succeeded.
 */
export async function logModAction(opts: LogModActionOpts) {
    const caseId = await getNextCaseId(opts.guild.id);

    const modCase = await ModCase.create({
        guildId: opts.guild.id,
        caseId,
        type: opts.type,
        targetId: opts.target.id,
        targetTag: opts.target.tag,
        moderatorId: opts.moderator.id,
        moderatorTag: opts.moderator.tag,
        reason: opts.reason,
        duration: opts.duration,
    });

    let dmSent = true;
    if (opts.notifyUser !== false) {
        try {
            const dm = await opts.target.createDM();
            const embeds = buildModDmEmbeds({
                type: opts.type,
                guild: opts.guild,
                reason: opts.reason,
                duration: opts.duration,
                caseId,
            });
            await dm.send({ embeds });
        } catch {
            // User has DMs closed or blocked the bot — not fatal.
            dmSent = false;
        }
    }

    const guildConfig = await GuildConfig.findOne({ guildId: opts.guild.id }).lean();
    if (guildConfig?.modLogChannelId) {
        const channel = opts.guild.channels.cache.get(guildConfig.modLogChannelId) as TextChannel | undefined;
        if (channel?.isTextBased()) {
            const logEmbed = buildModLogEmbed({
                type: opts.type,
                targetTag: opts.target.tag,
                targetId: opts.target.id,
                moderatorTag: opts.moderator.tag,
                reason: opts.reason,
                duration: opts.duration,
                caseId,
            });
            await channel.send({ embeds: [logEmbed] }).catch(() => null);
        }
    }

    return { modCase, dmSent };
}
