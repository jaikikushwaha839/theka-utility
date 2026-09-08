import type { ChatInputCommandInteraction, Message, InteractionReplyOptions, MessagePayload } from 'discord.js';
import { FakeOptionsResolver } from './prefixOptions';

type ReplyPayload = string | InteractionReplyOptions | MessagePayload;

/**
 * Wraps a guild Message + parsed options into an object shaped enough like
 * ChatInputCommandInteraction<'cached'> that existing command execute()
 * functions run unmodified whether triggered by / or by prefix.
 *
 * Real discord.js objects (guild, channel, client, member) are passed
 * through untouched — only `.user`, `.options`, and the reply/defer/followUp
 * surface are faked, since those are the only parts that differ between an
 * Interaction and a Message.
 */
export function buildMessageAdapter(message: Message<true>, options: FakeOptionsResolver): ChatInputCommandInteraction<'cached'> {
    let lastReply: Message | undefined;
    let replied = false;
    let deferred = false;

    const adapter = {
        guild: message.guild,
        guildId: message.guild.id,
        channel: message.channel,
        channelId: message.channel.id,
        client: message.client,
        user: message.author,
        member: message.member,
        createdTimestamp: message.createdTimestamp,
        options,
        commandName: undefined as string | undefined,

        inCachedGuild(): boolean {
            return true;
        },

        get replied() {
            return replied;
        },
        get deferred() {
            return deferred;
        },

        async reply(payload: ReplyPayload) {
            const normalized = typeof payload === 'string' ? { content: payload } : (payload as InteractionReplyOptions);
            // ephemeral has no meaning for a plain message reply — silently ignored.
            const { ephemeral: _ephemeral, ...rest } = normalized as InteractionReplyOptions & { ephemeral?: boolean };
            lastReply = await message.reply({ ...rest, allowedMentions: { repliedUser: false } });
            replied = true;
            return lastReply;
        },

        async editReply(payload: ReplyPayload) {
            const normalized = typeof payload === 'string' ? { content: payload } : (payload as InteractionReplyOptions);
            if (!lastReply) {
                lastReply = await message.reply({ ...(normalized as object), allowedMentions: { repliedUser: false } });
                replied = true;
                return lastReply;
            }
            return lastReply.edit(normalized as any);
        },

        async deferReply(_opts?: unknown) {
            deferred = true;
            lastReply = await message.reply('Working on it...');
            return undefined;
        },

        async followUp(payload: ReplyPayload) {
            const normalized = typeof payload === 'string' ? { content: payload } : (payload as InteractionReplyOptions);
            const { ephemeral: _ephemeral, ...rest } = normalized as InteractionReplyOptions & { ephemeral?: boolean };
            return message.channel.send(rest as any);
        },

        async fetchReply() {
            if (!lastReply) throw new Error('No reply has been sent yet.');
            return lastReply;
        },
    };

    return adapter as unknown as ChatInputCommandInteraction<'cached'>;
}
