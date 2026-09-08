import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import type { Command } from '../../types';
import { GuildConfig } from '../../models/GuildConfig';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('modlog')
        .setDescription('Set the channel where moderation actions get logged.')
        .addChannelOption((opt) =>
            opt.setName('channel').setDescription('The log channel').addChannelTypes(ChannelType.GuildText).setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel', true);

        await GuildConfig.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { guildId: interaction.guild.id, modLogChannelId: channel.id },
            { upsert: true },
        );

        await interaction.reply({
            embeds: [buildConfirmEmbed(`Mod-log channel set to <#${channel.id}>.`)],
        });
    },
};
