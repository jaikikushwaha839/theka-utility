import fs from 'node:fs';
import path from 'node:path';
import { ActivityType } from 'discord.js';

import { ZeroDegree } from './client';
import { config } from './config';
import { connectDatabase } from './database/connection';
import type { Command } from './types';

async function main() {
    const client = new ZeroDegree();

    // Load commands recursively
    const commandsRoot = path.join(__dirname, 'commands');

    for (const category of fs.readdirSync(commandsRoot)) {
        const categoryPath = path.join(commandsRoot, category);

        if (!fs.statSync(categoryPath).isDirectory()) continue;

        const commandFiles = fs
            .readdirSync(categoryPath)
            .filter(
                (file) =>
                    file.endsWith('.js') || file.endsWith('.ts')
            );

        for (const file of commandFiles) {
            const module = await import(
                path.join(categoryPath, file)
            );

            const command: Command = module.command;

            if (command?.data) {
                const commandJson = command.data.toJSON();

                client.commands.set(commandJson.name, command);
            } else {
                console.warn(
                    `[Warn] Skipped invalid command file: ${category}/${file}`
                );
            }
        }
    }

    // Load events
    const eventsPath = path.join(__dirname, 'events');

    const eventFiles = fs
        .readdirSync(eventsPath)
        .filter(
            (file) =>
                file.endsWith('.js') || file.endsWith('.ts')
        );

    for (const file of eventFiles) {
        const mod = await import(
            path.join(eventsPath, file)
        );

        if (!mod.name || typeof mod.execute !== 'function') {
            console.warn(
                `[Warn] Skipped invalid event file: ${file}`
            );
            continue;
        }

        if (mod.once) {
            client.once(mod.name, (...args) =>
                mod.execute(...args, client)
            );
        } else {
            client.on(mod.name, (...args) =>
                mod.execute(...args, client)
            );
        }
    }

    // Connect database
    await connectDatabase();

    // Login
    await client.login(config.token);

    // Rotating bot status
    const statuses = [
        'DM me to reach Mods!',
        '/help',
        'Made by Jaiki Kushwaha',
        `${client.guilds.cache.size} servers`,
    ];

    let index = 0;

    const updateStatus = () => {
        if (!client.user) return;

        const currentStatuses = [
            'DM me to reach Mods!',
            '/help',
            'Made by Jaiki Kushwaha',
            `${client.guilds.cache.size} servers`,
        ];

        client.user.setActivity(currentStatuses[index], {
            type: ActivityType.Watching,
        });

        index = (index + 1) % currentStatuses.length;
    };

    // Set initial status
    updateStatus();

    // Change status every 10 seconds
    setInterval(updateStatus, 10_000);
}

main().catch((err) => {
    console.error('[Fatal] Failed to start bot:', err);
    process.exit(1);
});