import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types';
import { logModAction } from '../../utils/modAction';
import { buildConfirmEmbed } from '../../utils/embeds';

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000; // Discord's hard cap

function parseDuration(duration: string): number | null {
    const match = duration.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(s|m|h|d|w)$/);

    if (!match) {
        return null;
    }

    const value = Number(match[1]);
    const unit = match[2];

    if (!Number.isFinite(value) || value <= 0) {
        return null;
    }

    const multipliers: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
}

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout a member for a duration (e.g. 10m, 1h, 7d).')
        .addUserOption((opt) =>
            opt
                .setName('user')
                .setDescription('The member to mute')
                .setRequired(true)
        )
        .addStringOption((opt) =>
            opt
                .setName('duration')
                .setDescription('e.g. 10m, 1h, 7d (max 28d)')
                .setRequired(true)
        )
        .addStringOption((opt) =>
            opt
                .setName('reason')
                .setDescription('Reason for the mute')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user', true);
        const durationStr = interaction.options.getString('duration', true);
        const reason = interaction.options.getString('reason', true);

        const durationMs = parseDuration(durationStr);

        if (durationMs === null || durationMs <= 0) {
            return interaction.reply({
                embeds: [
                    buildConfirmEmbed(
                        'Invalid duration. Try something like `10m`, `1h`, or `7d`.',
                        true
                    ),
                ],
                ephemeral: true,
            });
        }

        if (durationMs > MAX_TIMEOUT_MS) {
            return interaction.reply({
                embeds: [
                    buildConfirmEmbed(
                        'Duration cannot exceed 28 days.',
                        true
                    ),
                ],
                ephemeral: true,
            });
        }

        const member = await interaction.guild.members
            .fetch(target.id)
            .catch(() => null);

        if (!member) {
            return interaction.reply({
                embeds: [
                    buildConfirmEmbed(
                        'That user is not in this server.',
                        true
                    ),
                ],
                ephemeral: true,
            });
        }

        if (!member.moderatable) {
            return interaction.reply({
                embeds: [
                    buildConfirmEmbed(
                        'I cannot mute that user (role hierarchy).',
                        true
                    ),
                ],
                ephemeral: true,
            });
        }

        await member.timeout(durationMs, reason);

        const { modCase, dmSent } = await logModAction({
            guild: interaction.guild,
            type: 'mute',
            target,
            moderator: interaction.user,
            reason,
            duration: durationStr,
        });

        const note = dmSent ? '' : ' (could not DM the user)';

        await interaction.reply({
            embeds: [
                buildConfirmEmbed(
                    `Muted **${target.tag}** for ${durationStr} — Case #${modCase.caseId}${note}`
                ),
            ],
        });
    },
};