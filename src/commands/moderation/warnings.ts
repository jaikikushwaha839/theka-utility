import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types';
import { ModCase } from '../../models/ModCase';
import { buildConfirmEmbed } from '../../utils/embeds';
import { config } from '../../config';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription("View a member's warning history.")
        .addUserOption((opt) => opt.setName('user').setDescription('The member to look up').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user', true);

        const warns = await ModCase.find({
            guildId: interaction.guild.id,
            targetId: target.id,
            type: 'warn',
            active: true,
        })
            .sort({ createdAt: -1 })
            .limit(25)
            .lean();

        if (warns.length === 0) {
            return interaction.reply({ embeds: [buildConfirmEmbed(`**${target.tag}** has no active warnings.`)], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(`Warnings for ${target.tag}`)
            .setDescription(
                warns
                    .map((w) => `**Case #${w.caseId}** — ${w.reason}\nby ${w.moderatorTag} • <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`)
                    .join('\n\n'),
            )
            .setFooter({ text: `${warns.length} active warning${warns.length === 1 ? '' : 's'}` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
