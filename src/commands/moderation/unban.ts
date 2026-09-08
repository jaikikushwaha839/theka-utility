import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types';
import { ModCase, getNextCaseId } from '../../models/ModCase';
import { buildConfirmEmbed } from '../../utils/embeds';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user by ID.')
        .addStringOption((opt) => opt.setName('user_id').setDescription('The user ID to unban').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the unban'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const userId = interaction.options.getString('user_id', true);
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        const banEntry = await interaction.guild.bans.fetch(userId).catch(() => null);
        if (!banEntry) {
            return interaction.reply({ embeds: [buildConfirmEmbed('That user is not banned.', true)], ephemeral: true });
        }

        await interaction.guild.members.unban(userId, reason);

        const caseId = await getNextCaseId(interaction.guild.id);
        await ModCase.create({
            guildId: interaction.guild.id,
            caseId,
            type: 'unban',
            targetId: userId,
            targetTag: banEntry.user.tag,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason,
        });

        await interaction.reply({
            embeds: [buildConfirmEmbed(`Unbanned **${banEntry.user.tag}** — Case #${caseId}`)],
        });
    },
};
