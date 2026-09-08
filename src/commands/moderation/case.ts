import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types';
import { ModCase } from '../../models/ModCase';
import { buildConfirmEmbed } from '../../utils/embeds';
import { config } from '../../config';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('case')
        .setDescription('View details of a specific moderation case.')
        .addIntegerOption((opt) => opt.setName('case_id').setDescription('The case number').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const caseId = interaction.options.getInteger('case_id', true);
        const modCase = await ModCase.findOne({ guildId: interaction.guild.id, caseId }).lean();

        if (!modCase) {
            return interaction.reply({ embeds: [buildConfirmEmbed(`No case found with ID #${caseId}.`, true)], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(`Case #${modCase.caseId} • ${modCase.type.toUpperCase()}`)
            .addFields(
                { name: 'User', value: `${modCase.targetTag} (${modCase.targetId})`, inline: true },
                { name: 'Moderator', value: modCase.moderatorTag, inline: true },
                { name: 'Status', value: modCase.active ? 'Active' : 'Cleared/reversed', inline: true },
                { name: 'Reason', value: modCase.reason },
                ...(modCase.duration ? [{ name: 'Duration', value: modCase.duration, inline: true }] : []),
            )
            .setTimestamp(modCase.createdAt);

        await interaction.reply({ embeds: [embed] });
    },
};
