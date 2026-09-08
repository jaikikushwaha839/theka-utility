import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types';
import { AfkStatus } from '../../models/AfkStatus';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription("Mark yourself AFK — you'll be noted as away if someone mentions you.")
        .addStringOption((opt) => opt.setName('reason').setDescription('Why you\'re away').setMaxLength(200))
        .setDMPermission(false),

    async execute(interaction) {
        const reason = interaction.options.getString('reason') ?? 'AFK';

        await AfkStatus.findOneAndUpdate(
            { guildId: interaction.guild.id, userId: interaction.user.id },
            { guildId: interaction.guild.id, userId: interaction.user.id, reason, since: new Date() },
            { upsert: true },
        );

        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (member?.manageable && !member.nickname?.startsWith('[AFK] ')) {
            const base = member.nickname ?? member.user.username;
            await member.setNickname(`[AFK] ${base}`.slice(0, 32)).catch(() => null);
        }

        await interaction.reply({ embeds: [buildConfirmEmbed(`You're now AFK: ${reason}`)] });
    },
};
