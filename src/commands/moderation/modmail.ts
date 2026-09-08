import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, type TextChannel } from 'discord.js';
import type { Command } from '../../types';
import { GuildConfig } from '../../models/GuildConfig';
import { ModmailTicket } from '../../models/ModmailTicket';
import { closeTicket } from '../../utils/modmail';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('modmail')
        .setDescription('Configure and manage the DM modmail system.')
        .addSubcommand((sub) =>
            sub
                .setName('setup')
                .setDescription('Set the category new modmail ticket channels are created under')
                .addChannelOption((opt) =>
                    opt.setName('category').setDescription('A channel category').addChannelTypes(ChannelType.GuildCategory).setRequired(true),
                ),
        )
        .addSubcommand((sub) => sub.setName('close').setDescription('Close the modmail ticket in this channel'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'setup') {
            const category = interaction.options.getChannel('category', true);
            await GuildConfig.findOneAndUpdate({ guildId }, { guildId, modmailCategoryId: category.id }, { upsert: true });

            return interaction.reply({
                embeds: [
                    buildConfirmEmbed(
                        `Modmail is set up. New tickets will be created under **${category.name}**.\n` +
                            `Set permissions on that category so your staff role(s) can view it — ticket channels inherit those permissions automatically.`,
                    ),
                ],
            });
        }

        // close
        const ticket = await ModmailTicket.findOne({ guildId, channelId: interaction.channel?.id, open: true });
        if (!ticket) {
            return interaction.reply({ embeds: [buildConfirmEmbed('This is not an open modmail ticket channel.', true)], ephemeral: true });
        }

        await interaction.reply({ embeds: [buildConfirmEmbed('Closing ticket...')] });
        await closeTicket(interaction.channel as TextChannel, ticket, interaction.user);
    },
};
