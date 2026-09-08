import {
    ChannelType,
    ComponentType,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    type User,
    type Guild,
    type Message,
    type TextChannel,
    type Client,
} from 'discord.js';

import { GuildConfig } from '../models/GuildConfig';
import {
    ModmailTicket,
    type IModmailTicket,
} from '../models/ModmailTicket';

import { config } from '../config';

/**
 * Guilds the bot shares with this user
 * AND that have modmail configured.
 */
async function getEligibleGuilds(
    client: Client,
    userId: string
): Promise<Guild[]> {
    const configured = await GuildConfig.find({
        modmailCategoryId: {
            $exists: true,
            $ne: null,
        },
    }).lean();

    const eligible: Guild[] = [];

    for (const gc of configured) {
        const guild = client.guilds.cache.get(gc.guildId);

        if (!guild) continue;

        const member = await guild.members
            .fetch(userId)
            .catch(() => null);

        if (member) {
            eligible.push(guild);
        }
    }

    return eligible;
}

/**
 * Handles an incoming DM from a user.
 *
 * If the user already has an open ticket,
 * the message is relayed to that ticket.
 *
 * Otherwise, a new ticket is created.
 */
export async function handleIncomingDm(
    message: Message,
    client: Client
) {
    const user = message.author;

    const existingTicket =
        await ModmailTicket.findOne({
            userId: user.id,
            open: true,
        });

    if (existingTicket) {
        await relayUserMessageToChannel(
            client,
            existingTicket,
            message
        );

        return;
    }

    const eligibleGuilds =
        await getEligibleGuilds(
            client,
            user.id
        );

    if (eligibleGuilds.length === 0) {
        await message
            .reply(
                "I couldn't find a server we share that has modmail set up, so I can't open a ticket right now."
            )
            .catch(() => null);

        return;
    }

    /*
     * Only one eligible server.
     */
    if (eligibleGuilds.length === 1) {
        await openTicket(
            client,
            eligibleGuilds[0],
            user,
            message
        );

        return;
    }

    /*
     * Multiple eligible servers.
     */
    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                `modmail-server-select:${user.id}`
            )
            .setPlaceholder(
                'Choose a server'
            )
            .addOptions(
                eligibleGuilds
                    .slice(0, 25)
                    .map((guild) => ({
                        label: guild.name,
                        value: guild.id,
                    }))
            );

    const row =
        new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(menu);

    const prompt = await message.reply({
        content:
            'Which server is this regarding?',
        components: [row],
    });

    try {
        const selection =
            await prompt.awaitMessageComponent({
                componentType:
                    ComponentType.StringSelect,

                filter: (interaction) =>
                    interaction.user.id ===
                    user.id,

                time: 60_000,
            });

        const guildId =
            selection.values[0];

        const guild =
            eligibleGuilds.find(
                (guild) =>
                    guild.id === guildId
            );

        if (!guild) {
            await selection.update({
                content:
                    'Invalid server selection.',
                components: [],
            });

            return;
        }

        await selection.update({
            content:
                `Opening a ticket in **${guild.name}**...`,
            components: [],
        });

        await openTicket(
            client,
            guild,
            user,
            message
        );
    } catch {
        await prompt
            .edit({
                content:
                    'Timed out waiting for a server selection. Send another message to try again.',
                components: [],
            })
            .catch(() => null);
    }
}

/**
 * Creates a new modmail ticket channel.
 */
async function openTicket(
    client: Client,
    guild: Guild,
    user: User,
    firstMessage: Message
): Promise<void> {
    const guildConfig =
        await GuildConfig.findOne({
            guildId: guild.id,
        }).lean();

    if (!guildConfig?.modmailCategoryId) {
        return;
    }

    const category =
        guild.channels.cache.get(
            guildConfig.modmailCategoryId
        );

    if (
        !category ||
        category.type !==
            ChannelType.GuildCategory
    ) {
        return;
    }

    const channel =
        await guild.channels.create({
            name: `modmail-${user.username}`.slice(
                0,
                90
            ),

            type: ChannelType.GuildText,

            parent: category.id,

            topic:
                `Modmail ticket for ${user.tag} (${user.id})`,
        });

    await ModmailTicket.create({
        guildId: guild.id,
        userId: user.id,
        userTag: user.tag,
        channelId: channel.id,
        open: true,
    });

    /*
     * Ticket opened message.
     * This is still an embed because it is a
     * system message, not a relayed message.
     */
    const openEmbed =
        new EmbedBuilder()
            .setColor(config.embedColor)
            .setAuthor({
                name: user.tag,
                iconURL:
                    user.displayAvatarURL(),
            })
            .setDescription(
                '**New modmail ticket opened**\n' +
                    'Reply in this channel to respond — messages get relayed to their DMs.'
            )
            .setFooter({
                text: `User ID: ${user.id}`,
            })
            .setTimestamp();

    await channel.send({
        embeds: [openEmbed],
    });

    /*
     * Send the user's first message as a
     * NORMAL MESSAGE with attachments.
     */
    await sendRelayedMessage(
        channel,
        firstMessage
    );

    /*
     * Confirmation DM.
     */
    await user
        .send(
            `Thanks for reaching out — your message has been sent to the staff of **${guild.name}**. They'll reply here.`
        )
        .catch(() => null);
}

/**
 * Relays a user's DM into their open modmail channel.
 *
 * Supports:
 * - Text
 * - Images
 * - Videos
 * - Files
 * - Multiple attachments
 */
export async function relayUserMessageToChannel(
    client: Client,
    ticket: IModmailTicket,
    message: Message
) {
    const guild =
        client.guilds.cache.get(
            ticket.guildId
        );

    const channel =
        guild?.channels.cache.get(
            ticket.channelId
        ) as TextChannel | undefined;

    if (!channel) {
        /*
         * Ticket channel was deleted.
         */
        ticket.open = false;
        ticket.closedAt = new Date();

        await ticket.save();

        await message
            .reply(
                'This ticket is no longer open. Send a new message to start a fresh one.'
            )
            .catch(() => null);

        return;
    }

    /*
     * NORMAL MESSAGE + ATTACHMENTS
     */
    await sendRelayedMessage(
        channel,
        message
    );
}

/**
 * Called when staff sends a message inside
 * a ticket channel.
 *
 * Sends a NORMAL DM to the user.
 *
 * Supports:
 * - Text
 * - Images
 * - Videos
 * - Files
 * - Multiple attachments
 */
export async function relayStaffMessageToUser(
    message: Message,
    ticket: IModmailTicket
) {
    const user =
        await message.client.users
            .fetch(ticket.userId)
            .catch(() => null);

    if (!user) {
        return;
    }

    try {
        /*
         * NORMAL DM + ATTACHMENTS
         */
        await sendRelayedMessage(
            user,
            message
        );
    } catch {
        await message
            .reply(
                'Could not DM this user — they may have DMs closed or have left the server.'
            )
            .catch(() => null);
    }
}

/**
 * Sends a normal message with the original
 * content and all attachments.
 *
 * No embed is used here.
 */
async function sendRelayedMessage(
    target:
        | TextChannel
        | User,
    message: Message
) {
    const content =
        message.content?.trim() || '';

    /*
     * Convert every Discord attachment into
     * a direct URL.
     *
     * Discord will display images/videos/files
     * normally.
     */
    const attachmentUrls =
        [...message.attachments.values()]
            .map(
                (attachment) =>
                    attachment.url
            );

    /*
     * Nothing to send.
     */
    if (
        !content &&
        attachmentUrls.length === 0
    ) {
        return;
    }

    /*
     * Discord content limit is 2000 characters.
     *
     * Keep text within the limit while still
     * forwarding attachments.
     */
    const safeContent =
        content.length > 2000
            ? `${content.slice(0, 1997)}...`
            : content;

    const combinedContent = [
        safeContent,
        ...attachmentUrls,
    ]
        .filter(Boolean)
        .join('\n');

    await target.send({
        content: combinedContent,
    });
}

/**
 * Closes a modmail ticket without deleting
 * the channel.
 */
export async function closeTicket(
    channel: TextChannel,
    ticket: IModmailTicket,
    closedBy: User
) {
    ticket.open = false;
    ticket.closedAt = new Date();

    await ticket.save();

    /*
     * Notify user.
     */
    const user =
        await channel.client.users
            .fetch(ticket.userId)
            .catch(() => null);

    if (user) {
        await user
            .send(
                `Your modmail ticket in **${channel.guild.name}** has been closed. Send another message any time to open a new one.`
            )
            .catch(() => null);
    }

    /*
     * System message in ticket.
     *
     * This can remain an embed because it is
     * NOT a relayed user/staff message.
     */
    await channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor(
                    config.embedColor
                )
                .setDescription(
                    `Ticket closed by **${closedBy.tag}**.`
                ),
        ],
    });

    /*
     * Lock channel.
     */
    await channel.permissionOverwrites
        .edit(
            channel.guild.roles.everyone,
            {
                SendMessages: false,
            }
        )
        .catch(() => null);

    /*
     * Rename closed ticket.
     */
    const cleanUsername =
        ticket.userTag
            .replace(
                /[^a-z0-9-]/gi,
                ''
            )
            .toLowerCase() ||
        'ticket';

    await channel
        .setName(
            `closed-${cleanUsername}`.slice(
                0,
                90
            )
        )
        .catch(() => null);
}