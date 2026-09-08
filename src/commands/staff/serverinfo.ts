import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types';
import { config } from '../../config';

export const command: Command = {
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('Show information about this server.').setDMPermission(false),

    async execute(interaction) {
        const guild = interaction.guild;
        await guild.fetch(); // refresh cache (member count, boost info)

        const owner = await guild.fetchOwner().catch(() => null);
        const channelCount = guild.channels.cache.size;
        const roleCount = guild.roles.cache.size;

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
                { name: 'Server ID', value: guild.id, inline: true },
                { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Members', value: `${guild.memberCount}`, inline: true },
                { name: 'Channels', value: `${channelCount}`, inline: true },
                { name: 'Roles', value: `${roleCount}`, inline: true },
                { name: 'Boost tier', value: `${guild.premiumTier}`, inline: true },
                { name: 'Boosts', value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true },
                { name: 'Verification level', value: `${guild.verificationLevel}`, inline: true },
            );

        await interaction.reply({ embeds: [embed] });
    },
};
