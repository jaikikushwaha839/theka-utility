import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types';
import { PremiumGuild } from '../../models/PremiumGuild';
import { buildConfirmEmbed } from '../../utils/embeds';
import { isDeveloper } from '../../config';

const NOT_DEV_MESSAGE = 'This command is restricted to bot developers.';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Manage premium status for this server.')
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('[Developer only] Grant premium to a server')
                .addStringOption((opt) => opt.setName('guild_id').setDescription('The server ID to grant premium to').setRequired(true))
                .addStringOption((opt) => opt.setName('note').setDescription('Internal note (e.g. who purchased, plan tier)'))
                .addIntegerOption((opt) => opt.setName('days').setDescription('Expires after this many days (omit for permanent)')),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('[Developer only] Revoke premium from a server')
                .addStringOption((opt) => opt.setName('guild_id').setDescription('The server ID to revoke premium from').setRequired(true)),
        )
        .addSubcommand((sub) => sub.setName('status').setDescription('Check this server\'s premium status'))
        // No setDefaultMemberPermissions here — dev-only status is global, not a per-guild
        // permission, so it's enforced in code below rather than through Discord's permission gate.
        .setDMPermission(false),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'status') {
            const entry = await PremiumGuild.findOne({ guildId: interaction.guild.id }).lean();
            const active = entry?.active && (!entry.expiresAt || entry.expiresAt.getTime() > Date.now());

            if (!active) {
                return interaction.reply({ embeds: [buildConfirmEmbed('This server does not have premium.')], ephemeral: true });
            }

            const expiry = entry?.expiresAt ? `expires <t:${Math.floor(entry.expiresAt.getTime() / 1000)}:R>` : 'no expiration';
            return interaction.reply({ embeds: [buildConfirmEmbed(`This server has premium (${expiry}).`)], ephemeral: true });
        }

        if (!isDeveloper(interaction.user.id)) {
            return interaction.reply({ embeds: [buildConfirmEmbed(NOT_DEV_MESSAGE, true)], ephemeral: true });
        }

        const guildId = interaction.options.getString('guild_id', true);

        if (sub === 'add') {
            const note = interaction.options.getString('note') ?? undefined;
            const days = interaction.options.getInteger('days');
            const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : undefined;

            await PremiumGuild.findOneAndUpdate(
                { guildId },
                { guildId, active: true, addedBy: interaction.user.id, note, expiresAt },
                { upsert: true },
            );

            const expiryText = expiresAt ? ` (expires in ${days} day${days === 1 ? '' : 's'})` : ' (permanent)';
            return interaction.reply({ embeds: [buildConfirmEmbed(`Granted premium to guild \`${guildId}\`${expiryText}.`)], ephemeral: true });
        }

        // remove
        const removed = await PremiumGuild.findOneAndUpdate({ guildId }, { active: false });
        if (!removed) {
            return interaction.reply({ embeds: [buildConfirmEmbed(`Guild \`${guildId}\` did not have a premium entry.`, true)], ephemeral: true });
        }
        return interaction.reply({ embeds: [buildConfirmEmbed(`Revoked premium from guild \`${guildId}\`.`)], ephemeral: true });
    },
};
