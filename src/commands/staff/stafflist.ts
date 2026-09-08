import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import type { Command } from '../../types';
import { config } from '../../config';
import { buildConfirmEmbed } from '../../utils/embeds';

// A role "counts" as staff if it carries any of these permissions. There's no
// separate `/stafflist setup` step — this heuristic keeps the feature
// zero-config, at the cost of not distinguishing "helper" from "admin" roles.
const STAFF_PERMISSIONS = [
    PermissionsBitField.Flags.Administrator,
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.BanMembers,
    PermissionsBitField.Flags.ManageMessages,
    PermissionsBitField.Flags.ModerateMembers,
];

export const command: Command = {
    data: new SlashCommandBuilder().setName('stafflist').setDescription('List members holding a moderation-capable role.').setDMPermission(false),

    async execute(interaction) {
        await interaction.guild.members.fetch();

        const staffRoles = interaction.guild.roles.cache.filter((r) => STAFF_PERMISSIONS.some((p) => r.permissions.has(p)));
        const staffMembers = new Map<string, string>();

        for (const role of staffRoles.values()) {
            for (const member of role.members.values()) {
                if (!member.user.bot) staffMembers.set(member.id, member.user.tag);
            }
        }

        if (staffMembers.size === 0) {
            return interaction.reply({ embeds: [buildConfirmEmbed('No members with moderation-capable roles found.')], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle('Staff')
            .setDescription([...staffMembers.entries()].map(([id, tag]) => `<@${id}> (${tag})`).join('\n'))
            .setFooter({ text: `${staffMembers.size} staff member(s)` });

        await interaction.reply({ embeds: [embed] });
    },
};
