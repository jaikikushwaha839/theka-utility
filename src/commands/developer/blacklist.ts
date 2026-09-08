import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types';
import { Blacklist } from '../../models/Blacklist';
import { buildConfirmEmbed } from '../../utils/embeds';
import { isDeveloper } from '../../config';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('[Developer only] Block a user or server from using the bot.')
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Blacklist a user or server')
                .addStringOption((opt) => opt.setName('type').setDescription('What to blacklist').setRequired(true).addChoices({ name: 'User', value: 'user' }, { name: 'Server', value: 'guild' }))
                .addStringOption((opt) => opt.setName('id').setDescription('The user or server ID').setRequired(true))
                .addStringOption((opt) => opt.setName('reason').setDescription('Why')),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Un-blacklist a user or server')
                .addStringOption((opt) => opt.setName('type').setDescription('What to remove').setRequired(true).addChoices({ name: 'User', value: 'user' }, { name: 'Server', value: 'guild' }))
                .addStringOption((opt) => opt.setName('id').setDescription('The user or server ID').setRequired(true)),
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('List everything blacklisted'))
        .setDMPermission(false),

    async execute(interaction) {
        if (!isDeveloper(interaction.user.id)) {
            return interaction.reply({ embeds: [buildConfirmEmbed('This command is restricted to bot developers.', true)], ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const type = interaction.options.getString('type', true) as 'user' | 'guild';
            const id = interaction.options.getString('id', true);
            const reason = interaction.options.getString('reason') ?? 'No reason provided';

            await Blacklist.findOneAndUpdate({ type, targetId: id }, { type, targetId: id, reason, addedBy: interaction.user.id }, { upsert: true });

            if (type === 'guild') {
                const guild = interaction.client.guilds.cache.get(id);
                await guild?.leave().catch(() => null);
            }

            return interaction.reply({ embeds: [buildConfirmEmbed(`Blacklisted ${type} \`${id}\`.`)], ephemeral: true });
        }

        if (sub === 'remove') {
            const type = interaction.options.getString('type', true) as 'user' | 'guild';
            const id = interaction.options.getString('id', true);
            const removed = await Blacklist.findOneAndDelete({ type, targetId: id });
            if (!removed) {
                return interaction.reply({ embeds: [buildConfirmEmbed(`${type} \`${id}\` was not blacklisted.`, true)], ephemeral: true });
            }
            return interaction.reply({ embeds: [buildConfirmEmbed(`Removed ${type} \`${id}\` from the blacklist.`)], ephemeral: true });
        }

        // list
        const entries = await Blacklist.find().lean();
        if (entries.length === 0) {
            return interaction.reply({ embeds: [buildConfirmEmbed('Nothing blacklisted.')], ephemeral: true });
        }
        return interaction.reply({
            embeds: [buildConfirmEmbed(entries.map((e) => `**${e.type}** \`${e.targetId}\` — ${e.reason}`).join('\n'))],
            ephemeral: true,
        });
    },
};
