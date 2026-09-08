import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types';
import { logModAction } from '../../utils/modAction';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server.')
        .addUserOption((opt) => opt.setName('user').setDescription('The member to ban').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the ban').setRequired(true))
        .addIntegerOption((opt) =>
            opt
                .setName('delete_days')
                .setDescription('Days of message history to delete (0-7)')
                .setMinValue(0)
                .setMaxValue(7),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);
        const deleteDays = interaction.options.getInteger('delete_days') ?? 0;

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (member && !member.bannable) {
            return interaction.reply({ embeds: [buildConfirmEmbed('I cannot ban that user (role hierarchy or missing permission).', true)], ephemeral: true });
        }

        // DM before the ban goes through, since the bot won't share a guild with them afterward.
        const { modCase, dmSent } = await logModAction({
            guild: interaction.guild,
            type: 'ban',
            target,
            moderator: interaction.user,
            reason,
        });

        await interaction.guild.members.ban(target.id, {
            reason,
            deleteMessageSeconds: deleteDays * 86400,
        });

        const note = dmSent ? '' : ' (could not DM the user)';
        await interaction.reply({
            embeds: [buildConfirmEmbed(`Banned **${target.tag}** — Case #${modCase.caseId}${note}`)],
        });
    },
};
