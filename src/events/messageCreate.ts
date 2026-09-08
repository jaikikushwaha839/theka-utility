import { Events, type Message } from 'discord.js';
import type { ZeroDegree } from '../client';

import { GuildConfig } from '../models/GuildConfig';
import { CustomCommand } from '../models/CustomCommand';
import { ModmailTicket } from '../models/ModmailTicket';
import { Blacklist } from '../models/Blacklist';
import { NoPrefixUser } from '../models/NoPrefixUser';
import { AfkStatus } from '../models/AfkStatus';

import {
    handleIncomingDm,
    relayStaffMessageToUser,
} from '../utils/modmail';

import {
    parsePrefixArgs,
    buildUsage,
    UsageError,
} from '../utils/prefixOptions';

import { buildMessageAdapter } from '../utils/messageCommandAdapter';

export const name = Events.MessageCreate;
export const once = false;

export async function execute(
    message: Message,
    client: ZeroDegree
) {
    // Ignore bot messages
    if (message.author.bot) {
        return;
    }

    // =========================
    // BLACKLIST CHECK
    // =========================

    const userBlacklisted = await Blacklist.exists({
        type: 'user',
        targetId: message.author.id,
    });

    if (userBlacklisted) {
        return;
    }

    if (message.inGuild()) {
        const guildBlacklisted = await Blacklist.exists({
            type: 'guild',
            targetId: message.guild.id,
        });

        if (guildBlacklisted) {
            return;
        }
    }

    // =========================
    // DIRECT MESSAGE / MODMAIL
    // =========================

    if (!message.inGuild()) {
        try {
            await handleIncomingDm(message, client);
        } catch (error) {
            console.error(
                '[Modmail] Failed to process incoming DM:',
                error
            );

            await message
                .reply(
                    'Something went wrong while processing your modmail. Please try again later.'
                )
                .catch(() => null);
        }

        return;
    }

    // =========================
    // OPEN MODMAIL TICKET
    // =========================

    const ticket = await ModmailTicket.findOne({
        guildId: message.guild.id,
        channelId: message.channel.id,
        open: true,
    });

    if (ticket) {
        try {
            await relayStaffMessageToUser(message, ticket);
        } catch (error) {
            console.error(
                `[Modmail] Failed to relay staff message for ticket ${ticket.channelId}:`,
                error
            );
        }

        return;
    }

    // =========================
    // AFK
    // =========================

    await handleAfk(message);

    // =========================
    // GUILD CONFIG
    // =========================

    const guildConfig = await GuildConfig.findOne({
        guildId: message.guild.id,
    }).lean();

    const prefix = guildConfig?.prefix ?? '!';

    // =========================
    // PREFIX COMMAND
    // =========================

    let commandText: string | null = null;

    if (message.content.startsWith(prefix)) {
        commandText = message.content
            .slice(prefix.length)
            .trim();
    } else {
        const hasNoPrefix = await NoPrefixUser.exists({
            userId: message.author.id,
        });

        if (hasNoPrefix) {
            commandText = message.content.trim();
        }
    }

    if (!commandText) {
        return;
    }

    const [rawName, ...args] = commandText.split(/\s+/);

    const commandName = rawName?.toLowerCase();

    if (!commandName) {
        return;
    }

    // =========================
    // BUILT-IN COMMAND
    // =========================

    const builtIn = client.commands.get(commandName);

    if (builtIn) {
        const json = builtIn.data.toJSON();

        // Permission check
        if (
            json.default_member_permissions &&
            message.member
        ) {
            const required = BigInt(
                json.default_member_permissions
            );

            if (
                !message.member.permissions.has(required)
            ) {
                await message
                    .reply(
                        "You don't have permission to use that command."
                    )
                    .catch(() => null);

                return;
            }
        }

        try {
            const options = await parsePrefixArgs(
                json,
                args,
                message
            );

            const adapter = buildMessageAdapter(
                message,
                options
            );

            await builtIn.execute(adapter);
        } catch (error) {
            // Invalid command usage
            if (error instanceof UsageError) {
                const usage = buildUsage(
                    prefix,
                    json.name,
                    json
                );

                await message
                    .reply(
                        `${error.message}\nUsage: \`${
                            usage || `${prefix}${json.name}`
                        }\``
                    )
                    .catch(() => null);

                return;
            }

            // Actual command error
            console.error(
                `[Prefix Command Error] ${prefix}${commandName}:`,
                error
            );

            await message
                .reply(
                    'Something went wrong running that command.'
                )
                .catch(() => null);
        }

        return;
    }

    // =========================
    // CUSTOM COMMAND
    // =========================

    const customCommand =
        await CustomCommand.findOne({
            guildId: message.guild.id,
            name: commandName,
        }).lean();

    if (!customCommand) {
        return;
    }

    await message
        .reply({
            content: customCommand.response,
            allowedMentions: {
                repliedUser: false,
            },
        })
        .catch((error) => {
            console.error(
                `[Custom Command Error] ${commandName}:`,
                error
            );
        });
}

// =========================
// AFK HANDLER
// =========================

async function handleAfk(message: Message<true>) {
    // Remove own AFK
    const own = await AfkStatus.findOneAndDelete({
        guildId: message.guild.id,
        userId: message.author.id,
    });

    if (own) {
        const member = message.member;

        if (
            member?.manageable &&
            member.nickname?.startsWith('[AFK] ')
        ) {
            await member
                .setNickname(
                    member.nickname.replace('[AFK] ', '')
                )
                .catch(() => null);
        }

        await message
            .reply({
                content:
                    'Welcome back — I removed your AFK status.',
                allowedMentions: {
                    repliedUser: false,
                },
            })
            .catch(() => null);
    }

    // No mentions
    if (message.mentions.users.size === 0) {
        return;
    }

    // Check mentioned users
    for (const user of message.mentions.users.values()) {
        const status = await AfkStatus.findOne({
            guildId: message.guild.id,
            userId: user.id,
        }).lean();

        if (!status) {
            continue;
        }

        await message
            .reply({
                content: `${user.tag} is AFK: ${
                    status.reason
                } (since <t:${Math.floor(
                    status.since.getTime() / 1000
                )}:R>)`,
                allowedMentions: {
                    repliedUser: false,
                },
            })
            .catch(() => null);
    }
}