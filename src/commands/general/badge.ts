import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types';
import { UserBadge } from '../../models/UserBadge';
import { buildConfirmEmbed } from '../../utils/embeds';
import { config, isDeveloper } from '../../config';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('badge')
        .setDescription("View a user's profile badges.")
        .addSubcommand((sub) =>
            sub.setName('view').setDescription("Show a user's badges").addUserOption((opt) => opt.setName('user').setDescription('Defaults to you')),
        )
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('[Developer only] Grant a badge to a user')
                .addUserOption((opt) => opt.setName('user').setDescription('The user').setRequired(true))
                .addStringOption((opt) => opt.setName('badge').setDescription('Badge name/emoji to grant').setRequired(true).setMaxLength(50)),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('[Developer only] Revoke a badge from a user')
                .addUserOption((opt) => opt.setName('user').setDescription('The user').setRequired(true))
                .addStringOption((opt) => opt.setName('badge').setDescription('Badge name/emoji to revoke').setRequired(true)),
        )
        // No setDefaultMemberPermissions — `view` is meant for everyone; add/remove
        // are gated below by developer ID, same pattern as /premium.
        .setDMPermission(false),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'view') {
            const target = interaction.options.getUser('user') ?? interaction.user;
            const record = await UserBadge.findOne({ userId: target.id }).lean();
            const badges = record?.badges ?? [];

            const embed = new EmbedBuilder()
                .setColor(config.embedColor)
                .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
                .setDescription(badges.length > 0 ? badges.join('  ') : 'No badges yet.');

            return interaction.reply({ embeds: [embed] });
        }

        if (!isDeveloper(interaction.user.id)) {
            return interaction.reply({ embeds: [buildConfirmEmbed('This command is restricted to bot developers.', true)], ephemeral: true });
        }

        const target = interaction.options.getUser('user', true);
        const badge = interaction.options.getString('badge', true);

        if (sub === 'add') {
            const record = await UserBadge.findOneAndUpdate({ userId: target.id }, { userId: target.id }, { upsert: true, new: true, setDefaultsOnInsert: true });
            if (!record.badges.includes(badge)) {
                record.badges.push(badge);
                await record.save();
            }
            return interaction.reply({ embeds: [buildConfirmEmbed(`Granted badge \`${badge}\` to **${target.tag}**.`)], ephemeral: true });
        }

        // remove
        const record = await UserBadge.findOne({ userId: target.id });
        if (!record || !record.badges.includes(badge)) {
            return interaction.reply({ embeds: [buildConfirmEmbed(`**${target.tag}** doesn't have that badge.`, true)], ephemeral: true });
        }
        record.badges = record.badges.filter((b) => b !== badge);
        await record.save();
        return interaction.reply({ embeds: [buildConfirmEmbed(`Removed badge \`${badge}\` from **${target.tag}**.`)], ephemeral: true });
    },
};
