import {
    SlashCommandBuilder,
    EmbedBuilder,
    Collection,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
} from 'discord.js';

import type { Command } from '../../types';
import { config } from '../../config';
import { buildConfirmEmbed } from '../../utils/embeds';
import { buildUsage } from '../../utils/prefixOptions';
import { GuildConfig } from '../../models/GuildConfig';

const CATEGORIES: Record<string, string> = {
    // Moderation
    warn: 'Moderation',
    kick: 'Moderation',
    ban: 'Moderation',
    unban: 'Moderation',
    mute: 'Moderation',
    unmute: 'Moderation',
    warnings: 'Moderation',
    clearwarn: 'Moderation',
    purge: 'Moderation',
    automod: 'Moderation',
    modlog: 'Moderation',
    slowmode: 'Moderation',
    lock: 'Moderation',
    unlock: 'Moderation',
    case: 'Moderation',

    // Anti-Nuke
    antinuke: 'Anti-Nuke',

    // Modmail
    modmail: 'Modmail',

    // Staff Utility
    nick: 'Staff Utility',
    role: 'Staff Utility',
    userinfo: 'Staff Utility',
    channelinfo: 'Staff Utility',
    serverinfo: 'Staff Utility',
    permissions: 'Staff Utility',
    stafflist: 'Staff Utility',
    modstats: 'Staff Utility',

    // Utility
    customcommand: 'Utility',
    botprofile: 'Utility',
    help: 'Utility',
    prefix: 'Utility',

    // General
    ping: 'General',
    devinfo: 'General',
    afk: 'General',
    badge: 'General',

    // Developer
    premium: 'Developer',
    noprefix: 'Developer',
    blacklist: 'Blacklist',
    guildinspect: 'Developer',
    guilds: 'Developer',
};

const DEVELOPER_COMMANDS = new Set([
    'premium',
    'noprefix',
    'blacklist',
    'guildinspect',
    'guilds',
]);

/**
 * Converts command names into a clean display format.
 *
 * Examples:
 * purge       -> Purge
 * clearwarn   -> Clearwarn
 * userinfo    -> Userinfo
 * antinuke    -> Antinuke
 * customcommand -> Customcommand
 */
const formatCommandName = (name: string) => {
    return name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription(
            'List available commands, or get details on one.',
        )
        .addStringOption((option) =>
            option
                .setName('command')
                .setDescription(
                    'Get detailed usage for a specific command',
                ),
        ),

    async execute(interaction) {
        const client = interaction.client as typeof interaction.client & {
            commands: Collection<string, Command>;
        };

        // =========================================================
        // Get Guild Prefix
        // =========================================================

        const guildConfig = interaction.guild
            ? await GuildConfig.findOne({
                  guildId: interaction.guild.id,
              }).lean()
            : null;

        const prefix = guildConfig?.prefix ?? '!';

        const target =
            interaction.options.getString('command');

        // =========================================================
        // Detailed Command Help
        // =========================================================

        if (target) {
            const commandName = target.toLowerCase();

            // Hide developer commands
            if (
                DEVELOPER_COMMANDS.has(
                    commandName,
                )
            ) {
                return interaction.reply({
                    embeds: [
                        buildConfirmEmbed(
                            `No command named \`${target}\`.`,
                            true,
                        ),
                    ],
                    ephemeral: true,
                });
            }

            const cmd =
                client.commands.get(commandName);

            if (!cmd) {
                return interaction.reply({
                    embeds: [
                        buildConfirmEmbed(
                            `No command named \`${target}\`.`,
                            true,
                        ),
                    ],
                    ephemeral: true,
                });
            }

            const json = cmd.data.toJSON();

            const usage = buildUsage(
                prefix,
                json.name,
                json,
            );

            const prefixUsage = usage
                ? usage
                : `${prefix}${json.name}`;

            const category =
                CATEGORIES[
                    json.name.toLowerCase()
                ] ?? 'Other';

            const displayName =
                formatCommandName(json.name);

            const embed =
                new EmbedBuilder()
                    .setColor(config.embedColor)
                    .setTitle(
                        'Theka Utility • Command Help',
                    )
                    .setDescription(
                        `**•** **${displayName}**\n` +
                        `> ${
                            json.description ??
                            'No description.'
                        }`,
                    )
                    .addFields(
                        {
                            name: '**•** Category',
                            value: `**${category}**`,
                            inline: true,
                        },
                        {
                            name: '**•** Slash Usage',
                            value: `\`/${json.name}\``,
                            inline: true,
                        },
                        {
                            name: '**•** Prefix Usage',
                            value: `\`${prefixUsage}\``,
                            inline: true,
                        },
                    )
                    .setFooter({
                        text: `Requested by ${interaction.user.username} • ${new Date().toLocaleTimeString()}`,
                        iconURL:
                            interaction.user.displayAvatarURL(),
                    });

            return interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        // =========================================================
        // Group Commands By Category
        // =========================================================

        const grouped = new Map<
            string,
            {
                name: string;
                command: Command;
            }[]
        >();

        for (const [name, cmd] of client.commands) {
            const commandName =
                name.toLowerCase();

            // Hide developer commands
            if (
                DEVELOPER_COMMANDS.has(
                    commandName,
                )
            ) {
                continue;
            }

            const category =
                CATEGORIES[commandName] ??
                'Other';

            // Hide Developer category
            if (category === 'Developer') {
                continue;
            }

            const list =
                grouped.get(category) ?? [];

            list.push({
                name,
                command: cmd,
            });

            grouped.set(category, list);
        }

        // =========================================================
        // Sort Commands
        // =========================================================

        for (const commands of grouped.values()) {
            commands.sort((a, b) =>
                a.name.localeCompare(
                    b.name,
                ),
            );
        }

        // =========================================================
        // Sort Categories
        // =========================================================

        const categories = [
            ...grouped.keys(),
        ].sort();

        // =========================================================
        // Category Select Menu
        // =========================================================

        const buildSelectMenu = (
            selectedCategory: string,
        ) => {
            return new StringSelectMenuBuilder()
                .setCustomId(
                    'help_category',
                )
                .setPlaceholder(
                    'Select A Category',
                )
                .addOptions(
                    categories.map(
                        (category) => ({
                            label: category,
                            value: category,
                            description: `View ${category} Commands`,
                            default:
                                category ===
                                selectedCategory,
                        }),
                    ),
                );
        };

        const buildSelectRow = (
            selectedCategory: string,
        ) =>
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                buildSelectMenu(
                    selectedCategory,
                ),
            );

        // =========================================================
        // Build Pages
        // =========================================================

        const pages: {
            category: string;
            commandText: string;
        }[] = [];

        for (const category of categories) {
            const commands =
                grouped.get(category) ?? [];

            const commandText =
                commands
                    .map(
                        ({
                            name,
                            command,
                        }) => {
                            const json =
                                command.data.toJSON();

                            const usage =
                                buildUsage(
                                    prefix,
                                    json.name,
                                    json,
                                );

                            const prefixUsage =
                                usage
                                    ? usage
                                    : `${prefix}${json.name}`;

                            const displayName =
                                formatCommandName(
                                    json.name,
                                );

                            return (
                                `**•** **${displayName}**\n` +
                                `**↳** Slash: \`/${json.name}\`\n` +
                                `**↳** Prefix: \`${prefixUsage}\`\n` +
                                `**↳** ${
                                    json.description ??
                                    'No description.'
                                }`
                            );
                        },
                    )
                    .join('\n\n');

            pages.push({
                category,
                commandText,
            });
        }

        // =========================================================
        // Current Page
        // =========================================================

        let currentPage = 0;

        // =========================================================
        // Build Embed
        // =========================================================

        const buildEmbed = (
            page: number,
        ) => {
            const current =
                pages[page];

            return new EmbedBuilder()
                .setColor(config.embedColor)
                .setTitle(
                    'Theka Utility • Commands',
                )
                .setDescription(
                    `> Powering your server, all in one.\n\n` +
                    `**•** **${current.category}**\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `${current.commandText}`,
                )
                .addFields({
                    name: '**•** Navigation',
                    value:
                        '`Previous` / `Next` to browse categories\n' +
                        '`Select Menu` to jump to a category',
                })
                .setFooter({
                    text: `Requested by ${interaction.user.username} • ${new Date().toLocaleTimeString()}`,
                    iconURL:
                        interaction.user.displayAvatarURL(),
                });
        };

        // =========================================================
        // Navigation Buttons
        // =========================================================

        const buildButtons = (
            page: number,
        ) => {
            return new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        'help_previous',
                    )
                    .setLabel('Previous')
                    .setStyle(
                        ButtonStyle.Secondary,
                    )
                    .setDisabled(
                        page === 0,
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        'help_page',
                    )
                    .setLabel(
                        `Page ${
                            page + 1
                        }/${pages.length}`,
                    )
                    .setStyle(
                        ButtonStyle.Secondary,
                    )
                    .setDisabled(true),

                new ButtonBuilder()
                    .setCustomId(
                        'help_next',
                    )
                    .setLabel('Next')
                    .setStyle(
                        ButtonStyle.Primary,
                    )
                    .setDisabled(
                        page ===
                            pages.length -
                                1,
                    ),
            );
        };

        // =========================================================
        // Initial Response
        // =========================================================

        const response =
            await interaction.reply({
                embeds: [
                    buildEmbed(
                        currentPage,
                    ),
                ],
                components: [
                    buildSelectRow(
                        pages[
                            currentPage
                        ].category,
                    ),
                    buildButtons(
                        currentPage,
                    ),
                ],
                ephemeral: true,
                fetchReply: true,
            });

        // =========================================================
        // Component Collector
        // =========================================================

        const collector =
            response.createMessageComponentCollector(
                {
                    time: 60_000,
                },
            );

        collector.on(
            'collect',
            async (component) => {
                // Only original user can control menu
                if (
                    component.user.id !==
                    interaction.user.id
                ) {
                    await component.reply(
                        {
                            content:
                                'This help menu belongs to another user.',
                            ephemeral: true,
                        },
                    );

                    return;
                }

                // =================================================
                // Category Select
                // =================================================

                if (
                    component.isStringSelectMenu() &&
                    component.customId ===
                        'help_category'
                ) {
                    const selectedCategory =
                        component.values[0];

                    const categoryIndex =
                        categories.indexOf(
                            selectedCategory,
                        );

                    if (
                        categoryIndex !==
                        -1
                    ) {
                        currentPage =
                            categoryIndex;

                        await component.update(
                            {
                                embeds: [
                                    buildEmbed(
                                        currentPage,
                                    ),
                                ],
                                components: [
                                    buildSelectRow(
                                        pages[
                                            currentPage
                                        ].category,
                                    ),
                                    buildButtons(
                                        currentPage,
                                    ),
                                ],
                            },
                        );
                    }

                    return;
                }

                // =================================================
                // Previous
                // =================================================

                if (
                    component.isButton() &&
                    component.customId ===
                        'help_previous'
                ) {
                    if (
                        currentPage >
                        0
                    ) {
                        currentPage--;
                    }

                    await component.update(
                        {
                            embeds: [
                                buildEmbed(
                                    currentPage,
                                ),
                            ],
                            components: [
                                buildSelectRow(
                                    pages[
                                        currentPage
                                    ].category,
                                ),
                                buildButtons(
                                    currentPage,
                                ),
                            ],
                        },
                    );

                    return;
                }

                // =================================================
                // Next
                // =================================================

                if (
                    component.isButton() &&
                    component.customId ===
                        'help_next'
                ) {
                    if (
                        currentPage <
                        pages.length -
                            1
                    ) {
                        currentPage++;
                    }

                    await component.update(
                        {
                            embeds: [
                                buildEmbed(
                                    currentPage,
                                ),
                            ],
                            components: [
                                buildSelectRow(
                                    pages[
                                        currentPage
                                    ].category,
                                ),
                                buildButtons(
                                    currentPage,
                                ),
                            ],
                        },
                    );
                }
            },
        );

        // =========================================================
        // Collector Expired
        // =========================================================

        collector.on(
            'end',
            async () => {
                try {
                    const disabledMenu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                'help_category',
                            )
                            .setPlaceholder(
                                'Help Menu Expired',
                            )
                            .setDisabled(
                                true,
                            )
                            .addOptions(
                                categories.map(
                                    (
                                        category,
                                    ) => ({
                                        label:
                                            category,
                                        value:
                                            category,
                                    }),
                                ),
                            );

                    const disabledSelectRow =
                        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                            disabledMenu,
                        );

                    const disabledButtons =
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId(
                                    'help_previous',
                                )
                                .setLabel(
                                    'Previous',
                                )
                                .setStyle(
                                    ButtonStyle.Secondary,
                                )
                                .setDisabled(
                                    true,
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    'help_page',
                                )
                                .setLabel(
                                    `Page ${
                                        currentPage +
                                        1
                                    }/${pages.length}`,
                                )
                                .setStyle(
                                    ButtonStyle.Secondary,
                                )
                                .setDisabled(
                                    true,
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    'help_next',
                                )
                                .setLabel(
                                    'Next',
                                )
                                .setStyle(
                                    ButtonStyle.Primary,
                                )
                                .setDisabled(
                                    true,
                                ),
                        );

                    await interaction.editReply(
                        {
                            components: [
                                disabledSelectRow,
                                disabledButtons,
                            ],
                        },
                    );
                } catch {
                    // Ignore expired/deleted interactions
                }
            },
        );
    },
};