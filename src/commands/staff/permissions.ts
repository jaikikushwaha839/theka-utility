import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    type GuildTextBasedChannel,
} from 'discord.js';
import type { Command } from '../../types';
import { config } from '../../config';
import { buildConfirmEmbed } from '../../utils/embeds';

function humanize(flag: string): string {
    return flag.replace(/([A-Z])/g, ' $1').trim();
}

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('permissions')
        .setDescription("Show a member's resolved permissions.")
        .addUserOption((opt) =>
            opt
                .setName('user')
                .setDescription('The member to check (defaults to you)')
        )
        .addChannelOption((opt) =>
            opt
                .setName('channel')
                .setDescription('Check permissions in this specific channel')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const target =
            interaction.options.getUser('user') ?? interaction.user;

        const channel = interaction.options.getChannel('channel');

        const member = await interaction.guild.members
            .fetch(target.id)
            .catch(() => null);

        if (!member) {
            return interaction.reply({
                embeds: [
                    buildConfirmEmbed(
                        'That user is not in this server.',
                        true
                    ),
                ],
                ephemeral: true,
            });
        }

        const permissions = channel
            ? member.permissionsIn(channel as GuildTextBasedChannel)
            : member.permissions;

        const granted = permissions.toArray().map(humanize);

const channelName = channel?.name ?? channel?.id ?? 'Unknown';

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(
                `Permissions for ${target.tag}${
                    channelName ? ` in #${channelName}` : ''
                }`
            )
            .setDescription(
                granted.length > 0
                    ? granted.map((p) => `\`${p}\``).join(', ')
                    : 'No permissions.'
            );

        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};