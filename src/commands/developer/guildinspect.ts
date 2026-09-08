import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types';
import { buildConfirmEmbed } from '../../utils/embeds';
import { config, isDeveloper } from '../../config';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('guildinspect')
        .setDescription('[Developer only] Inspect a server the bot is in by ID.')
        .addStringOption((opt) => opt.setName('guild_id').setDescription('The server ID').setRequired(true))
        .setDMPermission(false),

    async execute(interaction) {
        if (!isDeveloper(interaction.user.id)) {
            return interaction.reply({ embeds: [buildConfirmEmbed('This command is restricted to bot developers.', true)], ephemeral: true });
        }

        const guildId = interaction.options.getString('guild_id', true);
        const guild = interaction.client.guilds.cache.get(guildId);

        if (!guild) {
            return interaction.reply({ embeds: [buildConfirmEmbed("The bot isn't in a server with that ID.", true)], ephemeral: true });
        }

        const owner = await guild.fetchOwner().catch(() => null);

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'ID', value: guild.id, inline: true },
                { name: 'Owner', value: owner ? `${owner.user.tag} (${owner.id})` : 'Unknown', inline: true },
                { name: 'Members', value: `${guild.memberCount}`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Boost tier', value: `${guild.premiumTier}`, inline: true },
                { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
                { name: 'Features', value: guild.features.length > 0 ? guild.features.join(', ') : 'None' },
            )
            .setFooter({ text: `Bot joined: ${guild.joinedAt?.toDateString() ?? 'unknown'}` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
