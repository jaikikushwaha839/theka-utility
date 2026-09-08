import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('nick')
        .setDescription("Change (or reset) a member's nickname.")
        .addUserOption((opt) => opt.setName('user').setDescription('The member to update').setRequired(true))
        .addStringOption((opt) => opt.setName('nickname').setDescription('New nickname (omit to reset to their username)').setMaxLength(32))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user', true);
        const nickname = interaction.options.getString('nickname');

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) {
            return interaction.reply({ embeds: [buildConfirmEmbed('That user is not in this server.', true)], ephemeral: true });
        }
        if (!member.manageable) {
            return interaction.reply({ embeds: [buildConfirmEmbed('I cannot change that member\'s nickname (role hierarchy).', true)], ephemeral: true });
        }

        await member.setNickname(nickname);

        const msg = nickname ? `Nickname for **${target.tag}** set to **${nickname}**.` : `Nickname for **${target.tag}** reset.`;
        await interaction.reply({ embeds: [buildConfirmEmbed(msg)] });
    },
};
