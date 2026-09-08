import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types';
import { CustomCommand } from '../../models/CustomCommand';
import { GuildConfig } from '../../models/GuildConfig';
import { buildConfirmEmbed } from '../../utils/embeds';
import { config } from '../../config';

const NAME_PATTERN = /^[a-z0-9-]{1,32}$/;

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('customcommand')
        .setDescription('Manage custom text-triggered commands for this server.')
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Create a new custom command')
                .addStringOption((opt) => opt.setName('name').setDescription('Trigger word (letters, numbers, dashes only)').setRequired(true))
                .addStringOption((opt) => opt.setName('response').setDescription('What the bot replies with').setRequired(true)),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Delete a custom command')
                .addStringOption((opt) => opt.setName('name').setDescription('Trigger word to remove').setRequired(true)),
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('List all custom commands in this server'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'add') {
            const name = interaction.options.getString('name', true).toLowerCase();
            const response = interaction.options.getString('response', true);

            if (!NAME_PATTERN.test(name)) {
                return interaction.reply({ embeds: [buildConfirmEmbed('Command names can only contain lowercase letters, numbers, and dashes (max 32 chars).', true)], ephemeral: true });
            }

            const existing = await CustomCommand.findOne({ guildId, name });
            if (existing) {
                return interaction.reply({ embeds: [buildConfirmEmbed(`A command named \`${name}\` already exists.`, true)], ephemeral: true });
            }

            await CustomCommand.create({ guildId, name, response, createdBy: interaction.user.id });
            return interaction.reply({ embeds: [buildConfirmEmbed(`Created custom command \`${name}\`.`)] });
        }

        if (sub === 'remove') {
            const name = interaction.options.getString('name', true).toLowerCase();
            const deleted = await CustomCommand.findOneAndDelete({ guildId, name });
            if (!deleted) {
                return interaction.reply({ embeds: [buildConfirmEmbed(`No command named \`${name}\` found.`, true)], ephemeral: true });
            }
            return interaction.reply({ embeds: [buildConfirmEmbed(`Removed custom command \`${name}\`.`)] });
        }

        // list
        const commands = await CustomCommand.find({ guildId }).sort({ name: 1 }).lean();
        if (commands.length === 0) {
            return interaction.reply({ embeds: [buildConfirmEmbed('No custom commands set up yet. Use `/customcommand add` to create one.')], ephemeral: true });
        }

        const guildConfig = await GuildConfig.findOne({ guildId }).lean();
        const prefix = guildConfig?.prefix ?? '!';

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle('Custom Commands')
            .setDescription(commands.map((c) => `\`${prefix}${c.name}\``).join(', '))
            .setFooter({ text: `${commands.length} command${commands.length === 1 ? '' : 's'}` });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
