import {
    SlashCommandBuilder,
    EmbedBuilder,
} from 'discord.js';

import type { Command } from '../../types';
import { config } from '../../config';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription("Check the bot's latency and performance."),

    async execute(interaction) {
        const start = Date.now();

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.embedColor)
                    .setDescription('**Pinging...**'),
            ],
        });

        const sent = await interaction.fetchReply();

        const botLatency =
            sent.createdTimestamp - interaction.createdTimestamp;

        const wsPing = interaction.client.ws.ping;

        // Determine status automatically
        const status =
            botLatency < 100
                ? 'Excellent'
                : botLatency < 250
                ? 'Good'
                : botLatency < 500
                ? 'Average'
                : 'Poor';

        // Calculate uptime
        const uptimeMs = interaction.client.uptime;

        const seconds = Math.floor(uptimeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        const uptime =
            days > 0
                ? `${days}d ${hours % 24}h`
                : hours > 0
                ? `${hours}h ${minutes % 60}m`
                : minutes > 0
                ? `${minutes}m ${seconds % 60}s`
                : `${seconds}s`;

        // Memory usage
        const memory = Math.round(
            process.memoryUsage().rss / 1024 / 1024
        );

        // Server count
        const servers = interaction.client.guilds.cache.size;

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setDescription(
                `**Pong!**\n\n` +

                `**Latency Information**\n\n` +

                `**Bot Latency**\n` +

                `\`${botLatency}ms\`\n\n` +

                `**WebSocket Ping**\n` +

                `\`${wsPing}ms\`\n\n` +

                `**Status**\n` +

                `\`${status}\`\n\n` +

                `**Performance**\n\n` +

                `**Uptime:** ${uptime} ` +

                `**Memory:** ${memory}MB ` +
                
                `**Servers:** ${servers}`
            )
            .setThumbnail(
                interaction.client.user.displayAvatarURL()
            )
            .setFooter({
                text: `Requested by ${interaction.user.username} • ${new Date().toLocaleTimeString()}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.editReply({
            embeds: [embed],
        });
    },
};