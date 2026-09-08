import { SlashCommandBuilder, PermissionFlagsBits, Routes } from 'discord.js';
import type { Command } from '../../types';
import { buildConfirmEmbed } from '../../utils/embeds';
import { isPremiumGuild } from '../../utils/premium';

const PREMIUM_REQUIRED_MSG =
    'Custom bot profiles are a premium feature. Use `/premium status` to check, or ask a bot developer about upgrading.';

async function imageUrlToDataUri(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
    const contentType = res.headers.get('content-type') ?? 'image/png';
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString('base64')}`;
}

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('botprofile')
        .setDescription("Customize the bot's nickname/avatar in this server. Premium feature.")
        .addSubcommand((sub) =>
            sub
                .setName('nickname')
                .setDescription("Set the bot's nickname in this server")
                .addStringOption((opt) => opt.setName('name').setDescription('New nickname (max 32 chars)').setRequired(true).setMaxLength(32)),
        )
        .addSubcommand((sub) =>
            sub
                .setName('avatar')
                .setDescription("Set the bot's avatar in this server")
                .addAttachmentOption((opt) => opt.setName('image').setDescription('Image file (png/jpg/webp/gif)').setRequired(true)),
        )
        .addSubcommand((sub) => sub.setName('reset').setDescription('Reset the nickname and avatar back to default for this server'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(interaction) {
        if (!(await isPremiumGuild(interaction.guild.id))) {
            return interaction.reply({ embeds: [buildConfirmEmbed(PREMIUM_REQUIRED_MSG, true)], ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const me = interaction.guild.members.me;
        if (!me) {
            return interaction.reply({ embeds: [buildConfirmEmbed('Could not resolve the bot as a member of this server.', true)], ephemeral: true });
        }

        if (sub === 'nickname') {
            const name = interaction.options.getString('name', true);
            await me.setNickname(name).catch((err) => {
                throw new Error(`Failed to set nickname: ${err.message}`);
            });
            return interaction.reply({ embeds: [buildConfirmEmbed(`Nickname set to **${name}** for this server.`)] });
        }

        if (sub === 'avatar') {
            const attachment = interaction.options.getAttachment('image', true);
            if (!attachment.contentType?.startsWith('image/')) {
                return interaction.reply({ embeds: [buildConfirmEmbed('That attachment is not an image.', true)], ephemeral: true });
            }

            await interaction.deferReply();

            try {
                const dataUri = await imageUrlToDataUri(attachment.url);
                // Per-guild bot avatars: PATCH /guilds/{guild.id}/members/@me with an `avatar` field.
                // Requires a discord.js/discord-api-types version that includes this route
                // (Discord shipped bot support for this on the Modify Current Member endpoint
                // in September 2025) — update discord.js if this call 404s.
                await interaction.client.rest.patch(Routes.guildMember(interaction.guild.id, '@me'), {
                    body: { avatar: dataUri },
                });
                await interaction.editReply({ embeds: [buildConfirmEmbed('Server avatar updated.')] });
            } catch (err) {
                await interaction.editReply({
                    embeds: [
                        buildConfirmEmbed(
                            'Could not set the server avatar. Your discord.js version may not support per-guild bot avatars yet — try `npm update discord.js`.',
                            true,
                        ),
                    ],
                });
            }
            return;
        }

        // reset
        await me.setNickname(null).catch(() => null);
        await interaction.client.rest
            .patch(Routes.guildMember(interaction.guild.id, '@me'), { body: { avatar: null } })
            .catch(() => null);

        return interaction.reply({ embeds: [buildConfirmEmbed('Nickname and avatar reset to default for this server.')] });
    },
};
