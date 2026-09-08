import { SlashCommandBuilder, EmbedBuilder, ChannelType, type TextChannel } from 'discord.js';
import type { Command } from '../../types';
import { config } from '../../config';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('channelinfo')
        .setDescription('Show information about a channel.')
        .addChannelOption((opt) => opt.setName('channel').setDescription('The channel to look up (defaults to this one)'))
        .setDMPermission(false),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') ?? interaction.channel;

        if (!channel) {
            return interaction.reply({ embeds: [buildConfirmEmbed('Could not resolve that channel.', true)], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(`#${'name' in channel ? channel.name : 'unknown'}`)
            .addFields(
                { name: 'ID', value: channel.id, inline: true },
                { name: 'Type', value: ChannelType[channel.type] ?? `${channel.type}`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(channel.createdTimestamp! / 1000)}:R>`, inline: true },
            );

        if ('parent' in channel && channel.parent) {
            embed.addFields({ name: 'Category', value: channel.parent.name, inline: true });
        }
        if ('topic' in channel && channel.topic) {
            embed.addFields({ name: 'Topic', value: channel.topic });
        }
        if ('rateLimitPerUser' in channel && (channel as TextChannel).rateLimitPerUser) {
            embed.addFields({ name: 'Slowmode', value: `${(channel as TextChannel).rateLimitPerUser}s`, inline: true });
        }
        if ('position' in channel) {
            embed.addFields({ name: 'Position', value: `${channel.position}`, inline: true });
        }

        await interaction.reply({ embeds: [embed] });
    },
};
