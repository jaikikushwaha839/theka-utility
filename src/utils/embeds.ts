import { EmbedBuilder, type Guild } from 'discord.js';
import { config } from '../config';
import type { ModActionType } from '../models/ModCase';

const ACTION_VERBS: Record<ModActionType, string> = {
    warn: 'warned',
    kick: 'kicked from',
    ban: 'banned from',
    unban: 'unbanned from',
    mute: 'muted in',
    unmute: 'unmuted in',
};

/**
 * Builds the two-embed DM payload matching Dyno's look:
 * a colored "You were X in <server>" card, plus a plain
 * grey "Message from server: <name>" card underneath.
 */
export function buildModDmEmbeds(opts: {
    type: ModActionType;
    guild: Guild;
    reason: string;
    duration?: string;
    caseId: number;
}) {
    const verb = ACTION_VERBS[opts.type];
    const durationText = opts.duration ? ` for ${opts.duration}` : '';

    const actionEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setDescription(`You were ${verb} **${opts.guild.name}**${durationText} for ${opts.reason}`)
        .setFooter({ text: `Case #${opts.caseId}` })
        .setTimestamp();

    const sourceEmbed = new EmbedBuilder()
        .setColor(null)
        .setDescription(`Message from server: **${opts.guild.name}**`);

    return [actionEmbed, sourceEmbed];
}

/** Embed posted in the server's mod-log channel. */
export function buildModLogEmbed(opts: {
    type: ModActionType;
    targetTag: string;
    targetId: string;
    moderatorTag: string;
    reason: string;
    duration?: string;
    caseId: number;
}) {
    return new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`Case #${opts.caseId} • ${opts.type.toUpperCase()}`)
        .addFields(
            { name: 'User', value: `${opts.targetTag} (${opts.targetId})`, inline: true },
            { name: 'Moderator', value: opts.moderatorTag, inline: true },
            { name: 'Reason', value: opts.reason },
            ...(opts.duration ? [{ name: 'Duration', value: opts.duration, inline: true }] : []),
        )
        .setTimestamp();
}

/** Simple success/error confirmation shown in-channel to the moderator. */
export function buildConfirmEmbed(message: string, isError = false) {
    return new EmbedBuilder()
        .setColor(isError ? '#ED4245' : '#57F287')
        .setDescription(message);
}
