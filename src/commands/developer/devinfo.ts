import { SlashCommandBuilder, EmbedBuilder, version as djsVersion } from 'discord.js';
import type { Command } from '../../types';
import { config } from '../../config';

function formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`, `${secs}s`].filter(Boolean).join(' ');
}

export const command: Command = {
    data: new SlashCommandBuilder().setName('devinfo').setDescription('Show bot stats and developer info.'),

    async execute(interaction) {
        const client = interaction.client;
        const uptimeMs = Date.now() - config.startedAt;
        const memoryMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

        const devMentions = config.devIds.length > 0 ? config.devIds.map((id) => `<@${id}>`).join(', ') : 'Not configured';

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setAuthor({ name: client.user?.tag ?? 'Bot', iconURL: client.user?.displayAvatarURL() })
            .setDescription('A powerful all-in-one Discord bot providing moderation, modmail, utility, AutoMod, and server protection.')
            .addFields(
                { name: 'Developer(s)', value: devMentions, inline: true },
                { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
                { name: 'Uptime', value: formatUptime(uptimeMs), inline: true },
                { name: 'discord.js', value: djsVersion, inline: true },
                { name: 'Node.js', value: process.version, inline: true },
                { name: 'Memory', value: `${memoryMb} MB`, inline: true },
            )
             .setFooter({
                text: `Requested by ${interaction.user.username} • ${new Date().toLocaleTimeString()}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.reply({ embeds: [embed] });
    },
};
