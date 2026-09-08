import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types';
import { ModCase } from '../../models/ModCase';
import { config } from '../../config';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('modstats')
        .setDescription('Show moderation action counts, optionally for one moderator.')
        .addUserOption((opt) => opt.setName('moderator').setDescription('Filter to one moderator'))
        .addIntegerOption((opt) => opt.setName('days').setDescription('Look back this many days (default 30)').setMinValue(1).setMaxValue(365))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const moderator = interaction.options.getUser('moderator');
        const days = interaction.options.getInteger('days') ?? 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const filter: Record<string, unknown> = { guildId: interaction.guild.id, createdAt: { $gte: since } };
        if (moderator) filter.moderatorId = moderator.id;

        const cases = await ModCase.find(filter).lean();
        if (cases.length === 0) {
            return interaction.reply({ embeds: [buildConfirmEmbed(`No moderation actions in the last ${days} day(s).`)], ephemeral: true });
        }

        if (moderator) {
            const counts: Record<string, number> = {};
            for (const c of cases) counts[c.type] = (counts[c.type] ?? 0) + 1;

            const embed = new EmbedBuilder()
                .setColor(config.embedColor)
                .setTitle(`Mod stats — ${moderator.tag}`)
                .setDescription(Object.entries(counts).map(([type, n]) => `**${type}**: ${n}`).join('\n'))
                .setFooter({ text: `Last ${days} day(s) • ${cases.length} total actions` });

            return interaction.reply({ embeds: [embed] });
        }

        // leaderboard across all moderators
        const perMod: Record<string, { tag: string; count: number }> = {};
        for (const c of cases) {
            perMod[c.moderatorId] ??= { tag: c.moderatorTag, count: 0 };
            perMod[c.moderatorId].count += 1;
        }
        const leaderboard = Object.values(perMod).sort((a, b) => b.count - a.count).slice(0, 15);

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle('Mod stats — leaderboard')
            .setDescription(leaderboard.map((m, i) => `**${i + 1}.** ${m.tag} — ${m.count}`).join('\n'))
            .setFooter({ text: `Last ${days} day(s) • ${cases.length} total actions` });

        await interaction.reply({ embeds: [embed] });
    },
};
