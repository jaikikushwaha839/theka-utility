import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types';
import { config } from '../../config';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Show information about a member.')
        .addUserOption((opt) => opt.setName('user').setDescription('The member to look up (defaults to you)'))
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            return interaction.reply({ embeds: [buildConfirmEmbed('That user is not in this server.', true)], ephemeral: true });
        }

        const roles = member.roles.cache.filter((r) => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position);
        const roleText = roles.size > 0 ? roles.map((r) => `<@&${r.id}>`).join(' ') : 'None';

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: 'User ID', value: target.id, inline: true },
                { name: 'Nickname', value: member.nickname ?? 'None', inline: true },
                { name: 'Bot', value: target.bot ? 'Yes' : 'No', inline: true },
                { name: 'Account created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Joined server', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                { name: 'Boosting since', value: member.premiumSinceTimestamp ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : 'Not boosting', inline: true },
                { name: `Roles [${roles.size}]`, value: roleText.length > 1024 ? `${roles.size} roles` : roleText },
            );

        await interaction.reply({ embeds: [embed] });
    },
};
