import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types';
import { logModAction } from '../../utils/modAction';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server.')
        .addUserOption((opt) => opt.setName('user').setDescription('The member to kick').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the kick').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) {
            return interaction.reply({ embeds: [buildConfirmEmbed('That user is not in this server.', true)], ephemeral: true });
        }
        if (!member.kickable) {
            return interaction.reply({ embeds: [buildConfirmEmbed('I cannot kick that user (role hierarchy or missing permission).', true)], ephemeral: true });
        }

        // DM before kicking — once they're removed, the bot may lose the ability to open a DM.
        const { modCase, dmSent } = await logModAction({
            guild: interaction.guild,
            type: 'kick',
            target,
            moderator: interaction.user,
            reason,
        });

        await member.kick(reason);

        const note = dmSent ? '' : ' (could not DM the user)';
        await interaction.reply({
            embeds: [buildConfirmEmbed(`Kicked **${target.tag}** — Case #${modCase.caseId}${note}`)],
        });
    },
};
