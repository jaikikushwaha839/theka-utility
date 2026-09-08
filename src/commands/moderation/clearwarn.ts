import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types';
import { ModCase } from '../../models/ModCase';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('clearwarn')
        .setDescription('Deactivate a specific warning case.')
        .addIntegerOption((opt) => opt.setName('case_id').setDescription('The case number to clear').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const caseId = interaction.options.getInteger('case_id', true);

        const modCase = await ModCase.findOne({ guildId: interaction.guild.id, caseId, type: 'warn' });
        if (!modCase) {
            return interaction.reply({ embeds: [buildConfirmEmbed(`No warning found with Case #${caseId}.`, true)], ephemeral: true });
        }
        if (!modCase.active) {
            return interaction.reply({ embeds: [buildConfirmEmbed(`Case #${caseId} is already cleared.`, true)], ephemeral: true });
        }

        modCase.active = false;
        await modCase.save();

        await interaction.reply({
            embeds: [buildConfirmEmbed(`Cleared warning Case #${caseId} for **${modCase.targetTag}**.`)],
        });
    },
};
