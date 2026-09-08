import { Events, MessageFlags } from 'discord.js';
import type { ZeroDegree } from '../client';
import type { ChatInputCommandInteraction } from 'discord.js';
import { Blacklist } from '../models/Blacklist';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: ChatInputCommandInteraction, client: ZeroDegree) {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inCachedGuild()) {
        await interaction.reply({ content: 'This command must be used in a server.', flags: MessageFlags.Ephemeral });
        return;
    }

    // Silently block blacklisted users/servers, same as the prefix-command path.
    const userBlacklisted = await Blacklist.exists({ type: 'user', targetId: interaction.user.id });
    if (userBlacklisted) return;
    const guildBlacklisted = await Blacklist.exists({ type: 'guild', targetId: interaction.guild.id });
    if (guildBlacklisted) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`[Command Error] /${interaction.commandName}:`, error);
        const payload = { content: 'Something went wrong running that command.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(payload).catch(() => null);
        } else {
            await interaction.reply(payload).catch(() => null);
        }
    }
}

