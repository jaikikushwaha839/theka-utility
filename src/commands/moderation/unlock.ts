import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, type TextChannel } from 'discord.js';
import type { Command } from '../../types';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock a channel, restoring @everyone send permission.')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to unlock (defaults to this one)').addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        const channel = (interaction.options.getChannel('channel') as TextChannel | null) ?? (interaction.channel as TextChannel);

        if (!channel?.isTextBased() || channel.isDMBased()) {
            return interaction.reply({ embeds: [buildConfirmEmbed('That is not a valid text channel.', true)], ephemeral: true });
        }

        // Clear the explicit deny rather than forcing an explicit allow, so servers that
        // never gave @everyone SendMessages in the first place aren't changed unexpectedly.
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });

        await interaction.reply({ embeds: [buildConfirmEmbed(`🔓 Unlocked ${channel}.`)] });
    },
};
