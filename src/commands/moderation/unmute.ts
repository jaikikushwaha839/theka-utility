import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types';
import { logModAction } from '../../utils/modAction';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove an active timeout from a member.')
        .addUserOption((opt) => opt.setName('user').setDescription('The member to unmute').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the unmute'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) {
            return interaction.reply({ embeds: [buildConfirmEmbed('That user is not in this server.', true)], ephemeral: true });
        }
        if (!member.isCommunicationDisabled()) {
            return interaction.reply({ embeds: [buildConfirmEmbed('That user is not currently muted.', true)], ephemeral: true });
        }

        await member.timeout(null, reason);

        const { modCase } = await logModAction({
            guild: interaction.guild,
            type: 'unmute',
            target,
            moderator: interaction.user,
            reason,
            notifyUser: false,
        });

        await interaction.reply({
            embeds: [buildConfirmEmbed(`Unmuted **${target.tag}** — Case #${modCase.caseId}`)],
        });
    },
};
