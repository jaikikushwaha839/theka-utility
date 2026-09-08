import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types';
import { GuildConfig } from '../../models/GuildConfig';
import { buildConfirmEmbed } from '../../utils/embeds';

const MAX_PREFIX_LENGTH = 5;

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription("View or change this server's command prefix.")
        .addSubcommand((sub) => sub.setName('view').setDescription('Show the current prefix'))
        .addSubcommand((sub) =>
            sub
                .setName('set')
                .setDescription('Change the prefix (requires Manage Server)')
                .addStringOption((opt) => opt.setName('prefix').setDescription('e.g. !, ?, -, >').setRequired(true)),
        ),
        // Deliberately no .setDefaultMemberPermissions() here — `view` should be usable
        // by anyone. `set` checks Manage Server by hand below instead, so the two
        // subcommands can have different visibility under one command.

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'view') {
            const guildConfig = await GuildConfig.findOne({ guildId }).lean();
            const prefix = guildConfig?.prefix ?? '!';
            return interaction.reply({
                embeds: [buildConfirmEmbed(`Current prefix: \`${prefix}\`\nExample: \`${prefix}ping\` or \`/ping\` both work.`)],
            });
        }

        // set — anyone can run /prefix, but only Manage Server can actually change it.
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ embeds: [buildConfirmEmbed("You need the **Manage Server** permission to change the prefix.", true)], ephemeral: true });
        }

        const newPrefix = interaction.options.getString('prefix', true);
        if (newPrefix.length > MAX_PREFIX_LENGTH) {
            return interaction.reply({ embeds: [buildConfirmEmbed(`Prefix must be ${MAX_PREFIX_LENGTH} characters or fewer.`, true)], ephemeral: true });
        }
        if (/\s/.test(newPrefix)) {
            return interaction.reply({ embeds: [buildConfirmEmbed('Prefix cannot contain spaces.', true)], ephemeral: true });
        }

        await GuildConfig.findOneAndUpdate({ guildId }, { guildId, prefix: newPrefix }, { upsert: true });

        await interaction.reply({ embeds: [buildConfirmEmbed(`Prefix changed to \`${newPrefix}\`. Example: \`${newPrefix}ping\`.`)] });
    },
};
