import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types';
import { AntiNukeConfig, ANTINUKE_DEFAULTS } from '../../models/AntiNukeConfig';
import { AntiNukeLog } from '../../models/AntiNukeLog';
import { buildConfirmEmbed } from '../../utils/embeds';
import { config } from '../../config';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('antinuke')
        .setDescription('Configure automatic protection against mass-destructive actions.')
        .addSubcommand((sub) => sub.setName('enable').setDescription('Enable anti-nuke protection for this server'))
        .addSubcommand((sub) => sub.setName('disable').setDescription('Disable anti-nuke protection for this server'))
        .addSubcommand((sub) => sub.setName('status').setDescription('Show current anti-nuke configuration'))
        .addSubcommand((sub) =>
            sub
                .setName('config')
                .setDescription('Adjust thresholds, punishment, and log channel')
                .addIntegerOption((opt) => opt.setName('threshold').setDescription('Actions allowed within the window before punishing').setMinValue(1).setMaxValue(20))
                .addIntegerOption((opt) => opt.setName('window').setDescription('Time window in seconds').setMinValue(2).setMaxValue(120))
                .addStringOption((opt) =>
                    opt
                        .setName('punishment')
                        .setDescription('What happens to the offending account')
                        .addChoices(
                            { name: 'Strip all roles', value: 'strip_roles' },
                            { name: 'Kick', value: 'kick' },
                            { name: 'Ban', value: 'ban' },
                        ),
                )
                .addChannelOption((opt) => opt.setName('log_channel').setDescription('Channel to post incidents to').addChannelTypes(ChannelType.GuildText)),
        )
        .addSubcommand((sub) => sub.setName('reset').setDescription('Reset thresholds/punishment/log channel to defaults'))
        .addSubcommand((sub) =>
            sub
                .setName('logs')
                .setDescription('Show recent anti-nuke incidents')
                .addIntegerOption((opt) => opt.setName('limit').setDescription('How many to show (default 10)').setMinValue(1).setMaxValue(25)),
        )
        .addSubcommandGroup((group) =>
            group
                .setName('whitelist')
                .setDescription('Manage users exempt from anti-nuke detection')
                .addSubcommand((sub) =>
                    sub.setName('add').setDescription('Exempt a user').addUserOption((opt) => opt.setName('user').setDescription('User to whitelist').setRequired(true)),
                )
                .addSubcommand((sub) =>
                    sub
                        .setName('remove')
                        .setDescription('Remove a user from the whitelist')
                        .addUserOption((opt) => opt.setName('user').setDescription('User to remove').setRequired(true)),
                )
                .addSubcommand((sub) => sub.setName('list').setDescription('List whitelisted users')),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const group = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand();

        if (group === 'whitelist') {
            const cfg = await AntiNukeConfig.findOneAndUpdate({ guildId }, { guildId }, { upsert: true, new: true, setDefaultsOnInsert: true });

            if (sub === 'add') {
                const user = interaction.options.getUser('user', true);
                if (!cfg.whitelist.includes(user.id)) {
                    cfg.whitelist.push(user.id);
                    await cfg.save();
                }
                return interaction.reply({ embeds: [buildConfirmEmbed(`Whitelisted **${user.tag}** from anti-nuke detection.`)] });
            }

            if (sub === 'remove') {
                const user = interaction.options.getUser('user', true);
                cfg.whitelist = cfg.whitelist.filter((id) => id !== user.id);
                await cfg.save();
                return interaction.reply({ embeds: [buildConfirmEmbed(`Removed **${user.tag}** from the whitelist.`)] });
            }

            // list
            if (cfg.whitelist.length === 0) {
                return interaction.reply({ embeds: [buildConfirmEmbed('No users whitelisted.')], ephemeral: true });
            }
            return interaction.reply({
                embeds: [buildConfirmEmbed(cfg.whitelist.map((id) => `<@${id}>`).join('\n'))],
                ephemeral: true,
            });
        }

        if (sub === 'enable') {
            await AntiNukeConfig.findOneAndUpdate({ guildId }, { guildId, enabled: true }, { upsert: true, setDefaultsOnInsert: true });
            return interaction.reply({ embeds: [buildConfirmEmbed('🛡️ Anti-nuke protection **enabled**.')] });
        }

        if (sub === 'disable') {
            await AntiNukeConfig.findOneAndUpdate({ guildId }, { guildId, enabled: false }, { upsert: true, setDefaultsOnInsert: true });
            return interaction.reply({ embeds: [buildConfirmEmbed('Anti-nuke protection **disabled**.')] });
        }

        if (sub === 'status') {
            const cfg = await AntiNukeConfig.findOne({ guildId }).lean();
            const embed = new EmbedBuilder()
                .setColor(config.embedColor)
                .setTitle('Anti-Nuke Status')
                .addFields(
                    { name: 'Enabled', value: cfg?.enabled ? 'Yes' : 'No', inline: true },
                    { name: 'Threshold', value: `${cfg?.threshold ?? ANTINUKE_DEFAULTS.threshold} actions / ${cfg?.windowSeconds ?? ANTINUKE_DEFAULTS.windowSeconds}s`, inline: true },
                    { name: 'Punishment', value: cfg?.punishment ?? ANTINUKE_DEFAULTS.punishment, inline: true },
                    { name: 'Log channel', value: cfg?.logChannelId ? `<#${cfg.logChannelId}>` : 'Not set', inline: true },
                    { name: 'Whitelisted users', value: `${cfg?.whitelist.length ?? 0}`, inline: true },
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'config') {
            const threshold = interaction.options.getInteger('threshold');
            const windowSeconds = interaction.options.getInteger('window');
            const punishment = interaction.options.getString('punishment');
            const logChannel = interaction.options.getChannel('log_channel');

            const update: Record<string, unknown> = {};
            if (threshold !== null) update.threshold = threshold;
            if (windowSeconds !== null) update.windowSeconds = windowSeconds;
            if (punishment !== null) update.punishment = punishment;
            if (logChannel !== null) update.logChannelId = logChannel.id;

            if (Object.keys(update).length === 0) {
                return interaction.reply({ embeds: [buildConfirmEmbed('Provide at least one setting to change.', true)], ephemeral: true });
            }

            await AntiNukeConfig.findOneAndUpdate({ guildId }, { guildId, ...update }, { upsert: true, setDefaultsOnInsert: true });
            return interaction.reply({ embeds: [buildConfirmEmbed('Anti-nuke configuration updated.')] });
        }

        if (sub === 'reset') {
            await AntiNukeConfig.findOneAndUpdate(
                { guildId },
                { $set: { guildId, ...ANTINUKE_DEFAULTS }, $unset: { logChannelId: '' } },
                { upsert: true },
            );
            return interaction.reply({ embeds: [buildConfirmEmbed('Anti-nuke settings reset to defaults (whitelist and enabled state kept).')] });
        }

        // logs
        const limit = interaction.options.getInteger('limit') ?? 10;
        const logs = await AntiNukeLog.find({ guildId }).sort({ createdAt: -1 }).limit(limit).lean();

        if (logs.length === 0) {
            return interaction.reply({ embeds: [buildConfirmEmbed('No anti-nuke incidents recorded.')], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle('Recent Anti-Nuke Incidents')
            .setDescription(
                logs
                    .map(
                        (l) =>
                            `**${l.actorTag}** — ${l.actionType} ×${l.occurrences} → ${l.punishment}\n<t:${Math.floor(l.createdAt.getTime() / 1000)}:R>`,
                    )
                    .join('\n\n'),
            );

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
