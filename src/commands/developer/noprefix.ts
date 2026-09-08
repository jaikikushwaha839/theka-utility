import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types';
import { NoPrefixUser } from '../../models/NoPrefixUser';
import { buildConfirmEmbed } from '../../utils/embeds';
import { isDeveloper } from '../../config';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('noprefix')
        .setDescription('[Developer only] Grant or revoke prefix-less command access.')
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Let a user run prefix commands without typing the prefix')
                .addUserOption((opt) => opt.setName('user').setDescription('The user').setRequired(true))
                .addStringOption((opt) => opt.setName('note').setDescription('Internal note')),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Revoke no-prefix access from a user')
                .addUserOption((opt) => opt.setName('user').setDescription('The user').setRequired(true)),
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('List users with no-prefix access'))
        .setDMPermission(false),

    async execute(interaction) {
        if (!isDeveloper(interaction.user.id)) {
            return interaction.reply({ embeds: [buildConfirmEmbed('This command is restricted to bot developers.', true)], ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const target = interaction.options.getUser('user', true);
            const note = interaction.options.getString('note') ?? undefined;
            await NoPrefixUser.findOneAndUpdate(
                { userId: target.id },
                { userId: target.id, addedBy: interaction.user.id, note },
                { upsert: true },
            );
            return interaction.reply({ embeds: [buildConfirmEmbed(`**${target.tag}** can now run commands without the prefix.`)], ephemeral: true });
        }

        if (sub === 'remove') {
            const target = interaction.options.getUser('user', true);
            const removed = await NoPrefixUser.findOneAndDelete({ userId: target.id });
            if (!removed) {
                return interaction.reply({ embeds: [buildConfirmEmbed(`**${target.tag}** didn't have no-prefix access.`, true)], ephemeral: true });
            }
            return interaction.reply({ embeds: [buildConfirmEmbed(`Revoked no-prefix access from **${target.tag}**.`)], ephemeral: true });
        }

        // list
        const entries = await NoPrefixUser.find().lean();
        if (entries.length === 0) {
            return interaction.reply({ embeds: [buildConfirmEmbed('No users have no-prefix access.')], ephemeral: true });
        }
        return interaction.reply({
            embeds: [buildConfirmEmbed(entries.map((e) => `<@${e.userId}>${e.note ? ` — ${e.note}` : ''}`).join('\n'))],
            ephemeral: true,
        });
    },
};
