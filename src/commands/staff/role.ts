import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types';
import { buildConfirmEmbed } from '../../utils/embeds';
import { config } from '../../config';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Add, remove, or inspect roles.')
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Give a member a role')
                .addUserOption((opt) => opt.setName('user').setDescription('The member').setRequired(true))
                .addRoleOption((opt) => opt.setName('role').setDescription('The role to add').setRequired(true)),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Remove a role from a member')
                .addUserOption((opt) => opt.setName('user').setDescription('The member').setRequired(true))
                .addRoleOption((opt) => opt.setName('role').setDescription('The role to remove').setRequired(true)),
        )
        .addSubcommand((sub) =>
            sub
                .setName('info')
                .setDescription('Show details about a role')
                .addRoleOption((opt) => opt.setName('role').setDescription('The role to inspect').setRequired(true)),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .setDMPermission(false),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'info') {
            const role = interaction.options.getRole('role', true);
            const embed = new EmbedBuilder()
                .setColor((role.color || 0x99aab5) as number)
                .setTitle(role.name)
                .addFields(
                    { name: 'ID', value: role.id, inline: true },
                    { name: 'Color', value: role.hexColor, inline: true },
                    { name: 'Position', value: `${role.position}`, inline: true },
                    { name: 'Members', value: `${role.members.size}`, inline: true },
                    { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                    { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
                    { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>` },
                );
            return interaction.reply({ embeds: [embed] });
        }

        const target = interaction.options.getUser('user', true);
        const role = interaction.options.getRole('role', true);

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) {
            return interaction.reply({ embeds: [buildConfirmEmbed('That user is not in this server.', true)], ephemeral: true });
        }

        const fullRole = interaction.guild.roles.cache.get(role.id);
        if (!fullRole?.editable) {
            return interaction.reply({ embeds: [buildConfirmEmbed('I cannot manage that role (role hierarchy).', true)], ephemeral: true });
        }

        if (sub === 'add') {
            if (member.roles.cache.has(role.id)) {
                return interaction.reply({ embeds: [buildConfirmEmbed(`**${target.tag}** already has that role.`, true)], ephemeral: true });
            }
            await member.roles.add(role.id);
            return interaction.reply({ embeds: [buildConfirmEmbed(`Added **${role.name}** to **${target.tag}**.`)] });
        }

        // remove
        if (!member.roles.cache.has(role.id)) {
            return interaction.reply({ embeds: [buildConfirmEmbed(`**${target.tag}** doesn't have that role.`, true)], ephemeral: true });
        }
        await member.roles.remove(role.id);
        return interaction.reply({ embeds: [buildConfirmEmbed(`Removed **${role.name}** from **${target.tag}**.`)] });
    },
};
