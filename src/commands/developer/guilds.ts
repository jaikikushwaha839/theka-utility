import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types';
import { buildConfirmEmbed } from '../../utils/embeds';
import { config, isDeveloper } from '../../config';

export const command: Command = {
    data: new SlashCommandBuilder().setName('guilds').setDescription('[Developer only] List every server the bot is in.').setDMPermission(false),

    async execute(interaction) {
        if (!isDeveloper(interaction.user.id)) {
            return interaction.reply({ embeds: [buildConfirmEmbed('This command is restricted to bot developers.', true)], ephemeral: true });
        }

        const guilds = [...interaction.client.guilds.cache.values()].sort((a, b) => b.memberCount - a.memberCount).slice(0, 25);

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(`Servers (${interaction.client.guilds.cache.size} total, showing top 25 by size)`)
            .setDescription(guilds.map((g) => `**${g.name}** — \`${g.id}\` — ${g.memberCount} members`).join('\n'));

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
