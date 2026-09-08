import {
    AuditLogEvent,
    EmbedBuilder,
    type Guild,
    type TextChannel,
    type User,
} from 'discord.js';

import {
    AntiNukeConfig,
    type IAntiNukeConfig,
} from '../models/AntiNukeConfig';

import {
    AntiNukeLog,
    type AntiNukeActionType,
} from '../models/AntiNukeLog';

// In-memory sliding-window action counts, keyed by `${guildId}:${actorId}:${actionType}`.
// This resets on restart by design — anti-nuke is about stopping a burst happening
// right now, not maintaining a permanent counter across bot downtime.
const actionLog = new Map<string, number[]>();

function recordAndCount(key: string, windowMs: number): number {
    const now = Date.now();

    const timestamps = (actionLog.get(key) ?? []).filter(
        (t) => now - t < windowMs,
    );

    timestamps.push(now);
    actionLog.set(key, timestamps);

    return timestamps.length;
}

/**
 * Looks up the most recent matching audit log entry to identify who performed
 * a gateway event that doesn't itself carry an executor (channel/role delete,
 * webhook create). Only trusts entries from the last few seconds, so an old,
 * unrelated log entry can't be mistaken for the current event's cause.
 */
export async function getRecentExecutor(
    guild: Guild,
    auditLogType: AuditLogEvent,
    maxAgeMs = 5000,
): Promise<User | null> {
    try {
        const logs = await guild.fetchAuditLogs({
            type: auditLogType,
            limit: 1,
        });

        const entry = logs.entries.first();

        if (!entry?.executor) {
            return null;
        }

        if (Date.now() - entry.createdTimestamp > maxAgeMs) {
            return null;
        }

        // discord.js may expose the executor as User | PartialUser.
        // Fetch the full user when necessary.
        const executor = entry.executor;

        if (executor.partial) {
            return await guild.client.users
                .fetch(executor.id)
                .catch(() => null);
        }

        return executor;
    } catch {
        return null;
    }
}

export async function getAntiNukeConfig(
    guildId: string,
): Promise<IAntiNukeConfig | null> {
    return AntiNukeConfig.findOne({ guildId });
}

interface HandleOpts {
    guild: Guild;
    actor: User;
    actionType: AntiNukeActionType;
}

/**
 * Call this from each protected event handler once an executor has been
 * identified. Skips disabled guilds, the guild owner, whitelisted users,
 * and the bot itself; otherwise counts the action and punishes once the
 * configured threshold is crossed within the configured window.
 */
export async function handleSuspiciousAction({
    guild,
    actor,
    actionType,
}: HandleOpts): Promise<void> {
    if (actor.id === guild.client.user?.id) return;
    if (actor.id === guild.ownerId) return;

    const cfg = await getAntiNukeConfig(guild.id);

    if (!cfg?.enabled) return;
    if (cfg.whitelist.includes(actor.id)) return;

    const key = `${guild.id}:${actor.id}:${actionType}`;

    const count = recordAndCount(
        key,
        cfg.windowSeconds * 1000,
    );

    if (count < cfg.threshold) return;

    actionLog.delete(key);

    await punishAndLog(
        guild,
        actor,
        actionType,
        count,
        cfg,
    );
}

async function punishAndLog(
    guild: Guild,
    actor: User,
    actionType: AntiNukeActionType,
    occurrences: number,
    cfg: IAntiNukeConfig,
) {
    const member = await guild.members
        .fetch(actor.id)
        .catch(() => null);

    let punishmentApplied =
        'none (member not found — likely already left)';

    if (member) {
        try {
            if (cfg.punishment === 'ban' && member.bannable) {
                await member.ban({
                    reason: `Anti-nuke: ${actionType} threshold exceeded`,
                });

                punishmentApplied = 'banned';
            } else if (
                cfg.punishment === 'kick' &&
                member.kickable
            ) {
                await member.kick(
                    `Anti-nuke: ${actionType} threshold exceeded`,
                );

                punishmentApplied = 'kicked';
            } else if (member.manageable) {
                const removable = member.roles.cache.filter(
                    (r) =>
                        r.id !== guild.id &&
                        r.editable,
                );

                await member.roles.remove(
                    removable,
                    `Anti-nuke: ${actionType} threshold exceeded`,
                );

                punishmentApplied =
                    `stripped ${removable.size} role(s)`;
            } else {
                punishmentApplied =
                    'could not act (role hierarchy — this account may outrank the bot)';
            }
        } catch {
            punishmentApplied =
                'punishment attempt failed (permissions?)';
        }
    }

    await AntiNukeLog.create({
        guildId: guild.id,
        actorId: actor.id,
        actorTag: actor.tag,
        actionType,
        occurrences,
        punishment: punishmentApplied,
    });

    if (cfg.logChannelId) {
        const channel = guild.channels.cache.get(
            cfg.logChannelId,
        ) as TextChannel | undefined;

        if (channel?.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('⚠️ Anti-Nuke triggered')
                .addFields(
                    {
                        name: 'User',
                        value: `${actor.tag} (${actor.id})`,
                        inline: true,
                    },
                    {
                        name: 'Action',
                        value: actionType,
                        inline: true,
                    },
                    {
                        name: 'Occurrences',
                        value: `${occurrences} within ${cfg.windowSeconds}s`,
                        inline: true,
                    },
                    {
                        name: 'Punishment',
                        value: punishmentApplied,
                    },
                )
                .setTimestamp();

            await channel
                .send({ embeds: [embed] })
                .catch(() => null);
        }
    }
}