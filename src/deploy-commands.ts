import fs from 'node:fs';
import path from 'node:path';
import { REST, Routes } from 'discord.js';
import { config } from './config';
import type { Command } from './types';

async function deploy() {
    const commandsRoot = path.join(__dirname, 'commands');
    const body = [];

    for (const category of fs.readdirSync(commandsRoot)) {
        const categoryPath = path.join(commandsRoot, category);
        if (!fs.statSync(categoryPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(categoryPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
        for (const file of commandFiles) {
            const module = await import(path.join(categoryPath, file));
            const command: Command = module.command;
            if (command?.data) body.push(command.data.toJSON());
        }
    }

    const rest = new REST().setToken(config.token);

    const route = config.guildId
        ? Routes.applicationGuildCommands(config.clientId, config.guildId)
        : Routes.applicationCommands(config.clientId);

    console.log(`[Deploy] Registering ${body.length} command(s) ${config.guildId ? `to guild ${config.guildId}` : 'globally'}...`);
    await rest.put(route, { body });
    console.log('[Deploy] Done.');
}

deploy().catch((err) => {
    console.error('[Deploy] Failed:', err);
    process.exit(1);
});
