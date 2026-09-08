import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, type TextChannel } from 'discord.js';
import type { Command } from '../../types';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode (per-user rate limit) for a channel.')
        .addIntegerOption((opt) =>
            opt.setName('seconds').setDescription('Seconds between messages (0 to disable, max 21600)').setMinValue(0).setMaxValue(21600).setRequired(true),
        )
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to set (defaults to this one)').addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        const seconds = interaction.options.getInteger('seconds', true);
        const channel = (interaction.options.getChannel('channel') as TextChannel | null) ?? (interaction.channel as TextChannel);

        if (!channel?.isTextBased() || channel.isDMBased()) {
            return interaction.reply({ embeds: [buildConfirmEmbed('That is not a valid text channel.', true)], ephemeral: true });
        }

        await channel.setRateLimitPerUser(seconds);

        const msg = seconds === 0 ? `Slowmode disabled in ${channel}.` : `Slowmode set to **${seconds}s** in ${channel}.`;
        await interaction.reply({ embeds: [buildConfirmEmbed(msg)] });
    },
};
