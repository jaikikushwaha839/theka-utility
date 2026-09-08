import { SlashCommandBuilder, PermissionFlagsBits, type TextChannel } from 'discord.js';
import type { Command } from '../../types';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk delete recent messages in this channel.')
        .addIntegerOption((opt) =>
            opt.setName('amount').setDescription('Number of messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true),
        )
        .addUserOption((opt) => opt.setName('user').setDescription('Only delete messages from this user'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount', true);
        const targetUser = interaction.options.getUser('user');
        const channel = interaction.channel as TextChannel;

        if (!channel?.isTextBased() || channel.isDMBased()) {
            return interaction.reply({ embeds: [buildConfirmEmbed('This command can only be used in a server text channel.', true)], ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        // Discord's bulkDelete only touches messages younger than 14 days.
        const fetched = await channel.messages.fetch({ limit: Math.min(amount * (targetUser ? 3 : 1), 100) });
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

        let candidates = fetched.filter((m) => m.createdTimestamp > twoWeeksAgo);
        if (targetUser) candidates = candidates.filter((m) => m.author.id === targetUser.id);
        const toDelete = [...candidates.values()].slice(0, amount);

        if (toDelete.length === 0) {
            return interaction.editReply({ embeds: [buildConfirmEmbed('No eligible messages found (messages older than 14 days cannot be bulk deleted).', true)] });
        }

        const deleted = await channel.bulkDelete(toDelete, true);

        await interaction.editReply({
            embeds: [buildConfirmEmbed(`Deleted **${deleted.size}** message${deleted.size === 1 ? '' : 's'}${targetUser ? ` from **${targetUser.tag}**` : ''}.`)],
        });
    },
};
