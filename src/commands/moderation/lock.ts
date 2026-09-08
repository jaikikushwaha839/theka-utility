import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, type TextChannel } from 'discord.js';
import type { Command } from '../../types';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock a channel so @everyone cannot send messages.')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to lock (defaults to this one)').addChannelTypes(ChannelType.GuildText))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for locking'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        const channel = (interaction.options.getChannel('channel') as TextChannel | null) ?? (interaction.channel as TextChannel);
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        if (!channel?.isTextBased() || channel.isDMBased()) {
            return interaction.reply({ embeds: [buildConfirmEmbed('That is not a valid text channel.', true)], ephemeral: true });
        }

        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason });

        await interaction.reply({ embeds: [buildConfirmEmbed(`🔒 Locked ${channel} — ${reason}`)] });
    },
};
