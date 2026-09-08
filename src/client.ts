import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import type { Command } from './types';

export class ZeroDegree extends Client {
    public commands = new Collection<string, Command>();

    public constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers, // required for member fetch/moderation + timeout state
                GatewayIntentBits.GuildModeration, // ban add/remove events
                GatewayIntentBits.GuildMessages, // required to receive messages for custom commands
                GatewayIntentBits.DirectMessages, // required to receive modmail DMs
                GatewayIntentBits.MessageContent, // required to read message text (privileged intent)
                GatewayIntentBits.GuildWebhooks, // required for anti-nuke webhook-spam detection
            ],
            partials: [Partials.Channel, Partials.Message], // DM channels/messages aren't always cached — needed to receive modmail DMs
        });
    }
}
