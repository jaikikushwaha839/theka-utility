import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types';
import { logModAction } from '../../utils/modAction';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member. They will be DMed with the reason.')
        .addUserOption((opt) => opt.setName('user').setDescription('The member to warn').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) {
            return interaction.reply({ embeds: [buildConfirmEmbed('That user is not in this server.', true)], ephemeral: true });
        }
        if (!member.moderatable) {
            return interaction.reply({ embeds: [buildConfirmEmbed('I cannot moderate that user (role hierarchy).', true)], ephemeral: true });
        }

        const { modCase, dmSent } = await logModAction({
            guild: interaction.guild,
            type: 'warn',
            target,
            moderator: interaction.user,
            reason,
        });

        const note = dmSent ? '' : ' (could not DM the user)';
        await interaction.reply({
            embeds: [buildConfirmEmbed(`Warned **${target.tag}** — Case #${modCase.caseId}${note}`)],
        });
    },
};
